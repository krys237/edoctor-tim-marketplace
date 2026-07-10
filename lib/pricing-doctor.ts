import "server-only";

import raw from "@/data/pricing-doctor.server.json";
import { getProductById } from "@/lib/catalog";
import { safeEqual } from "@/lib/constant-time";
import { discountPercent, type Xaf } from "@/lib/money";

/*
  TARIFS « CODE MEDECIN ».

  L'import de `server-only` en tete de fichier fait echouer le build si ce
  module est atteint depuis un composant client. C'est la garantie que la
  grille remisee ne part jamais dans le bundle du navigateur : sinon
  n'importe qui l'ouvrirait dans les outils de developpement.

  Le code lui-meme n'est pas ici : il vit dans la variable d'environnement
  DOCTOR_CODE, hors du depot.
*/

const DOCTOR_PRICES: Record<string, Xaf> = Object.fromEntries(
  Object.entries(raw as Record<string, unknown>)
    .filter(([key, value]) => !key.startsWith("_") && typeof value === "number")
    .map(([key, value]) => [key, value as number]),
);

export function isValidDoctorCode(candidate: string): boolean {
  const expected = process.env.DOCTOR_CODE;
  // Pas de code configure = aucun code n'est valide. Jamais de repli permissif.
  if (!expected) return false;
  return safeEqual(candidate.trim().toUpperCase(), expected.trim().toUpperCase());
}

export type PricedLine = {
  productId: string;
  publicPrice: Xaf;
  unitPrice: Xaf;
  discountPercent: number;
};

/**
 * Prix unitaire applicable a un produit. Le tarif medecin ne s'applique que si
 * le code a ete valide ; a defaut, on retombe sur le prix public.
 *
 * Le pourcentage est derive, jamais lu depuis un fichier : un badge ne peut
 * donc pas contredire le montant facture.
 */
export function priceFor(productId: string, doctorCodeValid: boolean): PricedLine | null {
  const product = getProductById(productId);
  if (!product) return null;

  const doctorPrice = DOCTOR_PRICES[productId];
  const applyDoctor = doctorCodeValid && typeof doctorPrice === "number";
  const unitPrice = applyDoctor ? doctorPrice : product.price;

  return {
    productId,
    publicPrice: product.price,
    unitPrice,
    discountPercent: applyDoctor ? discountPercent(product.price, unitPrice) : 0,
  };
}

/** Identifiants couverts par la grille medecin. Utile pour les tests. */
export function doctorPricedProductIds(): string[] {
  return Object.keys(DOCTOR_PRICES);
}
