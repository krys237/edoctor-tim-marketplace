import "server-only";

/**
 * Comparaison a temps constant.
 *
 * Un `===` sur une chaine s'arrete au premier caractere different : le temps de
 * reponse laisse alors fuir la longueur du prefixe correct, et un code se
 * devine caractere par caractere. Ici, toutes les positions sont toujours
 * comparees.
 *
 * `server-only` : cette fonction ne garde un secret que du cote ou le secret
 * existe. La faire tourner dans le navigateur n'aurait aucun sens.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
