import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getAllProducts } from "@/lib/catalog";
import { getPickupLocations } from "@/lib/pickup";

export const metadata: Metadata = {
  title: "Votre commande",
  robots: { index: false, follow: false },
};

export default function CommandePage() {
  return (
    <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl sm:text-4xl">Votre commande</h1>
      <p className="text-muted-foreground mt-2 max-w-[65ch]">
        Renseignez vos coordonnées. Aucun paiement n&apos;est encaissé en ligne :
        notre support vous contacte pour confirmer la disponibilité, les frais de
        livraison et le règlement.
      </p>

      <CheckoutForm
        products={getAllProducts()}
        pickupLocations={getPickupLocations()}
        // Seule la clé PUBLIQUE traverse. Le secret reste côté serveur.
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />
    </main>
  );
}
