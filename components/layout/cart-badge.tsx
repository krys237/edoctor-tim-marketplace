"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";

import { totalQuantity } from "@/lib/cart-rules";
import { useCart } from "@/lib/cart-store";

export function CartBadge() {
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const count = totalQuantity(items);

  // Avant rehydratation, le serveur a rendu 0 : ne rien afficher plutot que de
  // faire clignoter un compteur faux.
  const showCount = hydrated && count > 0;

  return (
    <Link
      href="/panier"
      /*
        Surbrillance tiree du premier plan, pas de `bg-secondary` : ce token est
        clair, et le lien herite du texte blanc du header marine. Le survol
        tombait a 1.23:1, sous le seuil WCAG de 4.5:1.
      */
      className="hover:bg-primary-foreground/10 relative inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors"
    >
      {/* Decorative : le mot « Panier » porte deja le sens pour un lecteur d'ecran. */}
      <ShoppingCart aria-hidden className="size-5 shrink-0" strokeWidth={2} />
      Panier
      {showCount && (
        <span className="bg-accent text-accent-foreground tabular-price inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold">
          {count}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {showCount ? `${count} article${count > 1 ? "s" : ""} dans le panier` : "Panier vide"}
      </span>
    </Link>
  );
}
