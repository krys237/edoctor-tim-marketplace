"use client";

import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

import { totalQuantity } from "@/lib/cart-rules";
import { useCart } from "@/lib/cart-store";
import { Link } from "@/i18n/navigation";

export function CartBadge() {
  const t = useTranslations("Layout.header");
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
      {/*
        Sous 640 px, le mot passe en lecteur d'ecran seulement : l'icone et le
        compteur suffisent, et l'en-tete mobile n'a pas la place pour « Panier ».
      */}
      <span className="max-sm:sr-only">{t("cart")}</span>
      {showCount && (
        <span className="bg-accent text-accent-foreground tabular-price inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold">
          {count}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {showCount ? t("cartCount", { count }) : t("cartEmpty")}
      </span>
    </Link>
  );
}
