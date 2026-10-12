import type { Messages } from "@/i18n/messages";
import type { routing } from "@/i18n/routing";

/*
  Typage strict de next-intl.

  - `Locale` : seuls "fr" et "en" sont acceptes par useLocale(), Link, etc.
  - `Messages` : les cles de t("...") sont verifiees contre messages/fr.json.
    Une faute de frappe dans une cle est une erreur de compilation, pas un
    texte vide en production.
*/
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: Messages;
  }
}
