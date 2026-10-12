import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { isValidOrderReference } from "@/lib/order-reference";

type Props = { params: Promise<{ locale: Locale; reference: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.confirmation" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

/*
  Cette page n'affiche AUCUNE donnee de commande : il n'existe pas de base de
  donnees, et une reference dans une URL n'est pas un secret. Elle se contente
  de confirmer l'envoi et de rappeler la reference que le client vient de saisir.
*/
export default async function ConfirmationPage({ params }: Props) {
  const { locale, reference } = await params;
  setRequestLocale(locale);
  if (!isValidOrderReference(reference)) notFound();

  const t = await getTranslations("Confirmation");

  return (
    <main id="contenu" className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-success text-sm font-semibold">{t("status")}</p>

        <h1 className="mt-3 text-3xl">{t("heading")}</h1>

        <p className="text-muted-foreground mt-4">{t("referenceLabel")}</p>
        <p className="tabular-price bg-secondary text-secondary-foreground mt-2 inline-block rounded-md px-4 py-2 text-xl font-bold">
          {reference}
        </p>

        <div className="border-accent bg-accent/10 mt-8 rounded-md border-l-4 p-4 text-left">
          <p className="text-sm font-semibold">{t("notConfirmedTitle")}</p>
          <p className="mt-1 text-sm">{t("notConfirmedBody")}</p>
        </div>

        <p className="text-muted-foreground mt-6 text-sm">{t("receiptNote")}</p>

        <Link
          href="/produits"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-8 inline-flex min-h-11 items-center rounded-md px-5 text-sm font-semibold transition-colors"
        >
          {t("back")}
        </Link>
      </div>
    </main>
  );
}
