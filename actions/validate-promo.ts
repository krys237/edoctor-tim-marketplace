"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { findPromo } from "@/lib/promo";
import { checkRateLimit } from "@/lib/rate-limit";
import { errorsTranslator } from "@/lib/translator";

/*
  Verification d'un code promo, sans jamais reveler la liste.

  Une Server Action est un endpoint POST public : on peut lui soumettre des
  candidats sans passer par l'interface. D'ou la validation de forme, la
  limitation de debit, et un retour reduit au strict minimum — un pourcentage,
  pas la table des codes.

  Le compteur porte un prefixe distinct de celui des commandes : essayer un
  code promo ne doit pas consommer le droit d'en passer une.
*/

const CandidateSchema = z.string().trim().min(1).max(64);

export type ValidatePromoResult =
  | { ok: true; code: string; percent: number }
  | { ok: false; error: string };

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnu";
}

export async function validatePromo(raw: unknown): Promise<ValidatePromoResult> {
  // Langue de la page appelante, posee par le proxy : les erreurs la suivent.
  const t = errorsTranslator(await getLocale());

  const parsed = CandidateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: t("promoRequired") };
  }

  const ip = await clientIp();
  const limit = checkRateLimit(`promo:${ip}`);
  if (!limit.allowed) {
    return {
      ok: false,
      error: t("tooManyAttempts", { minutes: Math.ceil(limit.retryAfterSeconds / 60) }),
    };
  }

  const promo = findPromo(parsed.data);
  if (!promo) {
    return { ok: false, error: t("promoInvalid") };
  }

  return { ok: true, code: promo.code, percent: promo.percent };
}
