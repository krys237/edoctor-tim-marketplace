"use server";

import { render } from "@react-email/render";
import { headers } from "next/headers";
import { Resend } from "resend";

import { OrderInternalEmail } from "@/emails/order-internal";
import { OrderReceiptEmail } from "@/emails/order-receipt";
import { cartViolations, resolveLines } from "@/lib/cart-rules";
import { getProductById } from "@/lib/catalog";
import {
  OrderInputSchema,
  type Order,
  type OrderLine,
  type SubmitOrderResult,
} from "@/lib/order";
import { promoDiscount } from "@/lib/money";
import { generateOrderReference } from "@/lib/order-reference";
import { getPickupLocation, pickupAvailable } from "@/lib/pickup";
import { isValidDoctorCode, priceFor } from "@/lib/pricing-doctor";
import { findPromo } from "@/lib/promo";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

/*
  Idempotence.

  Le navigateur genere une cle a l'ouverture du checkout. Si la meme cle revient
  (double-clic, rafraichissement, reessai reseau), on renvoie la reference deja
  emise au lieu d'envoyer un second email au support.

  LIMITE CONNUE : cette Map est locale au processus. Sur une plateforme
  serverless, deux invocations concurrentes peuvent ne pas la partager. C'est
  une reduction du risque, pas une garantie ; le support verra au pire deux fois
  la meme reference et saura qu'il s'agit d'un doublon.
*/
const seenKeys = new Map<string, { reference: string; at: number }>();
const IDEMPOTENCY_TTL_MS = 30 * 60 * 1000;

function rememberKey(key: string, reference: string) {
  const now = Date.now();
  for (const [k, v] of seenKeys) {
    if (now - v.at > IDEMPOTENCY_TTL_MS) seenKeys.delete(k);
  }
  seenKeys.set(key, { reference, at: now });
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnu";
}

