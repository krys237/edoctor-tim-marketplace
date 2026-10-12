"use client";

import { useTranslations } from "next-intl";

import { MAX_QUANTITY } from "@/lib/cart-store";

type Props = {
  value: number;
  onChange: (next: number) => void;
  labelledBy?: string;
  /** Libellé accessible quand aucun label visible n'existe (page panier). */
  label?: string;
};

export function QuantityPicker({ value, onChange, labelledBy, label }: Props) {
  const t = useTranslations("Product.quantity");
  const clamp = (n: number) => Math.min(MAX_QUANTITY, Math.max(1, n));

  return (
    <div className="border-input inline-flex items-center rounded-md border">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= 1}
        aria-label={t("decrease")}
        className="hover:bg-secondary flex size-11 cursor-pointer items-center justify-center rounded-l-md text-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>

      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_QUANTITY}
        value={value}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : (label ?? t("label"))}
        onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10);
          // Un champ vide ou non numerique ne doit pas produire NaN dans l'etat.
          if (Number.isFinite(next)) onChange(clamp(next));
        }}
        className="tabular-price h-11 w-14 border-x-0 bg-transparent text-center text-base [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= MAX_QUANTITY}
        aria-label={t("increase")}
        className="hover:bg-secondary flex size-11 cursor-pointer items-center justify-center rounded-r-md text-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
