import "server-only";

/**
 * Limiteur de debit en memoire, par fenetre glissante.
 *
 * LIMITE CONNUE : la memoire n'est pas partagee entre instances serverless.
 * Sur Vercel, plusieurs lambdas peuvent tourner en parallele et chacune tiendra
 * son propre compteur. Ce limiteur est donc une defense de second rideau ; la
 * protection principale contre l'abus automatise est Turnstile.
 *
 * Le jour ou cela ne suffit plus, remplacer la Map par Upstash Redis sans
 * toucher a l'appel dans la Server Action.
 */

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 5;

const hits = new Map<string, number[]>();

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const oldest = Math.min(...recent);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((WINDOW_MS - (now - oldest)) / 1000),
    };
  }

  recent.push(now);
  hits.set(key, recent);

  // Empeche la Map de croitre indefiniment sur un serveur de longue duree.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
