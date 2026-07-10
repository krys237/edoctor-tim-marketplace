import { render } from "@react-email/render";

import { OrderInternalEmail } from "@/emails/order-internal";
import { OrderReceiptEmail } from "@/emails/order-receipt";
import { promoDiscount } from "@/lib/money";
import type { Order } from "@/lib/order";

let failures = 0;
function check(label: string, condition: boolean, detail = "") {
  if (!condition) failures++;
  console.log(`  ${condition ? "OK   " : "ECHEC"} ${label}${detail ? ` — ${detail}` : ""}`);
}

function makeOrder(doctor: boolean, promoPercent?: number): Order {
  const unit = doctor ? 9900 : 30000;
  const discount = promoPercent ? promoDiscount(unit, promoPercent) : 0;
  return {
    reference: "CMD-20260709-A3F2",
    submittedAt: "2026-07-09T12:00:00.000Z",
    customer: {
      // Tentative d'injection : React doit l'echapper.
      fullName: '<img src=x onerror="alert(1)">Germann',
      email: "client@example.cm",
      phone: "+237 690 12 34 56",
    },
    fulfillment: { type: "delivery", addressLine1: "Rue 1.234", addressLine2: "", city: "Douala", instructions: "" },
    items: [
      {
        productId: "e-dr-tim-6-connect",
        sku: "EDT-6C",
        name: "Appareil e-Dr Tim (6 Connect)",
        quantity: 1,
        publicUnitPrice: 30000,
        unitPrice: unit,
        lineTotal: unit,
      },
    ],
    subtotal: unit,
    publicSubtotal: 30000,
    doctorCodeApplied: doctor,
    promo: promoPercent ? { code: "EDOC30", percent: promoPercent, discount } : undefined,
    netSubtotal: unit - discount,
    currency: "XAF",
    consentGivenAt: "2026-07-09T12:00:00.000Z",
  };
}

const digits = (s: string) => s.replace(/[  \s]/g, "");

async function main() {
  console.log("\n=== Email SUPPORT, tarif public (aucun code medecin) ===");
  {
    const html = digits(await render(OrderInternalEmail({ order: makeOrder(false) })));
    check("reference presente", html.includes("CMD-20260709-A3F2"));
    check("prix public present", html.includes("30000FCFA"));
    check("aucun tarif medecin (9900)", !html.includes("9900FCFA"));
    check("bandeau 'code medecin' absent", !html.includes("Codemédecinappliqué"));
  }

  console.log("\n=== Email SUPPORT, code medecin applique ===");
  {
    const html = digits(await render(OrderInternalEmail({ order: makeOrder(true) })));
    check("tarif medecin affiche", html.includes("9900FCFA"));
    check("prix public rappele au support", html.includes("30000FCFA"));
    check("bandeau 'code medecin' present", html.includes("Codemédecinappliqué"));
  }

  console.log("\n=== Email CLIENT (accuse de reception) ===");
  {
    const raw = await render(OrderReceiptEmail({ order: makeOrder(false) }));
    const html = digits(raw);
    check("mention 'pas encore confirmée'", html.includes("n&#x27;estpasencoreconfirmée") || html.includes("n'estpasencoreconfirmée"));
    check("mention 'aucun paiement'", html.toLowerCase().includes("aucunpaiement"));
    check("avertissement dispositif medical", html.includes("Dispositifsmédicaux"));
    check("frais de livraison annonces comme inconnus", html.includes("Fraisdelivraisoncommuniqués"));

    // Le client ne doit jamais voir le sous-total public quand il paie moins.
    const htmlDoctor = digits(await render(OrderReceiptEmail({ order: makeOrder(true) })));
    check("l'accuse client n'expose pas le sous-total public", !htmlDoctor.includes("publicSubtotal"));
    check("l'accuse client affiche le prix paye (9900)", htmlDoctor.includes("9900FCFA"));
  }

  console.log("\n=== Code promo : le montant facture doit etre le montant remise ===");
  {
    // 30 000 - 30 % = 21 000. Le support ne doit jamais facturer 30 000.
    const support = digits(await render(OrderInternalEmail({ order: makeOrder(false, 30) })));
    check("code promo nomme", support.includes("EDOC30"));
    check("remise affichee (9 000)", support.includes("9000FCFA"));
    check("sous-total a facturer remise (21 000)", support.includes("21000FCFA"));
    check("mention 'a facturer' presente", support.includes("Sous-totalàfacturer"));

    const client = digits(await render(OrderReceiptEmail({ order: makeOrder(false, 30) })));
    check("l'accuse client nomme le code", client.includes("EDOC30"));
    check("l'accuse client affiche le montant remise (21 000)", client.includes("21000FCFA"));

    // Sans promo, aucune ligne de remise ne doit apparaitre.
    const sansPromo = digits(await render(OrderInternalEmail({ order: makeOrder(false) })));
    check("sans promo, aucun 'code promo'", !sansPromo.includes("Codepromo"));
    check("sans promo, pas de mention 'a facturer'", !sansPromo.includes("Sous-totalàfacturer"));
  }

  console.log("\n=== Echappement (aucune injection HTML) ===");
  {
    const raw = await render(OrderInternalEmail({ order: makeOrder(false) }));
    check("balise <img> non interpretee", !raw.includes('<img src=x onerror'));
    check("payload echappe present sous forme de texte", raw.includes("&lt;img") || raw.includes("&#x3C;img"));
  }

  console.log(`\n${failures === 0 ? "TOUT PASSE" : `${failures} ECHEC(S)`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
