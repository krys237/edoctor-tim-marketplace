"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { QuantityPicker } from "@/components/cart/quantity-picker";

/** Bloc d'achat de la fiche produit : quantite + ajout au panier. */
export function ProductPurchase({
  productId,
  productName,
  disabled = false,
}: {
  productId: string;
  productName: string;
  disabled?: boolean;
}) {
  const t = useTranslations("Product.quantity");
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <QuantityPicker value={quantity} onChange={setQuantity} label={t("label")} />
      <div className="min-w-56 flex-1">
        <AddToCartButton
          productId={productId}
          productName={productName}
          quantity={quantity}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