export async function submitOrder(raw: unknown): Promise<SubmitOrderResult> {
  // 1. Forme des donnees. Une entree client n'est jamais presumee valide.
  const parsed = OrderInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Certains champs sont invalides.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const input = parsed.data;

  // 2. Rejeu : meme cle => meme reference, aucun second email.
  const already = seenKeys.get(input.idempotencyKey);
  if (already) {
    return { ok: true, reference: already.reference, doctorCodeApplied: false };
  }

  const ip = await clientIp();

  // 3. Anti-abus. Turnstile d'abord : le limiteur ne doit pas etre consomme
  //    par des requetes que le CAPTCHA aurait de toute facon rejetees.
  const humanOk = await verifyTurnstile(input.turnstileToken ?? "", ip);
  if (!humanOk) {
    return { ok: false, error: "Vérification anti-robot échouée. Rechargez la page." };
  }

  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `Trop de commandes envoyées. Réessayez dans ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  // 4. Re-resolution du panier contre le catalogue. Le client n'a envoye que
  //    des identifiants : les prix, noms et references viennent d'ici.
  const { lines, droppedIds } = resolveLines(input.items, getProductById);
  if (lines.length === 0) {
    return { ok: false, error: "Aucun produit valide dans votre panier." };
  }
  if (droppedIds.length > 0) {
    return {
      ok: false,
      error:
        "Un produit de votre panier n'est plus disponible. Rechargez la page pour mettre à jour votre panier.",
    };
  }

  // 5. Regles metier, revalidees serveur. La verification du navigateur n'est
  //    qu'une commodite d'ergonomie ; celle-ci fait foi.
  const violations = cartViolations(lines);
  if (violations.length > 0) {
    return { ok: false, error: violations[0].message };
  }

  // 6. Mode de reception.
  if (input.fulfillment.type === "pickup") {
    if (!pickupAvailable()) {
      return { ok: false, error: "Le retrait en agence n'est pas disponible." };
    }
    if (!getPickupLocation(input.fulfillment.locationId)) {
      return { ok: false, error: "Point de retrait inconnu." };
    }
  }

  // 7. Code medecin, valide serveur en temps constant.
  const doctorCodeApplied = Boolean(
    input.doctorCode && isValidDoctorCode(input.doctorCode),
  );

  /*
    8. Code promo. Exclusif du code medecin.

    La regle d'exclusivite porte sur la PRESENCE du code medecin, pas sur sa
    validite : c'est la seule formulation que le navigateur puisse evaluer a
    l'identique, sans connaitre le secret. Une regle fondee sur la validite
    ferait diverger le recapitulatif (« -30 % ») de l'email envoye au support.

    Un code promo invalide fait ECHOUER la commande. Le passer sous silence
    reviendrait a facturer le plein tarif a un client qui a vu une remise.
  */
  const doctorCodeProvided = Boolean(input.doctorCode?.trim());
  const promoCodeProvided = Boolean(input.promoCode?.trim());

  if (doctorCodeProvided && promoCodeProvided) {
    return {
      ok: false,
      error: "Un code médecin et un code promo ne se cumulent pas. N'en gardez qu'un.",
    };
  }

  const promo = promoCodeProvided ? findPromo(input.promoCode ?? "") : null;
  if (promoCodeProvided && !promo) {
    return { ok: false, error: "Ce code promo n'est pas valide." };
  }

  const items: OrderLine[] = [];
  for (const line of lines) {
    const priced = priceFor(line.product.id, doctorCodeApplied);
    if (!priced) return { ok: false, error: "Erreur de tarification." };
    items.push({
      productId: line.product.id,
      sku: line.product.sku,
      name: line.product.name,
      quantity: line.quantity,
      publicUnitPrice: priced.publicPrice,
      unitPrice: priced.unitPrice,
      lineTotal: priced.unitPrice * line.quantity,
    });
  }

  const reference = generateOrderReference();
  const now = new Date().toISOString();

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const discount = promo ? promoDiscount(subtotal, promo.percent) : 0;

  const order: Order = {
    reference,
    submittedAt: now,
    customer: input.customer,
    business: input.business?.companyName
      ? { companyName: input.business.companyName, taxId: input.business.taxId || undefined }
      : undefined,
    fulfillment:
      input.fulfillment.type === "pickup"
        ? {
            ...input.fulfillment,
            locationLabel: getPickupLocation(input.fulfillment.locationId)?.label,
          }
        : input.fulfillment,
    items,
    subtotal,
    publicSubtotal: items.reduce((s, i) => s + i.publicUnitPrice * i.quantity, 0),
    doctorCodeApplied,
    promo: promo ? { code: promo.code, percent: promo.percent, discount } : undefined,
    netSubtotal: subtotal - discount,
    currency: "XAF",
    consentGivenAt: now,
  };

  // 9. Envoi. L'email est le SEUL transport de la commande : si l'envoi echoue,
  //    on le dit franchement pour que le client puisse reessayer, panier intact.
  //    Jamais de faux succes.
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_EMAIL_TO;
  const from = process.env.ORDER_EMAIL_FROM;

  if (!apiKey || !to || !from) {
    console.error("[commande] Configuration email incomplète : commande NON transmise.");
    return {
      ok: false,
      error:
        "Le service de commande est momentanément indisponible. Votre panier est conservé, réessayez dans quelques minutes.",
    };
  }

  const resend = new Resend(apiKey);

  try {
    const [internalHtml, receiptHtml] = await Promise.all([
      render(OrderInternalEmail({ order })),
      render(OrderReceiptEmail({ order })),
    ]);

    const fulfillmentLabel =
      order.fulfillment.type === "delivery"
        ? `Livraison ${order.fulfillment.city}`
        : `Retrait ${order.fulfillment.locationLabel ?? ""}`.trim();

    const internal = await resend.emails.send({
      from,
      to: [to],
      bcc: process.env.ORDER_EMAIL_BCC ? [process.env.ORDER_EMAIL_BCC] : undefined,
      replyTo: order.customer.email,
      subject: `[Commande] ${reference} — ${order.items.length} référence(s) — ${fulfillmentLabel}`,
      html: internalHtml,
      // La commande structuree : rend la boite « commandes@ » réimportable.
      attachments: [
        {
          filename: `commande-${reference}.json`,
          content: Buffer.from(JSON.stringify(order, null, 2), "utf-8").toString("base64"),
        },
      ],
    });

    if (internal.error) throw new Error(internal.error.message);

    // L'accuse client est secondaire : son echec ne doit pas perdre la commande,
    // qui est deja chez le support.
    const receipt = await resend.emails.send({
      from,
      to: [order.customer.email],
      subject: `Votre commande ${reference} chez e-Doctor TIM Marketplace`,
      html: receiptHtml,
    });
    if (receipt.error) {
      console.error(`[commande] ${reference} : accusé client non envoyé —`, receipt.error);
    }
  } catch (error) {
    console.error(`[commande] Échec d'envoi pour ${reference} :`, error);
    return {
      ok: false,
      error:
        "Votre commande n'a pas pu être transmise. Votre panier est conservé, réessayez.",
    };
  }

  rememberKey(input.idempotencyKey, reference);
  return { ok: true, reference, doctorCodeApplied };
}
