import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { getMessages } from "@/i18n/messages";
import { routing } from "@/i18n/routing";

/*
  Configuration par requete, lue par next-intl pour les Server Components et
  les Server Actions. La locale vient du segment [locale] (pose par le proxy).

  Une valeur inconnue (ex. /unknown.txt tombe dans [locale]) retombe sur le
  francais : le layout se charge ensuite de renvoyer un 404 propre.
*/
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: getMessages(locale),
    timeZone: "Africa/Douala",
  };
});
