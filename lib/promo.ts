import "server-only";

import { safeEqual } from "@/lib/constant-time";

/*
  CODES PROMO.

  L'import de `server-only` en tete de fichier fait echouer le build si ce
  module est atteint depuis un composant client. C'est la garantie que la liste
  ci-dessous ne part jamais dans le bundle du navigateur : sinon n'importe qui
  l'ouvrirait dans les outils de developpement et s'appliquerait -40 %.

  Le navigateur ne connait qu'un pourcentage, renvoye par `validatePromo()`
  apres verification serveur. Il ne connait jamais les codes.

  LIMITES CONNUES, a lever le jour ou une base de donnees existe :
  - Ces codes sont statiques : ni date d'expiration, ni nombre d'utilisations,
    ni rattachement a un client. Un code diffuse reste valable indefiniment.
  - `validatePromo()` est un point d'entree public : on peut lui soumettre des
    candidats. Quatre codes courts se devinent. Le limiteur de debit par IP
    ralentit l'essai en force, il ne l'interdit pas.
*/

export type Promo = { code: string; percent: number };

const PROMOS: readonly Promo[] = [
  { code: "EDOC10", percent: 10 },
  { code: "EDOC20", percent: 20 },
  { code: "EDOC30", percent: 30 },
  { code: "EDOC40", percent: 40 },
];

/**
 * Le code correspondant, ou `null`. Jamais de repli permissif.
 *
 * La boucle ne s'interrompt pas au premier succes : sortir tot revelerait par
 * le temps de reponse a quel rang de la liste le code a ete trouve.
 */
export function findPromo(candidate: string): Promo | null {
  const normalized = candidate.trim().toUpperCase();
  if (!normalized) return null;

  let found: Promo | null = null;
  for (const promo of PROMOS) {
    if (safeEqual(normalized, promo.code)) found = promo;
  }
  return found;
}
