import type { Metadata } from "next";

import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Href = Parameters<typeof getPathname>[0]["href"];

/**
 * Balises `hreflang` d'une page : son URL dans chaque langue, plus
 * `x-default` vers la version francaise.
 *
 * Sans elles, Google peut indexer /en/products comme un doublon de /produits,
 * ou servir la mauvaise langue. Les chemins traduits viennent du routage :
 * ils ne sont jamais ecrits a la main ici.
 *
 * Les pages privees (panier, commande) sont `noindex` et n'en ont pas besoin.
 */
export function alternates(href: Href): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = getPathname({ href, locale });
  }
  languages["x-default"] = getPathname({ href, locale: routing.defaultLocale });
  return { languages };
}
