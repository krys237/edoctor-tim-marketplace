"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, type ComponentProps } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Href = ComponentProps<typeof Link>["href"];

/*
  Selecteur de langue : des LIENS, pas un <select> ni un bouton.

  Un lien fonctionne sans JavaScript, se partage, et annonce aux moteurs de
  recherche l'existence de la page dans l'autre langue (hreflang). Le lien
  pointe vers la MEME page : chemin courant, parametres dynamiques (slug,
  reference) et parametres de requete (categorie, q, tri) conserves.
*/
function LocaleLinks() {
  const t = useTranslations("Layout.localeSwitcher");
  const current = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();

  const query = Object.fromEntries(searchParams.entries());
  /*
    `usePathname` rend le chemin INTERNE (ex. "/produits/[slug]") : il suffit
    de lui rattacher les parametres courants pour que `Link` reconstruise
    l'URL traduite dans la langue cible.
  */
  const href = { pathname, params, query } as Href;

  return (
    <nav aria-label={t("label")} className="flex items-center text-sm font-semibold">
      {routing.locales.map((locale, index) => {
        const active = locale === current;
        return (
          <span key={locale} className="flex items-center">
            {index > 0 && (
              <span aria-hidden className="opacity-40">
                /
              </span>
            )}
            <Link
              href={href}
              locale={locale}
              hrefLang={locale}
              lang={locale}
              aria-current={active ? "true" : undefined}
              className={`hover:bg-primary-foreground/10 inline-flex min-h-11 items-center rounded-md px-2 uppercase transition-colors ${
                active ? "underline underline-offset-4" : "opacity-70 hover:opacity-100"
              }`}
            >
              <span className="sr-only">{t(locale)}</span>
              <span aria-hidden>{locale}</span>
            </Link>
          </span>
        );
      })}
    </nav>
  );
}

export function LocaleSwitcher() {
  /*
    `useSearchParams` exige une frontiere Suspense pour que les pages
    statiques le restent : sans elle, tout l'arbre basculerait en rendu client.
  */
  return (
    <Suspense fallback={<span className="inline-block min-h-11 w-16" aria-hidden />}>
      <LocaleLinks />
    </Suspense>
  );
}
