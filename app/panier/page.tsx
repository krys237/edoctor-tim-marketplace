import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";
import { getAllProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Votre panier",
  robots: { index: false, follow: false },
};

/*
  Page serveur : elle lit et valide le catalogue, puis passe les produits au
  composant client. Le panier lui-meme vit dans le navigateur (localStorage),
  mais Zod et la lecture du fichier restent cote serveur.
*/
export default function PanierPage() {
  return (
    <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl sm:text-4xl">Votre panier</h1>
      <CartView products={getAllProducts()} />
    </main>
  );
}
