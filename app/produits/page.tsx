import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/product/product-card";
import { countByCategory, queryCatalog, type SortOption } from "@/lib/catalog";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/schemas";

export const metadata: Metadata = {
  title: "Nos produits",
  description:
    "Dispositifs médicaux connectés et consommables : analyseur multiparamétrique, tensiomètre, thermomètre, pèse-personne, saturomètre, bandelettes réactives.",
};

const SORTS: { value: SortOption; label: string }[] = [
  { value: "pertinence", label: "Pertinence" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
  { value: "nom", label: "Nom" },
];

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

function isSort(value: unknown): value is SortOption {
  return SORTS.some((s) => s.value === value);
}

/** Construit une URL en preservant les autres parametres. */
function buildHref(
  current: { categorie?: string; q?: string; tri?: string },
  patch: Partial<{ categorie: string; q: string; tri: string }>,
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/produits?${qs}` : "/produits";
}

// Next 16 : searchParams est une Promise, il faut l'attendre.
export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const rawCategory = Array.isArray(sp.categorie) ? sp.categorie[0] : sp.categorie;
  const rawSearch = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const rawSort = Array.isArray(sp.tri) ? sp.tri[0] : sp.tri;

  // Un parametre d'URL est une entree utilisateur : on ne lui fait pas confiance.
  const category = isCategory(rawCategory) ? rawCategory : undefined;
  const sort = isSort(rawSort) ? rawSort : "pertinence";
  const search = rawSearch?.slice(0, 100) ?? "";

  const products = queryCatalog({ category, search, sort });
  const counts = countByCategory();
  const current = { categorie: category, q: search, tri: sort };
  const hasFilters = Boolean(category || search);

  return (
    <main id="contenu" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl sm:text-4xl">Nos produits</h1>
      <p className="text-muted-foreground mt-2 max-w-[65ch]">
        Dispositifs médicaux connectés et consommables associés. Aucun paiement
        n&apos;est encaissé en ligne : notre équipe vous recontacte pour confirmer
        votre commande.
      </p>

      {/* Recherche : formulaire GET, donc fonctionne sans JavaScript. */}
      <form method="GET" action="/produits" className="mt-6 flex max-w-lg gap-2">
        {category && <input type="hidden" name="categorie" value={category} />}
        {sort !== "pertinence" && <input type="hidden" name="tri" value={sort} />}
        <label htmlFor="q" className="sr-only">
          Rechercher un produit
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Tensiomètre, bandelettes, glycémie…"
          className="border-input bg-card min-h-11 w-full rounded-md border px-3 text-base"
        />
        <button
          type="submit"
          className="bg-accent text-accent-foreground hover:bg-accent/90 min-h-11 cursor-pointer rounded-md px-5 text-sm font-semibold transition-colors"
        >
          Rechercher
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <nav aria-label="Filtrer par catégorie" className="flex flex-wrap gap-2">
          <Link
            href={buildHref(current, { categorie: "" })}
            aria-current={!category ? "true" : undefined}
            className={`min-h-11 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              !category
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input hover:bg-secondary"
            }`}
          >
            Tout ({Object.values(counts).reduce((a, b) => a + b, 0)})
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={buildHref(current, { categorie: c })}
              aria-current={category === c ? "true" : undefined}
              className={`min-h-11 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                category === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:bg-secondary"
              }`}
            >
              {CATEGORY_LABELS[c]} ({counts[c] ?? 0})
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={buildHref(current, { tri: s.value })}
              aria-current={sort === s.value ? "true" : undefined}
              className={`min-h-11 rounded-md px-3 py-2 text-sm transition-colors ${
                sort === s.value
                  ? "bg-secondary text-secondary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="text-muted-foreground mt-4 text-sm">
        {products.length} produit{products.length > 1 ? "s" : ""}
        {hasFilters ? " correspondant à votre recherche" : ""}
      </p>

      {products.length === 0 ? (
        <div className="border-input mt-6 rounded-lg border border-dashed p-10 text-center">
          <p className="font-semibold">Aucun produit ne correspond.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Essayez un autre terme, ou réinitialisez les filtres.
          </p>
          <Link
            href="/produits"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex min-h-11 items-center rounded-md px-5 text-sm font-semibold transition-colors"
          >
            Réinitialiser les filtres
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, index) => (
            <li key={p.id}>
              {/*
                Premiere rangee (4 colonnes au plus large) : chargement immediat,
                sinon les cartes visibles apparaissent par a-coups. Seule la
                premiere recoit fetchPriority=high : c'est la candidate LCP quelle
                que soit la largeur d'ecran.
              */}
              <ProductCard product={p} eager={index < 4} lcpCandidate={index === 0} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
