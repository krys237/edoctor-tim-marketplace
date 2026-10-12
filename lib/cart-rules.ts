import type { Xaf } from "@/lib/money";
import type { Product } from "@/lib/schemas";

/**
 * Regles metier du panier.
 *
 * Ce module est volontairement PUR : aucune directive "use client", aucun acces
 * au stockage, aucun texte destine a l'utilisateur. Il est consomme par
 * l'interface du panier ET par la Server Action de commande. Une regle validee
 * uniquement dans le navigateur n'est pas une regle : c'est une suggestion.
 *
 * Les violations sont des CODES, pas des phrases : c'est l'appelant qui les
 * traduit (`Cart.violations.*` cote navigateur, `Errors.*` cote serveur).
 */

export type ResolvedLine = {
  product: Product;
  quantity: number;
  lineTotal: Xaf;
};

export type CartViolation = {
  code: "requires-consumable";
  productId: string;
  /** Nom du produit dans la langue du catalogue resolu, pour le message. */
  productName: string;
};

/**
 * Resout des lignes brutes (id + quantite) contre le catalogue.
 * Les identifiants inconnus sont ecartes : un produit retire du catalogue ne
 * doit pas casser le panier d'un utilisateur qui l'avait ajoute la veille.
 */
export function resolveLines(
  items: { productId: string; quantity: number }[],
  lookup: (id: string) => Product | undefined,
): { lines: ResolvedLine[]; droppedIds: string[] } {
  const lines: ResolvedLine[] = [];
  const droppedIds: string[] = [];

  for (const item of items) {
    const product = lookup(item.productId);
    if (!product || product.availability === "discontinued") {
      droppedIds.push(item.productId);
      continue;
    }
    lines.push({
      product,
      quantity: item.quantity,
      lineTotal: product.price * item.quantity,
    });
  }

  return { lines, droppedIds };
}

/**
 * Contrainte : un appareil marque `requiresConsumable` ne peut etre commande
 * sans au moins un de ses consommables compatibles.
 */
export function cartViolations(lines: ResolvedLine[]): CartViolation[] {
  const present = new Set(lines.map((l) => l.product.id));

  return lines
    .filter((l) => l.product.requiresConsumable)
    .filter((l) => !l.product.relatedProductIds.some((id) => present.has(id)))
    .map((l) => ({
      code: "requires-consumable" as const,
      productId: l.product.id,
      productName: l.product.name,
    }));
}

/**
 * Sous-total des lignes. Volontairement nomme « sous-total » et non « total » :
 * les frais de livraison sont inconnus a ce stade, et afficher un « total »
 * incomplet cree une attente de prix ferme chez le client.
 */
export function subtotal(lines: ResolvedLine[]): Xaf {
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}

export function totalQuantity(items: { quantity: number }[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
