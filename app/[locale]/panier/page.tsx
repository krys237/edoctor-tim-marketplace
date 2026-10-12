import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CartView } from "@/components/cart/cart-view";
import type { Locale } from "@/i18n/routing";
import { getAllProducts } from "@/lib/catalog";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.cart" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

/*
  Page serveur : elle lit et valide le catalogue, puis passe les produits au
  composant client, dans la langue de la page. Le panier lui-meme vit dans le
  navigateur (localStorage) et ne contient que des identifiants : il est donc
  le meme quelle que soit la langue.
*/
export default async function PanierPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Cart");

  return (
    <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl sm:text-4xl">{t("title")}</h1>
      <CartView products={getAllProducts(locale)} />
    </main>
  );
}
