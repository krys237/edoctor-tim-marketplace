"use client";

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
      className="hover:bg-secondary relative inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors"
    >
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
