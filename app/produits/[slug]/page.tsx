import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductPurchase } from "@/components/cart/product-purchase";
import { ProductCard } from "@/components/product/product-card";
import { getAllProducts, getProductById, getProductsByIds } from "@/lib/catalog";
import { formatXaf } from "@/lib/money";
import { AVAILABILITY_LABELS, CATEGORY_LABELS } from "@/lib/schemas";

type Params = { params: Promise<{ slug: string }> };

// Le catalogue est statique : on prerend chaque fiche au build.
export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = getProductById((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: [product.images[0].src],
    },
  };
}

const SCHEMA_AVAILABILITY: Record<string, string> = {
  in_stock: "https://schema.org/InStock",
  on_order: "https://schema.org/PreOrder",
  discontinued: "https://schema.org/Discontinued",
};

export default async function ProduitPage({ params }: Params) {
  const product = getProductById((await params).slug);
  if (!product) notFound();

  const related = getProductsByIds(product.relatedProductIds);

  // Donnees structurees : fait apparaitre prix et disponibilite dans Google.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    description: product.shortDescription,
    image: product.images.map((i) => i.src),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "XAF",
      availability: SCHEMA_AVAILABILITY[product.availability],
    },
  };

  // Aucune mention reglementaire n'est affirmee tant que la donnee est absente.
  const hasRegulatoryData =
    product.medical.ceMarked !== null ||
    product.medical.deviceClass !== null ||
    product.medical.noticeUrl !== null;

  return (
    <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Fil d'Ariane" className="text-muted-foreground mb-6 text-sm">
        <Link href="/produits" className="hover:text-foreground underline">
          Nos produits
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <Link
          href={`/produits?categorie=${product.category}`}
          className="hover:text-foreground underline"
        >
          {CATEGORY_LABELS[product.category]}
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="bg-card relative aspect-square overflow-hidden rounded-lg border">
          <Image
            src={product.images[0].src}
            alt={product.images[0].alt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-6"
            // Image heros, LCP certain. `priority` est deprecie depuis Next 16.
            loading="eager"
            fetchPriority="high"
          />
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl">{product.name}</h1>
          <p className="text-muted-foreground mt-1">{product.brand}</p>

          <p className="tabular-price mt-4 text-3xl font-bold">
            {formatXaf(product.price)}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Frais de livraison communiqués à la confirmation.
          </p>

          <p className="mt-4 text-sm font-medium">
            {AVAILABILITY_LABELS[product.availability]}
          </p>

          <ProductPurchase
            productId={product.id}
            productName={product.name}
            disabled={product.availability === "discontinued"}
          />

          {product.requiresConsumable && (
            <div className="border-accent bg-accent/10 mt-4 rounded-md border-l-4 p-3">
              <p className="text-sm font-medium">
                La commande de cet appareil exige au moins un pack de bandelettes
                réactives.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-4 text-sm leading-relaxed">
            {product.description.split("\n\n").map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </div>

          {product.specs.length > 0 && (
            <>
              <h2 className="mt-8 text-xl">Caractéristiques techniques</h2>
              <dl className="mt-3 divide-y border-t">
                {product.specs.map((spec) => (
                  <div key={spec.label} className="grid grid-cols-3 gap-4 py-2.5">
                    <dt className="text-muted-foreground text-sm">{spec.label}</dt>
                    <dd className="col-span-2 text-sm">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {/*
            Bloc reglementaire. Rien n'est affirme sans donnee : afficher
            « marquage CE » sans source serait une allegation juridique.
          */}
          <div className="bg-muted mt-8 rounded-md p-4">
            <h2 className="text-base">Informations réglementaires</h2>
            {hasRegulatoryData ? (
              <dl className="mt-2 space-y-1 text-sm">
                {product.medical.deviceClass && (
                  <div>
                    <dt className="inline text-muted-foreground">Classe : </dt>
                    <dd className="inline">{product.medical.deviceClass}</dd>
                  </div>
                )}
                {product.medical.noticeUrl && (
                  <a href={product.medical.noticeUrl} className="underline">
                    Notice d&apos;utilisation (PDF)
                  </a>
                )}
              </dl>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm">
                Les informations réglementaires de ce produit (marquage CE, classe du
                dispositif, notice) seront publiées prochainement. Contactez notre
                support pour les obtenir avant achat.
              </p>
            )}
            <p className="text-muted-foreground mt-3 text-xs">
              Dispositif médical — lisez attentivement la notice. Ces informations ne
              remplacent pas l&apos;avis d&apos;un professionnel de santé.
            </p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl">
            {product.requiresConsumable ? "Bandelettes compatibles" : "Appareil compatible"}
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
