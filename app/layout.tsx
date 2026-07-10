import type { Metadata } from "next";
import { Montserrat, Noto_Sans } from "next/font/google";
import localFont from "next/font/local";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

/*
  H1 uniquement. Butler est une Didone : superbe en grand, ses delies
  s'amincissent en petit. On la reserve donc au titre principal.
  Licence et obligations d'attribution : app/fonts/LICENSE-Butler.md
*/
const butler = localFont({
  src: "./fonts/Butler-Free-Bd.woff2",
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

export const metadata: Metadata = {
  /*
    Sans cette base, les images Open Graph des fiches produit sont resolues
    contre http://localhost:3000 et pointent dans le vide une fois deployees.
  */
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "eDoctor Place — Equipements medicaux",
    template: "%s | eDoctor Place",
  },
  description:
    "Tensiometres, glucometres, dispositifs connectes et consommables medicaux. Commande en ligne, livraison ou retrait.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${butler.variable} ${montserrat.variable} ${notoSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Lien d'evitement : premier element focusable, cache jusqu'au focus clavier. */}
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Aller au contenu principal
        </a>
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
