import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { formatXaf } from "@/lib/money";
import { AVAILABILITY_LABELS, type Product } from "@/lib/schemas";

const AVAILABILITY_DOT: Record<Product["availability"], string> = {
  in_stock: "bg-success",
  on_order: "bg-accent",
  discontinued: "bg-muted-foreground",
};

const AVAILABILITY_TEXT: Record<Product["availability"], string> = {
  in_stock: "text-success",
  on_order: "text-foreground",
  discontinued: "text-muted-foreground",
};

export function ProductCard({
  product,
  /** Carte visible sans defilement : charger l'image immediatement. */
  eager = false,
  /**
   * Unique carte susceptible de porter le Largest Contentful Paint.
   *
   * Next 16 a DEPRECIE la prop `priority` (sans effet, silencieusement) :
   * on passe desormais `loading` et `fetchPriority`. `preload` est ecarte
   * car sur une grille l'image LCP depend de la largeur du viewport, cas que
   * la documentation range explicitement dans les « quand ne pas l'utiliser ».
   */
  lcpCandidate = false,
}: {
  product: Product;
  eager?: boolean;
  lcpCandidate?: boolean;
}) {
  const href = `/produits/${product.id}`;

  return (
    /*
      `relative` ancre le ::after du lien a la carte.
      `h-full` fait remplir la cellule de grille : sans cela, les cartes d'une
      meme rangee ont des hauteurs differentes des qu'un texte est plus long, et
      les boutons ne s'alignent plus.
    */
    <article className="bg-card text-card-foreground focus-within:outline-ring relative flex h-full flex-col rounded-lg border p-4 transition-shadow hover:shadow-md focus-within:outline-2 focus-within:outline-offset-2">
      <div className="bg-muted relative mb-3 aspect-square overflow-hidden rounded-md">
        <Image
          src={product.images[0].src}
          alt={product.images[0].alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-contain p-2"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={lcpCandidate ? "high" : undefined}
        />
      </div>

      <h3 className="text-sm leading-snug font-semibold">
        {/*
          Le lien couvre toute la carte via ::after, mais seul le titre est
          annonce au lecteur d'ecran : pas de lien vide en double.
        */}
        <Link href={href} className="after:absolute after:inset-0">
          {product.name}
        </Link>
      </h3>

      <p className="text-muted-foreground mt-0.5 text-xs">{product.brand}</p>

      <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
        {product.shortDescription}
      </p>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="tabular-price text-lg font-bold whitespace-nowrap">
          {formatXaf(product.price)}
        </span>
      </div>

      {/* L'etat n'est jamais porte par la couleur seule : pastille + libelle. */}
      <span
        className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium ${AVAILABILITY_TEXT[product.availability]}`}
      >
        <span
          aria-hidden
          className={`size-1.5 rounded-full ${AVAILABILITY_DOT[product.availability]}`}
        />
        {AVAILABILITY_LABELS[product.availability]}
      </span>

      {product.requiresConsumable && (
        <p className="text-muted-foreground mt-2 text-xs">
          Nécessite au moins un pack de bandelettes.
        </p>
      )}

      {/*
        `relative z-10` est indispensable : le lien du titre recouvre toute la
        carte via son ::after. Sans elevation, le clic sur ce bouton serait
        intercepte par le lien et naviguerait au lieu d'ajouter au panier.
        `mt-auto` colle le bouton en bas : tous les boutons d'une rangee
        s'alignent, quelle que soit la longueur des descriptions.
      */}
      <div className="relative z-10 mt-auto pt-3">
        <AddToCartButton
          productId={product.id}
          productName={product.name}
          disabled={product.availability === "discontinued"}
        />
      </div>
    </article>
  );
}
