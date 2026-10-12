import { defineRouting } from "next-intl/routing";

/*
  Configuration du routage multilingue. Source de verite unique : le proxy,
  la navigation et le typage des locales en derivent tous.

  - Francais par defaut, SANS prefixe : les URLs existantes (/produits, /panier)
    ne changent pas, aucun lien externe ni resultat Google n'est casse.
  - Anglais sous /en, avec des chemins traduits (/en/products, /en/cart).
  - Les parametres de requete (categorie, q, tri) et les slugs produits restent
    identiques dans les deux langues : ce sont des identifiants, pas du texte.

  Ajouter une langue : l'ajouter a `locales`, puis a chaque entree de
  `pathnames`, a `messages/` et aux champs localises de `data/products.json`.
  Le typage (global.d.ts) et Zod signalent tout oubli.
*/
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",

  pathnames: {
    "/": "/",
    "/produits": { fr: "/produits", en: "/products" },
    "/produits/[slug]": { fr: "/produits/[slug]", en: "/products/[slug]" },
    "/panier": { fr: "/panier", en: "/cart" },
    "/commande": { fr: "/commande", en: "/checkout" },
    "/commande/confirmation/[reference]": {
      fr: "/commande/confirmation/[reference]",
      en: "/checkout/confirmation/[reference]",
    },
    "/design": "/design",
  },
});

export type Locale = (typeof routing.locales)[number];

/** Code BCP 47 complet, pour Intl et les attributs `lang`/`hreflang`. */
export const INTL_LOCALE: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
};
