import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import type { Locale } from "@/i18n/routing";
import { getAllProducts } from "@/lib/catalog";
import { getPickupLocations } from "@/lib/pickup";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.checkout" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export default async function CommandePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Checkout");

  return (
    <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl sm:text-4xl">{t("title")}</h1>
      <p className="text-muted-foreground mt-2 max-w-[65ch]">{t("intro")}</p>

      <CheckoutForm
        products={getAllProducts(locale)}
        pickupLocations={getPickupLocations()}
        // Seule la clé PUBLIQUE traverse. Le secret reste côté serveur.
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />
    </main>
  );
}
