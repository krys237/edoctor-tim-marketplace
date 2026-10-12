import { z } from "zod";

import type { Locale } from "@/i18n/routing";
import type { Xaf } from "@/lib/money";

/*
  Contrat d'entree de la commande.

  Le navigateur n'envoie QUE des identifiants et des quantites. Aucun prix, aucun
  total, aucun libelle de produit. Tout ce qui a une valeur monetaire est
  re-resolu cote serveur depuis le catalogue : une valeur venant du client n'est
  pas une donnee, c'est une suggestion.
*/

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const OrderInputSchema = z.object({
  /**
   * Genere a l'ouverture du checkout, stable pendant toute la saisie.
   * Permet au serveur de reconnaitre une double soumission (double-clic,
   * rafraichissement, reessai reseau) et de renvoyer la meme reference.
   */
  idempotencyKey: z.uuid(),

  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(80),
        quantity: z.int().min(1).max(99),
      }),
    )
    .min(1, "Votre panier est vide.")
    .max(50),

  customer: z.object({
    fullName: z.string().trim().min(2, "Nom trop court.").max(100),
    email: z.email("Adresse email invalide."),
    phone: z
      .string()
      .trim()
      .min(8, "Numéro trop court.")
      .max(24)
      .regex(/^\+?[0-9\s().-]+$/, "Numéro de téléphone invalide."),
  }),

  business: z
    .object({
      companyName: optionalText(120),
      taxId: optionalText(50),
    })
    .optional(),

  fulfillment: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("delivery"),
      addressLine1: z.string().trim().min(3, "Adresse requise.").max(200),
      addressLine2: optionalText(200),
      city: z.string().trim().min(2, "Ville ou quartier requis.").max(100),
      /*
        Libelle volontairement restreint aux instructions de LIVRAISON.
        Un champ nomme « Commentaire » invite le client a decrire son etat de
        sante : ce sont des donnees sensibles, et l'email est un transport en
        clair. Voir docs/cahier-des-charges.md §5.3.
      */
      instructions: optionalText(500),
    }),
    z.object({
      type: z.literal("pickup"),
      locationId: z.string().min(1).max(80),
    }),
  ]),

  /** Jamais compare en clair cote client. Voir lib/pricing-doctor.ts. */
  doctorCode: optionalText(64),

  /**
   * Jamais compare en clair cote client. Voir lib/promo.ts.
   * Exclusif du code medecin : la Server Action refuse les deux ensemble.
   */
  promoCode: optionalText(64),

  consent: z.literal(true, "Vous devez accepter la politique de confidentialité."),

  turnstileToken: optionalText(4096),
});

export type OrderInput = z.infer<typeof OrderInputSchema>;

/** Ligne de commande telle que le SERVEUR l'a recalculee. */
export type OrderLine = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  publicUnitPrice: Xaf;
  unitPrice: Xaf;
  lineTotal: Xaf;
};

export type Order = {
  reference: string;
  submittedAt: string;
  /**
   * Langue de la page depuis laquelle la commande a ete passee. Determinee
   * cote SERVEUR (jamais envoyee par le navigateur) : elle choisit la langue
   * de l'accuse de reception et indique au support dans quelle langue
   * rappeler le client.
   */
  locale: Locale;
  customer: OrderInput["customer"];
  business?: { companyName: string; taxId?: string };
  fulfillment: OrderInput["fulfillment"] & { locationLabel?: string };
  items: OrderLine[];
  /** Somme des lignes au tarif applique. Pas de `total` : la livraison est inconnue. */
  subtotal: Xaf;
  /** Sous-total aux prix publics, pour que le support voie la remise consentie. */
  publicSubtotal: Xaf;
  doctorCodeApplied: boolean;
  /** Code promo retenu par le serveur. Exclusif du tarif praticien. */
  promo?: { code: string; percent: number; discount: Xaf };
  /**
   * Sous-total apres remise promo, egal a `subtotal` s'il n'y en a pas.
   * Toujours nomme « sous-total » : la livraison reste inconnue a ce stade.
   */
  netSubtotal: Xaf;
  currency: "XAF";
  consentGivenAt: string;
};

export type SubmitOrderResult =
  | { ok: true; reference: string; doctorCodeApplied: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
