import raw from "@/data/products.json";
import { INTL_LOCALE, routing, type Locale } from "@/i18n/routing";
import {
  ProductsFileSchema,
  type Category,
  type Product,
  type RawProduct,
} from "@/lib/schemas";

/*
  Source de verite du catalogue public.

  Le fichier est valide au chargement : une faute de frappe dans products.json,
  ou une traduction manquante, fait echouer le build plutot que de produire
  une fiche produit cassee en production.

  Le fichier est multilingue ; ce module le RESOUT dans une langue donnee et
  rend des `Product` aux textes simples. Les identifiants, prix, SKU et liens
  entre produits sont uniques et partages par toutes les langues.

  Ce module isole le reste du code de la source de donnees. Le jour ou le
  catalogue migre vers une base, seule l'implementation change ici.
*/
const rawProducts: RawProduct[] = ProductsFileSchema.parse(raw);

function localize(p: RawProduct, locale: Locale): Product {
  return {
    ...p,
    name: p.name[locale],
    shortDescription: p.shortDescription[locale],
    description: p.description[locale],
    images: p.images.map((i) => ({ src: i.src, alt: i.alt[locale] })),
    specs: p.specs.map((s) => ({ label: s.label[locale], value: s.value[locale] })),
  };
}

// Resolu une fois par langue au chargement du module, puis servi tel quel.
const byLocale = new Map<Locale, Product[]>(
  routing.locales.map((locale) => [locale, rawProducts.map((p) => localize(p, locale))]),
);

function productsFor(locale: Locale): Product[] {
  // Le Map est construit a partir de routing.locales : la cle existe toujours.
  return byLocale.get(locale) ?? byLocale.get(routing.defaultLocale)!;
}

export function getAllProducts(locale: Locale = routing.defaultLocale): Product[] {
  return productsFor(locale);
}

export function getProductById(
  id: string,
  locale: Locale = routing.defaultLocale,
): Product | undefined {
  return productsFor(locale).find((p) => p.id === id);
}

/** Resout une liste d'identifiants, en ignorant silencieusement les inconnus. */
export function getProductsByIds(
  ids: string[],
  locale: Locale = routing.defaultLocale,
): Product[] {
  return ids
    .map((id) => getProductById(id, locale))
    .filter((p): p is Product => p !== undefined);
}

export type SortOption = "pertinence" | "prix-asc" | "prix-desc" | "nom";

export type CatalogQuery = {
  category?: Category;
  search?: string;
  sort?: SortOption;
};

/**
 * Normalise pour la recherche : minuscules, diacritiques retires.
 * `\p{Diacritic}` avec le drapeau `u` evite d'ecrire une plage Unicode a la main.
 */
function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Recherche plein texte simple sur nom, marque, reference et description
 * courte, dans la langue courante. Repliee des deux cotes : « betacetone »
 * trouve « β-cétone ».
 */
function matchesSearch(product: Product, term: string): boolean {
  const haystack = fold(
    [product.name, product.brand, product.sku, product.shortDescription].join(" "),
  );
  return fold(term)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export function queryCatalog(
  { category, search, sort }: CatalogQuery,
  locale: Locale = routing.defaultLocale,
): Product[] {
  let result = productsFor(locale);

  if (category) result = result.filter((p) => p.category === category);
  if (search?.trim()) result = result.filter((p) => matchesSearch(p, search));

  switch (sort) {
    case "prix-asc":
      return [...result].sort((a, b) => a.price - b.price);
    case "prix-desc":
      return [...result].sort((a, b) => b.price - a.price);
    case "nom":
      return [...result].sort((a, b) => a.name.localeCompare(b.name, INTL_LOCALE[locale]));
    default:
      return result;
  }
}

/** Compte par categorie, calcule sur le catalogue entier (pas sur le filtre). */
export function countByCategory(): Record<Category, number> {
  return rawProducts.reduce(
    (acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<Category, number>,
  );
}
