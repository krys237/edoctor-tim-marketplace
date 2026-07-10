/*
  Pas de `server-only` ici, volontairement : ce module ne contient aucun secret,
  et l'import de `node:crypto` interdit deja son inclusion dans un bundle client.
  Le garder testable hors de Next a plus de valeur que la barriere.
*/
import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I, O, 0, 1

/**
 * Reference de commande lisible au telephone : CMD-20260709-A3F2.
 *
 * L'alphabet exclut les caracteres ambigus (I/1, O/0) : le support la dictera
 * a des clients, et « CMD-...-1O » se transcrit mal.
 *
 * Ce n'est pas un identifiant secret : la page de confirmation ne divulgue
 * aucune donnee de commande, seulement la reference que le client vient de voir.
 */
export function generateOrderReference(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const bytes = randomBytes(4);
  let suffix = "";
  for (const byte of bytes) suffix += ALPHABET[byte % ALPHABET.length];

  return `CMD-${yyyy}${mm}${dd}-${suffix}`;
}

/** Forme attendue d'une reference, pour valider un parametre d'URL. */
export const ORDER_REFERENCE_PATTERN = /^CMD-\d{8}-[A-Z2-9]{4}$/;

export function isValidOrderReference(value: string): boolean {
  return ORDER_REFERENCE_PATTERN.test(value);
}
