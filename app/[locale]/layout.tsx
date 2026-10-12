import type { Metadata } from "next";
import { Montserrat, Noto_Sans } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { routing } from "@/i18n/routing";
import "../globals.css";

/*
  H1 uniquement. Butler est une Didone : superbe en grand, ses delies
  s'amincissent en petit. On la reserve donc au titre principal.
  Licence et obligations d'attribution : app/fonts/LICENSE-Butler.md
*/
const butler = localFont({
  src: "../fonts/Butler-Free-Bd.woff2",
  variable: "--font-butler",
  weight: "700",
  display: "swap",
  // Reserve l'espace du texte avant le chargement : evite le saut de mise en page.
  adjustFontFallback: "Times New Roman",
});

// H2 et en dessous : robuste a toutes les tailles.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
});

// Corps de texte : plus lisible que Montserrat en petit corps.
const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Une page statique par langue : /fr et /en sont prerendus au build.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    /*
      Sans cette base, les images Open Graph des fiches produit sont resolues
      contre http://localhost:3000 et pointent dans le vide une fois deployees.
    */
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: {
      default: t("defaultTitle"),
      template: `%s | ${t("siteName")}`,
    },
    description: t("defaultDescription"),
  };
}

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;

  /*
    Le segment [locale] attrape aussi les URLs inconnues (/unknown.txt) :
    une valeur hors liste est un 404, pas un rendu en francais par defaut.
  */
  if (!hasLocale(routing.locales, locale)) notFound();

  // Permet le rendu statique : sans cet appel, lire la locale via les en-tetes
  // de requete ferait basculer toutes les pages en rendu dynamique.
  setRequestLocale(locale);

  const t = await getTranslations("Layout");

  return (
    <html
      lang={locale}
      className={`${butler.variable} ${montserrat.variable} ${notoSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          Sans props, le fournisseur herite de la locale et des messages de
          i18n/request.ts. Les messages pesent quelques Ko : on les passe tous
          plutot que de maintenir une liste d'espaces « client ».
        */}
        <NextIntlClientProvider>
          {/* Lien d'evitement : premier element focusable, cache jusqu'au focus clavier. */}
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            {t("skipLink")}
          </a>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
