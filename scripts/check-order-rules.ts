import { cartViolations, resolveLines, subtotal } from "@/lib/cart-rules";
import { getProductById } from "@/lib/catalog";
import { discountPercent, formatXaf } from "@/lib/money";
import { OrderInputSchema } from "@/lib/order";
import { isValidOrderReference } from "@/lib/order-reference";

let failures = 0;
function check(label: string, condition: boolean, detail = "") {
  if (!condition) failures++;
  console.log(`  ${condition ? "OK   " : "ECHEC"} ${label}${detail ? ` — ${detail}` : ""}`);
}

console.log("\n=== 1. Regle metier : 6 Connect exige des bandelettes ===");
{
  const seul = resolveLines([{ productId: "e-dr-tim-6-connect", quantity: 1 }], getProductById);
  check("6 Connect seul -> 1 violation", cartViolations(seul.lines).length === 1);

  const avec = resolveLines(
    [
      { productId: "e-dr-tim-6-connect", quantity: 1 },
      { productId: "bandelettes-glycemie", quantity: 1 },
    ],
    getProductById,
  );
  check("6 Connect + bandelettes -> 0 violation", cartViolations(avec.lines).length === 0);

  const autre = resolveLines([{ productId: "tensiometre-connecte", quantity: 2 }], getProductById);
  check("tensiometre seul -> 0 violation", cartViolations(autre.lines).length === 0);
}

console.log("\n=== 2. Produit inconnu ecarte, jamais fatal ===");
{
  const r = resolveLines(
    [
      { productId: "produit-fantome", quantity: 1 },
      { productId: "tensiometre-connecte", quantity: 1 },
    ],
    getProductById,
  );
  check("1 ligne conservee", r.lines.length === 1);
  check("1 identifiant ecarte", r.droppedIds.length === 1, r.droppedIds.join(","));
}

console.log("\n=== 3. Arithmetique monetaire ===");
{
  const r = resolveLines(
    [
      { productId: "e-dr-tim-6-connect", quantity: 2 },
      { productId: "bandelettes-glycemie", quantity: 1 },
    ],
    getProductById,
  );
  const total = subtotal(r.lines);
  check("2x30000 + 19800 = 79800", total === 79800, String(total));
  check("entier", Number.isInteger(total));
  check("formatage FCFA", formatXaf(19800).endsWith("FCFA"), formatXaf(19800));
}

console.log("\n=== 4. Remises derivees (les 3 lignes incoherentes du PDF) ===");
{
  check("3-en-1 : 19800 -> 13725 = -31%", discountPercent(19800, 13725) === 31, String(discountPercent(19800, 13725)));
  check("b-Cetone : 30000 -> 22875 = -24%", discountPercent(30000, 22875) === 24, String(discountPercent(30000, 22875)));
  check("prix medecin >= public -> 0%", discountPercent(19800, 19800) === 0);
}

console.log("\n=== 5. Le schema de commande n'accepte AUCUN prix venant du client ===");
{
  const hostile = {
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    items: [{ productId: "e-dr-tim-6-connect", quantity: 1, price: 1, unitPrice: 1 }],
    customer: { fullName: "Test Client", email: "a@b.cm", phone: "+237600000000" },
    fulfillment: { type: "delivery", addressLine1: "Rue 1", city: "Douala" },
    consent: true,
    subtotal: 1,
    total: 1,
  };
  const parsed = OrderInputSchema.safeParse(hostile);
  check("payload accepte", parsed.success);
  if (parsed.success) {
    const item = parsed.data.items[0] as Record<string, unknown>;
    check("le champ `price` du client est SUPPRIME", !("price" in item));
    check("le champ `unitPrice` du client est SUPPRIME", !("unitPrice" in item));
    check("le `subtotal` du client est SUPPRIME", !("subtotal" in (parsed.data as object)));
    check("le `total` du client est SUPPRIME", !("total" in (parsed.data as object)));
  }
}

console.log("\n=== 6. Validation d'entree ===");
{
  const base = {
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    items: [{ productId: "x", quantity: 1 }],
    customer: { fullName: "Ab", email: "a@b.cm", phone: "+237600000000" },
    fulfillment: { type: "delivery", addressLine1: "Rue 1", city: "Douala" },
    consent: true,
  };
  check("consentement absent -> refus", !OrderInputSchema.safeParse({ ...base, consent: false }).success);
  check("email invalide -> refus", !OrderInputSchema.safeParse({ ...base, customer: { ...base.customer, email: "pas-un-email" } }).success);
  check("panier vide -> refus", !OrderInputSchema.safeParse({ ...base, items: [] }).success);
  check("quantite 0 -> refus", !OrderInputSchema.safeParse({ ...base, items: [{ productId: "x", quantity: 0 }] }).success);
  check("quantite 100 -> refus", !OrderInputSchema.safeParse({ ...base, items: [{ productId: "x", quantity: 100 }] }).success);
  check("cle d'idempotence non-uuid -> refus", !OrderInputSchema.safeParse({ ...base, idempotencyKey: "abc" }).success);
  check("livraison sans ville -> refus", !OrderInputSchema.safeParse({ ...base, fulfillment: { type: "delivery", addressLine1: "Rue 1" } }).success);
}

console.log("\n=== 7. Reference de commande ===");
{
  check("format valide", isValidOrderReference("CMD-20260709-A3F2"));
  check("caracteres ambigus refuses (0/1/I/O)", !isValidOrderReference("CMD-20260709-1O0I"));
  check("format bidon refuse", !isValidOrderReference("../../etc/passwd"));
}

console.log(`\n${failures === 0 ? "TOUT PASSE" : `${failures} ECHEC(S)`}\n`);
process.exit(failures === 0 ? 0 : 1);
