import { useTranslations } from "next-intl";

import { Brand } from "@/components/layout/brand";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("Layout.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground mt-16">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            {/*
              96 px : en dessous, la signature « Dossier médical informatisé »
              gravée dans le logo devient illisible. Verifie en rendant le
              fichier aux tailles reelles d'affichage.
            */}
            <Brand size={96} />
            <p className="mt-4 max-w-[45ch] text-sm opacity-80">{t("tagline")}</p>
          </div>

          <nav aria-label={t("navLabel")}>
            <p className="text-sm font-semibold">{t("navTitle")}</p>
            {/* Uniquement des liens vers des pages qui existent. */}
            <ul className="mt-2 space-y-1 text-sm opacity-80">
              <li>
                <Link href="/produits" className="hover:underline">
                  {t("products")}
                </Link>
              </li>
              <li>
                <Link href="/panier" className="hover:underline">
                  {t("cart")}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="text-sm font-semibold">{t("orderTitle")}</p>
            <p className="mt-2 max-w-[45ch] text-sm opacity-80">{t("orderBody")}</p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/15 pt-6">
          {/*
            Avertissement obligatoire sur un site distribuant des dispositifs
            medicaux. Ne pas retirer.
          */}
          <p className="max-w-[80ch] text-xs opacity-80">{t("medicalNotice")}</p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs opacity-70">
            <p>{t("copyright", { year })}</p>
            {/*
              Attribution imposee par l'EULA de Butler : la licence n'autorise la
              redistribution des fichiers (servir un .woff2 en est une) qu'a la
              condition d'afficher une reference claire au site de l'auteur.
              Voir app/fonts/LICENSE-Butler.md
            */}
            <p>
              {t("fontCredit")}{" "}
              <a
                href="https://www.fabiandesmet.com"
                rel="noopener noreferrer"
                target="_blank"
                className="underline"
              >
                Fabian De Smet
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
