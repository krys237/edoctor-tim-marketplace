"use client";

import { useEffect, useRef, useState } from "react";

import { useCart } from "@/lib/cart-store";

type Props = {
  productId: string;
  productName: string;
  quantity?: number;
  disabled?: boolean;
  className?: string;
};

export function AddToCartButton({
  productId,
  productName,
  quantity = 1,
  disabled = false,
  className = "",
}: Props) {
  const add = useCart((s) => s.add);
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sans ce nettoyage, un demontage pendant les 2s laisse un setState orphelin.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function handleClick() {
    add(productId, quantity);
    setJustAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`min-h-11 w-full cursor-pointer rounded-md text-sm font-semibold transition-colors ${
          justAdded
            ? "bg-success text-success-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        } disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {justAdded ? "Ajouté au panier" : "Ajouter au panier"}
      </button>

      {/*
        Le retour visuel du bouton ne suffit pas a un lecteur d'ecran : la
        confirmation est annoncee separement, sans voler le focus.
      */}
      <span role="status" aria-live="polite" className="sr-only">
        {justAdded ? `${productName} ajouté au panier` : ""}
      </span>
    </>
  );
}
