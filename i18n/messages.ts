import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import type { Locale } from "@/i18n/routing";

/*
  Les deux catalogues de messages sont importes statiquement : ils pesent
  quelques kilo-octets et ce module est aussi utilise hors de Next (scripts
  de verification, rendu des emails), ou un import dynamique n'apporte rien.

  `fr` est la REFERENCE : le typage de `global.d.ts` est derive de lui, et
  `en` doit en reproduire la structure (verifie par `npm run check:messages`).
*/
export type Messages = typeof fr;

const MESSAGES: Record<Locale, Messages> = { fr, en };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}
