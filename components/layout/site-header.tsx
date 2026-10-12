import { useTranslations } from "next-intl";

import { Brand } from "@/components/layout/brand";
import { CartBadge } from "@/components/layout/cart-badge";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Link } from "@/i18n/navigation";

export function SiteHeader() {
  const t = useTranslations("Layout.header");

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-40">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <Link href="/" className="hover:opacity-90 shrink-0 transition-opacity">
          <span className="sr-only">{t("home")}</span>
          <Brand size={44} compact />
        </Link>

        {/*
          Visible a toutes les tailles : en mobile, c'etait le seul acces au
          catalogue depuis l'en-tete qui manquait (le lien n'existait qu'en
          pied de page). La marque compacte libere la place necessaire.
        */}
        <nav aria-label={t("nav")} className="sm:ml-6">
          <Link
            href="/produits"
            className="hover:bg-primary-foreground/10 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium whitespace-nowrap transition-colors sm:px-3"
          >
            {t("products")}
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <LocaleSwitcher />
          <CartBadge />
        </div>
      </div>
    </header>
  );
}
