import { createTranslator } from "next-intl";

import { getMessages } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";

/*
  Traducteurs utilisables HORS du cycle de requete Next : rendu des emails
  (react-email rend hors de l'arbre React de la page) et scripts de
  verification lances avec tsx. Memes messages, meme syntaxe ICU que
  `useTranslations` / `getTranslations`.
*/

export function emailTranslator(locale: Locale) {
  return createTranslator({
    locale,
    messages: getMessages(locale),
    namespace: "EmailReceipt",
  });
}

export function errorsTranslator(locale: Locale) {
  return createTranslator({
    locale,
    messages: getMessages(locale),
    namespace: "Errors",
  });
}
