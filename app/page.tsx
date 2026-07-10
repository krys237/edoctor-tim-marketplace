import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/product/product-card";
import { countByCategory, getAllProducts, getProductById } from "@/lib/catalog";
import { formatXaf } from "@/lib/money";
import { CATEGORY_LABELS, type Category } from "@/lib/schemas";

export const metadata: Metadata = {
  title: "eDoctor Place — Dispositifs médicaux connectés",
  description:
    "Analyseur multiparamétrique, tensiomètre, thermomètre, pèse-personne, saturomètre et bandelettes réactives. Commande en ligne, confirmation par notre équipe.",
};

const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  "dispositifs-connectes":
    "Appareils de mesure synchronisés avec l'application mobile : tension, glycémie, température, poids, saturation.",
  consommables: "Bandelettes réactives compatibles avec l'appareil e-Dr Tim.",
};

/** Trois faits, pas trois promesses. Chacun est vérifiable sur le site. */
const REASSURANCE = [
  {
    title: "Aucun paiement en ligne",
    body: "Vous composez votre commande, notre équipe vous rappelle pour la confirmer.",
  },
  {
    title: "Réponse sous 24 à 48 h",
    body: "Un accusé de réception vous est envoyé immédiatement, avec votre référence.",
  },
  {
    title: "Appareils connectés",
    body: "Mesures synchronisées avec l'application mobile, historique et courbes.",
  },
];

export default function Home() {
  const counts = countByCategory();
  const products = getAllProducts();
  const devices = products.filter((p) => p.category === "dispositifs-connectes");

  // Le PDF tarifaire désigne cet appareil « Best seller ». Donnée, pas supposition.
  const bestSeller = getProductById("e-dr-tim-6-connect");

  return (
    <main id="contenu">
      {/* ---------- Hero ---------- */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <h1 className="text-4xl leading-tight sm:text-5xl">
              Mesurer sa santé, simplement.
            </h1>
            <p className="mt-5 max-w-[55ch] text-base opacity-90 sm:text-lg">
              Tensiomètres, glucomètres, saturomètres et consommables. Des appareils
              connectés qui transmettent chaque mesure à votre application mobile.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {/*
                CTA principal en or : le libellé posé dessus est marine.
                Blanc sur or ne donne que 2,48:1 et échoue au seuil WCAG.
              */}
              <Link
                href="/produits"
                className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex min-h-11 items-center rounded-md px-6 text-sm font-semibold transition-colors"
              >
                Voir nos produits
              </Link>
              <Link
                href="/produits?categorie=consommables"
                className="hover:bg-primary-foreground/10 inline-flex min-h-11 items-center rounded-md border border-white/30 px-6 text-sm font-semibold transition-colors"
              >
                Bandelettes réactives
              </Link>
            </div>

            <p className="mt-6 text-xs opacity-70">
              Aucun paiement n&apos;est encaissé en ligne.
            </p>
          </div>

          {bestSeller && (
            <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-lg bg-white">
              <Image
                src={bestSeller.images[0].src}
                alt={bestSeller.images[0].alt}
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-contain p-6"
                // Image héros : LCP certain. `priority` est déprécié depuis Next 16.
                loading="eager"
                fetchPriority="high"
              />
            </div>
          )}
        </div>
      </section>

      {/* ---------- Réassurance ---------- */}
      <section aria-label="Comment fonctionne la commande" className="border-b">
        <ul className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {REASSURANCE.map((item) => (
            <li key={item.title}>
              <h2 className="text-base">{item.title}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Catégories ---------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl sm:text-3xl">Nos catégories</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((category) => (
            <Link
              key={category}
              href={`/produits?categorie=${category}`}
              className="bg-card focus-visible:outline-ring group rounded-lg border p-6 transition-shadow hover:shadow-md"
            >
              <h3 className="text-xl group-hover:underline">
                {CATEGORY_LABELS[category]}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-[50ch] text-sm">
                {CATEGORY_DESCRIPTIONS[category]}
              </p>
              <p className="text-muted-foreground mt-4 text-xs">
                {counts[category] ?? 0} produit{(counts[category] ?? 0) > 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Le plus demandé ---------- */}
      {bestSeller && (
        <section className="bg-card border-y">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
              <Image
                src={bestSeller.images[0].src}
                alt={bestSeller.images[0].alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-8"
              />
            </div>

            <div>
              <p className="bg-accent text-accent-foreground inline-block rounded px-2 py-0.5 text-xs font-bold">
                Le plus demandé
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl">{bestSeller.name}</h2>
              <p className="text-muted-foreground mt-3 max-w-[55ch]">
                {bestSeller.shortDescription}. Glycémie, profil 3-en-1, β-cétone,
                cholestérol total et acide urique, selon la bandelette utilisée.
              </p>

              <p className="tabular-price mt-5 text-3xl font-bold">
                {formatXaf(bestSeller.price)}
              </p>

              {/* Contrainte réelle, dite d'emblée plutôt que découverte au panier. */}
              <div className="border-accent bg-accent/10 mt-5 rounded-md border-l-4 p-3">
                <p className="text-sm">
                  La commande de cet appareil exige au moins un pack de bandelettes
                  réactives.
                </p>
              </div>

              <Link
                href={`/produits/${bestSeller.id}`}
                className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex min-h-11 items-center rounded-md px-6 text-sm font-semibold transition-colors"
              >
                Voir la fiche produit
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Dispositifs connectés ---------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl sm:text-3xl">Dispositifs connectés</h2>
          <Link href="/produits" className="text-sm underline">
            Voir tout le catalogue
          </Link>
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {devices.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
