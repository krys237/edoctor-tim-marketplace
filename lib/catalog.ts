import raw from "@/data/products.json";
import { ProductsFileSchema, type Category, type Product } from "@/lib/schemas";

/*
  Source de verite du catalogue public.

  Le fichier est valide au chargement : une faute de frappe dans products.json
  fait echouer le build plutot que de produire une fiche produit cassee en
  production.

  Ce module isole le reste du code de la source de donnees. Le jour ou le
  catalogue migre vers une base, seule l'implementation change ici.
*/
const products: Product[] = ProductsFileSchema.parse(raw);

export function getAllProducts(): Product[] {
  return products;
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

/** Resout une liste d'identifiants, en ignorant silencieusement les inconnus. */
export function getProductsByIds(ids: string[]): Product[] {
  return ids.map(getProductById).filter((p): p is Product => p !== undefined);
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
 * courte. Repliee des deux cotes : « betacetone » trouve « β-cétone ».
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

export function queryCatalog({ category, search, sort }: CatalogQuery): Product[] {
  let result = products;

  if (category) result = result.filter((p) => p.category === category);
  if (search?.trim()) result = result.filter((p) => matchesSearch(p, search));

  switch (sort) {
    case "prix-asc":
      return [...result].sort((a, b) => a.price - b.price);
    case "prix-desc":
      return [...result].sort((a, b) => b.price - a.price);
    case "nom":
      return [...result].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    default:
      return result;
  }
}

/** Compte par categorie, calcule sur le catalogue entier (pas sur le filtre). */
export function countByCategory(): Record<Category, number> {
  return products.reduce(
    (acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<Category, number>,
  );
}
