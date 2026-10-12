import { INTL_LOCALE, routing, type Locale } from "@/i18n/routing";

/**
 * Le franc CFA n'a pas de subdivision : tout montant est un entier de francs.
 * Ne jamais representer un prix en nombre flottant — les arrondis silencieux
 * sur les montants sont une source classique d'ecart de caisse.
 */
export type Xaf = number;

/*
  Un formateur par langue, construit une seule fois. Seul le separateur de
  milliers change : « 19 800 » en francais, « 19,800 » en anglais. Le suffixe
  « FCFA » est le meme partout : c'est le nom usuel de la monnaie au Cameroun,
  dans les deux langues.
*/
const FORMATTERS = new Map<Locale, Intl.NumberFormat>(
  routing.locales.map((locale) => [
    locale,
    new Intl.NumberFormat(INTL_LOCALE[locale], { useGrouping: true, maximumFractionDigits: 0 }),
  ]),
);

/** 19800 -> "19 800 FCFA" (fr) / "19,800 FCFA" (en) */
export function formatXaf(amount: Xaf, locale: Locale = routing.defaultLocale): string {
  const formatter = FORMATTERS.get(locale) ?? FORMATTERS.get(routing.defaultLocale)!;
  return `${formatter.format(amount)} FCFA`;
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

/**
 * Remise d'un code promo, en francs entiers.
 *
 * Volontairement ici, et non dans `lib/promo.ts` : ce module est partage par le
 * navigateur et le serveur, si bien que le recapitulatif ne peut pas afficher
 * un montant que la Server Action recalculerait autrement. Le pourcentage, lui,
 * ne quitte le serveur qu'apres validation du code.
 */
export function promoDiscount(subtotal: Xaf, percent: number): Xaf {
  if (subtotal <= 0 || percent <= 0) return 0;
  return Math.round((subtotal * Math.min(percent, 100)) / 100);
}
