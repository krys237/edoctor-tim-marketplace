import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Turnstile est-il configure ? Le formulaire n'affiche le widget que si oui. */
export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verifie le jeton aupres de Cloudflare.
 *
 * Politique d'echec :
 *  - En PRODUCTION, une cle absente fait ECHOUER la verification. Un formulaire
 *    qui declenche des emails ne doit jamais tourner sans protection anti-abus.
 *  - En developpement, l'absence de cle laisse passer, avec un avertissement
 *    serveur : sans cela, aucun test local ne serait possible.
 *
 * Une erreur reseau vers Cloudflare fait echouer la verification (fail closed).
 */
export async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[turnstile] TURNSTILE_SECRET_KEY absent en production : commande refusée.");
      return false;
    }
    console.warn("[turnstile] Aucune clé configurée : vérification ignorée (développement).");
    return true;
  }

  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });

    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("[turnstile] Vérification impossible :", error);
    return false; // fail closed
  }
}
