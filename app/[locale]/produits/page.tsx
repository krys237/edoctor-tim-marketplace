import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProductCard } from "@/components/product/product-card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { countByCategory, queryCatalog, type SortOption } from "@/lib/catalog";
import { CATEGORIES, type Category } from "@/lib/schemas";

type Props = {
  params: Promise<{ locale: Locale }>;
  // Next 16 : searchParams est une Promise, il faut l'attendre.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.catalog" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternates("/produits"),
  };
}

const SORTS: readonly SortOption[] = ["pertinence", "prix-asc", "prix-desc", "nom"];

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

function isSort(value: unknown): value is SortOption {
  return typeof value === "string" && (SORTS as readonly string[]).includes(value);
}

type Query = { categorie?: string; q?: string; tri?: string };

/**
 * Parametres de requete en preservant les autres. Les cles (categorie, q, tri)
 * sont identiques dans toutes les langues : ce sont des identifiants.
 */
function buildQuery(current: Query, patch: Partial<Query>): Record<string, string> {
  const merged = { ...current, ...patch };
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (value) query[key] = value;
  }
  return query;
}

export default async function ProduitsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Catalog");
  const sp = await searchParams;

  const rawCategory = Array.isArray(sp.categorie) ? sp.categorie[0] : sp.categorie;
  const rawSearch = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const rawSort = Array.isArray(sp.tri) ? sp.tri[0] : sp.tri;

  // Un parametre d'URL est une entree utilisateur : on ne lui fait pas confiance.
  const category = isCategory(rawCategory) ? rawCategory : undefined;
  const sort = isSort(rawSort) ? rawSort : "pertinence";
  const search = rawSearch?.slice(0, 100) ?? "";

  const products = queryCatalog({ category, search, sort }, locale);
  const counts = countByCategory();
  const current: Query = { categorie: category, q: search, tri: sort };
  const hasFilters = Boolean(category || search);
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <main id="contenu" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl sm:text-4xl">{t("title")}</h1>
      <p className="text-muted-foreground mt-2 max-w-[65ch]">{t("intro")}</p>

      {/*
        Recherche : formulaire GET, donc fonctionne sans JavaScript.
        `action` vide = soumission vers l'URL courante, deja dans la bonne
        langue : pas besoin de connaitre le chemin traduit.
      */}
      <form method="GET" className="mt-6 flex max-w-lg gap-2">
        {category && <input type="hidden" name="categorie" value={category} />}
        {sort !== "pertinence" && <input type="hidden" name="tri" value={sort} />}
        <label htmlFor="q" className="sr-only">
          {t("search.label")}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={search}
          placeholder={t("search.placeholder")}
          className="border-input bg-card min-h-11 w-full rounded-md border px-3 text-base"
        />
        <button
          type="submit"
          className="bg-accent text-accent-foreground hover:bg-accent/90 min-h-11 cursor-pointer rounded-md px-5 text-sm font-semibold transition-colors"
        >
          {t("search.submit")}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <nav aria-label={t("filters.ariaLabel")} className="flex flex-wrap gap-2">
          <Link
            href={{ pathname: "/produits", query: buildQuery(current, { categorie: "" }) }}
            aria-current={!category ? "true" : undefined}
            className={`min-h-11 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              !category
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input hover:bg-secondary"
            }`}
          >
            {t("filters.all", { count: totalCount })}
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={{ pathname: "/produits", query: buildQuery(current, { categorie: c }) }}
              aria-current={category === c ? "true" : undefined}
              className={`min-h-11 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                category === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:bg-secondary"
              }`}
            >
              {t("filters.category", { label: t(`categories.${c}`), count: counts[c] ?? 0 })}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <Link
              key={s}
              href={{ pathname: "/produits", query: buildQuery(current, { tri: s }) }}
              aria-current={sort === s ? "true" : undefined}
              className={`min-h-11 rounded-md px-3 py-2 text-sm transition-colors ${
                sort === s
                  ? "bg-secondary text-secondary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t(`sort.${s}`)}
            </Link>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="text-muted-foreground mt-4 text-sm">
        {hasFilters
          ? t("resultsFiltered", { count: products.length })
          : t("results", { count: products.length })}
      </p>

      {products.length === 0 ? (
        <div className="border-input mt-6 rounded-lg border border-dashed p-10 text-center">
          <p className="font-semibold">{t("empty.title")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("empty.body")}</p>
          <Link
            href="/produits"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex min-h-11 items-center rounded-md px-5 text-sm font-semibold transition-colors"
          >
            {t("empty.reset")}
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
