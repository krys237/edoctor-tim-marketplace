import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

/*
  Proxy (ex-middleware, renomme par Next 16). Il s'execute avant le rendu :

  1. Une URL sans prefixe (/produits) est servie en francais, sans redirection.
  2. /en/products est reecrit vers app/[locale]/produits/page.tsx avec locale=en.
  3. Au premier acces sur « / », la langue du navigateur (Accept-Language) peut
     rediriger vers /en. Le choix est ensuite memorise dans le cookie NEXT_LOCALE,
     que le selecteur de langue met a jour.
  4. Un en-tete `Link` rel=alternate est ajoute pour les moteurs de recherche.
*/
export default createMiddleware(routing);

export const config = {
  /*
    Tout, sauf : les routes internes de Next, les fichiers statiques (tout chemin
    contenant un point : images, polices, favicon) et les actions serveur, qui
    passent par la page elle-meme.
  */
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
