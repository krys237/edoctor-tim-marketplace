"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo } from "react";

import { QuantityPicker } from "@/components/cart/quantity-picker";
import { cartViolations, resolveLines, subtotal, totalQuantity } from "@/lib/cart-rules";
import { useCart } from "@/lib/cart-store";
import { formatXaf } from "@/lib/money";
import type { Product } from "@/lib/schemas";

export function CartView({ products }: { products: Product[] }) {
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);

  const lookup = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return (id: string) => map.get(id);
  }, [products]);

  const { lines, droppedIds } = useMemo(
    () => resolveLines(items, lookup),
    [items, lookup],
  );

  // Un produit disparu du catalogue est retire du panier persiste, une fois.
  useEffect(() => {
    for (const id of droppedIds) remove(id);
  }, [droppedIds, remove]);

  const violations = useMemo(() => cartViolations(lines), [lines]);
  const total = subtotal(lines);
  const count = totalQuantity(lines);

  /*
    Le serveur rend toujours un panier vide : le localStorage n'existe pas
    encore. Afficher ce vide avant rehydratation provoquerait un ecart
    d'hydratation, et un clignotement « panier vide » chez un client qui a des
    articles. On attend donc la rehydratation.
  */
  if (!hydrated) {
    // `bg-secondary` et non `bg-muted` : muted vaut la meme valeur que le fond
    // de page en mode clair, le squelette y serait invisible.
    return (
      <div className="mt-8" aria-busy="true">
        <span className="sr-only">Chargement de votre panier…</span>
        <div className="bg-secondary h-24 animate-pulse rounded-lg" />
        <div className="bg-secondary mt-3 h-24 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="border-input mt-8 rounded-lg border border-dashed p-10 text-center">
        <p className="font-semibold">Votre panier est vide.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Parcourez nos dispositifs connectés et consommables.
        </p>
        <Link
          href="/produits"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex min-h-11 items-center rounded-md px-5 text-sm font-semibold transition-colors"
        >
          Voir les produits
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        {violations.length > 0 && (
          <div
            role="alert"
            className="border-destructive bg-destructive/10 mb-6 rounded-md border-l-4 p-4"
          >
            <p className="text-sm font-semibold">Commande incomplète</p>
            <ul className="mt-2 space-y-1">
              {violations.map((v) => (
                <li key={v.productId} className="text-sm">
                  {v.message}{" "}
                  <Link href="/produits?categorie=consommables" className="underline">
                    Voir les bandelettes
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="divide-y border-y">
          {lines.map((line) => {
            const titleId = `ligne-${line.product.id}`;
            return (
              <li key={line.product.id} className="flex gap-4 py-4">
                <div className="bg-muted relative size-24 shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={line.product.images[0].src}
                    alt={line.product.images[0].alt}
                    fill
                    sizes="96px"
                    className="object-contain p-1"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 id={titleId} className="text-base font-semibold">
                    <Link href={`/produits/${line.product.id}`} className="hover:underline">
                      {line.product.name}
                    </Link>
                  </h2>
                  <p className="text-muted-foreground text-xs">{line.product.brand}</p>
                  {/* {" "} explicite : JSX supprime l'espace avant un saut de ligne. */}
                  <p className="tabular-price text-muted-foreground mt-1 text-sm">
                    {formatXaf(line.product.price)}{" "}
                    <span className="font-sans">l&apos;unité</span>
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <QuantityPicker
                      value={line.quantity}
                      onChange={(next) => setQuantity(line.product.id, next)}
                      labelledBy={titleId}
                    />
                    <button
                      type="button"
                      onClick={() => remove(line.product.id)}
                      className="text-muted-foreground hover:text-destructive min-h-11 cursor-pointer text-sm underline transition-colors"
                    >
                      Retirer
                    </button>
                  </div>
                </div>

                <p className="tabular-price shrink-0 text-base font-bold whitespace-nowrap">
                  {formatXaf(line.lineTotal)}
                </p>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={clear}
          className="text-muted-foreground hover:text-destructive mt-4 min-h-11 cursor-pointer text-sm underline transition-colors"
        >
          Vider le panier
        </button>
      </div>

      <aside className="bg-card h-fit rounded-lg border p-5">
        <h2 className="text-lg">Récapitulatif</h2>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Sous-total ({count} article{count > 1 ? "s" : ""})
            </dt>
            <dd className="tabular-price font-semibold">{formatXaf(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Livraison</dt>
            {/*
              Aucun « total » n'est affiche : les frais de livraison sont
              inconnus a ce stade. Presenter un total incomplet creerait une
              attente de prix ferme chez le client.
            */}
            <dd className="text-right text-xs">Communiquée à la confirmation</dd>
          </div>
        </dl>

        <p className="text-muted-foreground mt-4 text-xs">
          Aucun paiement n&apos;est encaissé en ligne. Notre équipe vous recontacte
          sous 24 à 48 h ouvrées pour confirmer votre commande et les frais de
          livraison.
        </p>

        {violations.length > 0 ? (
          <>
            <button
              disabled
              aria-describedby="blocage-commande"
              className="bg-primary text-primary-foreground mt-5 min-h-11 w-full cursor-not-allowed rounded-md text-sm font-semibold opacity-50"
            >
              Passer la commande
            </button>
            <p id="blocage-commande" className="text-destructive mt-2 text-xs">
              Complétez votre panier pour continuer.
            </p>
          </>
        ) : (
          <Link
            href="/commande"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 flex min-h-11 w-full items-center justify-center rounded-md text-sm font-semibold transition-colors"
          >
            Passer la commande
          </Link>
        )}
      </aside>
    </div>
  );
}
