/**
 * Le franc CFA n'a pas de subdivision : tout montant est un entier de francs.
 * Ne jamais representer un prix en nombre flottant — les arrondis silencieux
 * sur les montants sont une source classique d'ecart de caisse.
 */
export type Xaf = number;

const FORMATTER = new Intl.NumberFormat("fr-FR", {
  useGrouping: true,
  maximumFractionDigits: 0,
});

/** 19800 -> "19 800 FCFA" */
export function formatXaf(amount: Xaf): string {
  return `${FORMATTER.format(amount)} FCFA`;
}

/**
 * Remise en pourcentage entier, calculee depuis les montants XAF.
 *
 * Le pourcentage n'est jamais stocke : il est toujours derive des deux prix.
 * C'est ce qui garantit que le badge affiche ne peut pas contredire le montant
 * paye — le document tarifaire d'origine contenait trois lignes ou les deux
 * divergeaient (cf. docs/catalogue.md).
 */
export function discountPercent(publicPrice: Xaf, discountedPrice: Xaf): number {
  if (publicPrice <= 0 || discountedPrice >= publicPrice) return 0;
  return Math.round((1 - discountedPrice / publicPrice) * 100);
}
