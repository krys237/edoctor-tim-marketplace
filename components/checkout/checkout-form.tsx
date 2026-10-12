"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { submitOrder } from "@/actions/submit-order";
import { validatePromo } from "@/actions/validate-promo";
import { useRouter } from "@/i18n/navigation";
import { cartViolations, resolveLines, subtotal } from "@/lib/cart-rules";
import { useCart } from "@/lib/cart-store";
import { formatXaf, promoDiscount } from "@/lib/money";
import type { OrderInput } from "@/lib/order";
import type { PickupLocation } from "@/lib/pickup";
import type { Product } from "@/lib/schemas";

/*
  Indicatif fixe. Le site facture en FCFA et ne livre qu'au Cameroun : afficher
  un selecteur de pays suggererait une couverture qui n'existe pas.
*/
const PHONE_COUNTRY_CODE = "+237";
const PHONE_NATIONAL_DIGITS = 9;

type Translator = ReturnType<typeof useTranslations<"Checkout">>;

/*
  Schema du FORMULAIRE (a plat, pour React Hook Form). Il differe du schema de
  la commande : c'est une commodite d'ergonomie. La validation qui fait foi est
  celle de la Server Action.

  Construit a partir du traducteur : les messages d'erreur suivent la langue
  de la page, et le schema est memorise tant que la langue ne change pas.
*/
function buildFormSchema(t: Translator) {
  return z
    .object({
      fullName: z.string().trim().min(2, t("validation.fullName")),
      email: z.email(t("validation.email")),
      /*
        L'indicatif +237 est fixe dans l'interface : ce champ ne porte que la
        partie nationale. On refuse donc le « + », qui signalerait un indicatif
        saisi deux fois. Un numero camerounais compte 9 chiffres.
      */
      phone: z
        .string()
        .trim()
        .regex(/^[0-9\s().-]+$/, t("validation.phoneFormat"))
        .refine((v) => v.replace(/\D/g, "").length === PHONE_NATIONAL_DIGITS, {
          message: t("validation.phoneLength", { digits: PHONE_NATIONAL_DIGITS }),
        }),
      fulfillmentType: z.enum(["delivery", "pickup"]),
      addressLine1: z.string().trim().optional(),
      addressLine2: z.string().trim().optional(),
      city: z.string().trim().optional(),
      instructions: z.string().trim().max(500).optional(),
      locationId: z.string().trim().optional(),
      companyName: z.string().trim().max(120).optional(),
      taxId: z.string().trim().max(50).optional(),
      doctorCode: z.string().trim().max(64).optional(),
      consent: z.literal(true, t("validation.consent")),
    })
    .superRefine((v, ctx) => {
      if (v.fulfillmentType === "delivery") {
        if (!v.addressLine1 || v.addressLine1.length < 3)
          ctx.addIssue({ code: "custom", path: ["addressLine1"], message: t("validation.addressLine1") });
        if (!v.city || v.city.length < 2)
          ctx.addIssue({ code: "custom", path: ["city"], message: t("validation.city") });
      } else if (!v.locationId) {
        ctx.addIssue({ code: "custom", path: ["locationId"], message: t("validation.locationId") });
      }
    });
}

type FormValues = z.input<ReturnType<typeof buildFormSchema>>;

/*
  `placeholder:text-muted-foreground` n'est pas cosmetique. Sans lui, le
  navigateur applique la couleur du texte a 50% d'opacite, soit #888C93 sur
  blanc : 3.38:1, sous le seuil WCAG de 4.5:1. `--muted-foreground` donne
  7.56:1, tout en restant nettement plus clair que le texte saisi (2.35:1
  entre les deux), donc distinguable.
*/
const inputClass =
  "border-input bg-card placeholder:text-muted-foreground min-h-11 w-full rounded-md border px-3 text-base";
const labelClass = "mb-1.5 block text-sm font-medium";
const errorClass = "text-destructive mt-1 text-xs";

function Required() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  );
}

export function CheckoutForm({
  products,
  pickupLocations,
  turnstileSiteKey,
}: {
  products: Product[];
  pickupLocations: PickupLocation[];
  turnstileSiteKey?: string;
}) {
  const t = useTranslations("Checkout");
  const tCart = useTranslations("Cart");
  const locale = useLocale();
  const router = useRouter();
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const clear = useCart((s) => s.clear);

  const [serverError, setServerError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  /*
    Code promo. Le navigateur ne connait aucun code : il soumet un candidat a
    `validatePromo` et n'obtient qu'un pourcentage. La liste vit dans
    lib/promo.ts, protegee par `server-only`.
  */
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoPending, setPromoPending] = useState(false);

  /*
    Cle d'idempotence generee UNE FOIS a l'ouverture du checkout. Elle rend un
    double-clic ou un reessai inoffensif : le serveur renvoie la meme reference
    au lieu d'envoyer une seconde commande au support.
  */
  const idempotencyKey = useRef<string>("");
  if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();

  /*
    Commande emise : le panier va etre vide, mais ce vide est un succes et non
    un checkout sans objet. Sans ce drapeau, le garde ci-dessous renverrait vers
    /panier et l'utilisateur ne verrait jamais sa reference.
  */
  const orderPlaced = useRef(false);

  const lookup = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return (id: string) => map.get(id);
  }, [products]);

  const { lines } = useMemo(() => resolveLines(items, lookup), [items, lookup]);
  const violations = useMemo(() => cartViolations(lines), [lines]);
  const total = subtotal(lines);

  const formSchema = useMemo(() => buildFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur", // valider a la sortie du champ, pas a chaque frappe
    defaultValues: { fulfillmentType: "delivery" },
  });

  const fulfillmentType = watch("fulfillmentType");
  const pickupPossible = pickupLocations.length > 0;

  /*
    Exclusivite promo / code medecin.

    La regle porte sur la PRESENCE d'un code medecin, jamais sur sa validite :
    le navigateur ignore le secret et ne pourrait pas evaluer la validite. La
    Server Action applique exactement la meme regle, si bien que le
    recapitulatif ne peut pas promettre une remise qu'elle refuserait.
  */
  const doctorCodeTyped = (watch("doctorCode") ?? "").trim();
  const promoBlocked = doctorCodeTyped.length > 0;

  const discount = appliedPromo ? promoDiscount(total, appliedPromo.percent) : 0;
  const netTotal = total - discount;

  // Panier vide ou invalide : le checkout n'a pas lieu d'etre.
  useEffect(() => {
    if (orderPlaced.current) return;
    if (hydrated && lines.length === 0) router.replace("/panier");
  }, [hydrated, lines.length, router]);

  // Un code medecin saisi retire la promo affichee, plutot que de la laisser
  // mentir jusqu'a ce que la Server Action refuse la commande.
  useEffect(() => {
    if (promoBlocked) {
      setAppliedPromo(null);
      setPromoError(null);
    }
  }, [promoBlocked]);

  async function onApplyPromo() {
    setPromoError(null);
    setPromoPending(true);
    const result = await validatePromo(promoInput);
    setPromoPending(false);

    if (!result.ok) {
      setAppliedPromo(null);
      setPromoError(result.error);
      return;
    }
    setAppliedPromo({ code: result.code, percent: result.percent });
  }

  function onRemovePromo() {
    setAppliedPromo(null);
    setPromoError(null);
    setPromoInput("");
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const payload: OrderInput = {
      idempotencyKey: idempotencyKey.current,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      customer: {
        fullName: values.fullName,
        email: values.email,
        // Le champ ne porte que la partie nationale : on reconstitue le numero complet.
        phone: `${PHONE_COUNTRY_CODE} ${values.phone.trim()}`,
      },
      business: values.companyName
        ? { companyName: values.companyName, taxId: values.taxId ?? "" }
        : undefined,
      fulfillment:
        values.fulfillmentType === "delivery"
          ? {
              type: "delivery",
              addressLine1: values.addressLine1 ?? "",
              addressLine2: values.addressLine2 ?? "",
              city: values.city ?? "",
              instructions: values.instructions ?? "",
            }
          : { type: "pickup", locationId: values.locationId ?? "" },
      doctorCode: values.doctorCode ?? "",
      // Le code retenu par le serveur, pas la saisie brute : on n'envoie jamais
      // un code que `validatePromo` n'a pas deja reconnu.
      promoCode: appliedPromo?.code ?? "",
      consent: true,
      turnstileToken,
    };

    const result = await submitOrder(payload);

    if (!result.ok) {
      setServerError(result.error);
      return; // le panier N'EST PAS vide : l'utilisateur peut reessayer
    }

    // Le panier n'est vide qu'apres confirmation que l'email est parti.
    orderPlaced.current = true;
    clear();
    router.replace({
      pathname: "/commande/confirmation/[reference]",
      params: { reference: result.reference },
    });
  }

  if (!hydrated) {
    return (
      <div className="mt-8" aria-busy="true">
        <span className="sr-only">{t("loading")}</span>
        <div className="bg-secondary h-64 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (violations.length > 0) {
    return (
      <div role="alert" className="border-destructive bg-destructive/10 mt-8 rounded-md border-l-4 p-4">
        <p className="text-sm font-semibold">{t("incompleteTitle")}</p>
        <p className="mt-1 text-sm">
          {tCart("violations.requiresConsumable", { name: violations[0].productName })}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]"
    >
      <div className="space-y-8">
        <section>
          <h2 className="text-xl">{t("contact.title")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="fullName" className={labelClass}>
                {t("contact.fullName")} <Required />
              </label>
              {/*
                Les placeholders donnent un EXEMPLE de format attendu. Ils ne
                repetent jamais le libelle : un placeholder disparait des la
                premiere frappe, il ne peut donc pas tenir lieu d'etiquette.
              */}
              <input
                id="fullName"
                autoComplete="name"
                placeholder={t("contact.fullNamePlaceholder")}
                className={inputClass}
                {...register("fullName")}
              />
              {errors.fullName && <p className={errorClass} role="alert">{errors.fullName.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                {t("contact.email")} <Required />
              </label>
              {/* type=email declenche le bon clavier sur mobile */}
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t("contact.emailPlaceholder")}
                className={inputClass}
                {...register("email")}
              />
              {errors.email && <p className={errorClass} role="alert">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>
                {t("contact.phone")} <Required />
              </label>
              <div className="flex">
                {/*
                  L'indicatif est annonce via aria-describedby : sans cela, un
                  lecteur d'ecran dicte « Telephone » sans le +237 affiche a
                  l'ecran, et l'utilisateur le saisit une seconde fois.
                */}
                <span
                  id="phone-prefix"
                  className="border-input bg-secondary text-muted-foreground flex min-h-11 items-center rounded-l-md border border-r-0 px-3 text-base select-none"
                >
                  {PHONE_COUNTRY_CODE}
                </span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  // `tel-national` et non `tel` : l'indicatif ne fait pas partie du champ.
                  autoComplete="tel-national"
                  placeholder={t("contact.phonePlaceholder")}
                  aria-describedby="phone-prefix"
                  className={`${inputClass} min-w-0 flex-1 rounded-l-none`}
                  {...register("phone")}
                />
              </div>
              {errors.phone && <p className={errorClass} role="alert">{errors.phone.message}</p>}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl">{t("fulfillment.title")}</h2>
          <fieldset className="mt-4">
            <legend className="sr-only">{t("fulfillment.legend")}</legend>
            <div className="flex flex-wrap gap-3">
              <label className="border-input hover:bg-secondary flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm">
                <input type="radio" value="delivery" {...register("fulfillmentType")} />
                {t("fulfillment.delivery")}
              </label>
              <label
                className={`border-input flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm ${
                  pickupPossible ? "hover:bg-secondary cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
              >
                <input type="radio" value="pickup" disabled={!pickupPossible} {...register("fulfillmentType")} />
                {t("fulfillment.pickup")}
              </label>
            </div>
            {!pickupPossible && (
              <p className="text-muted-foreground mt-2 text-xs">{t("fulfillment.pickupUnavailable")}</p>
            )}
          </fieldset>

          {fulfillmentType === "delivery" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="addressLine1" className={labelClass}>
                  {t("fulfillment.addressLine1")} <Required />
                </label>
                <input
                  id="addressLine1"
                  autoComplete="address-line1"
                  placeholder={t("fulfillment.addressLine1Placeholder")}
                  className={inputClass}
                  {...register("addressLine1")}
                />
                {errors.addressLine1 && <p className={errorClass} role="alert">{errors.addressLine1.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="addressLine2" className={labelClass}>
                  {t("fulfillment.addressLine2")}
                </label>
                <input
                  id="addressLine2"
                  autoComplete="address-line2"
                  placeholder={t("fulfillment.addressLine2Placeholder")}
                  className={inputClass}
                  {...register("addressLine2")}
                />
              </div>
              <div>
                <label htmlFor="city" className={labelClass}>
                  {t("fulfillment.city")} <Required />
                </label>
                <input
                  id="city"
                  autoComplete="address-level2"
                  placeholder={t("fulfillment.cityPlaceholder")}
                  className={inputClass}
                  {...register("city")}
                />
                {errors.city && <p className={errorClass} role="alert">{errors.city.message}</p>}
              </div>
              <div className="sm:col-span-2">
                {/*
                  Libelle restreint aux instructions de LIVRAISON, et non
                  « Commentaire » : un champ libre generique invite le client a
                  decrire son etat de sante, donnee sensible qui n'a rien a
                  faire dans un email.
                */}
                <label htmlFor="instructions" className={labelClass}>
                  {t("fulfillment.instructions")}
                </label>
                <textarea
                  id="instructions"
                  rows={3}
                  maxLength={500}
                  placeholder={t("fulfillment.instructionsPlaceholder")}
                  className={`${inputClass} min-h-24 py-2`}
                  {...register("instructions")}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <label htmlFor="locationId" className={labelClass}>
                {t("fulfillment.location")} <Required />
              </label>
              <select id="locationId" className={inputClass} {...register("locationId")}>
                <option value="">{t("fulfillment.locationPlaceholder")}</option>
                {pickupLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} — {l.address}, {l.city}
                  </option>
                ))}
              </select>
              {errors.locationId && <p className={errorClass} role="alert">{errors.locationId.message}</p>}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl">{t("business.title")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t("business.intro")}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="companyName" className={labelClass}>{t("business.companyName")}</label>
              <input
                id="companyName"
                autoComplete="organization"
                placeholder={t("business.companyNamePlaceholder")}
                className={inputClass}
                {...register("companyName")}
              />
            </div>
            <div>
              <label htmlFor="taxId" className={labelClass}>{t("business.taxId")}</label>
              <input
                id="taxId"
                placeholder={t("business.taxIdPlaceholder")}
                className={inputClass}
                {...register("taxId")}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl">{t("doctorCode.title")}</h2>
          <div className="mt-4 max-w-sm">
            <label htmlFor="doctorCode" className={labelClass}>{t("doctorCode.label")}</label>
            <input
              id="doctorCode"
              autoComplete="off"
              placeholder={t("doctorCode.placeholder")}
              className={inputClass}
              {...register("doctorCode")}
            />
            <p className="text-muted-foreground mt-1.5 text-xs">{t("doctorCode.hint")}</p>
          </div>
        </section>
      </div>

      <aside className="bg-card h-fit rounded-lg border p-5">
        <h2 className="text-lg">{t("summary.title")}</h2>

        <ul className="mt-4 space-y-2">
          {lines.map((l) => (
            <li key={l.product.id} className="flex justify-between gap-3 text-sm">
              <span>{t("summary.line", { quantity: l.quantity, name: l.product.name })}</span>
              <span className="tabular-price shrink-0 font-semibold">
                {formatXaf(l.lineTotal, locale)}
              </span>
            </li>
          ))}
        </ul>

        <section className="mt-4 border-t pt-4">
          <h3 className="text-sm font-medium">{t("promo.title")}</h3>

          {promoBlocked ? (
            <p className="text-muted-foreground mt-1.5 text-xs">{t("promo.blocked")}</p>
          ) : appliedPromo ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-success text-sm font-semibold">
                {t("promo.applied", { code: appliedPromo.code, percent: appliedPromo.percent })}
              </p>
              <button
                type="button"
                onClick={onRemovePromo}
                className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline"
              >
                {t("promo.remove")}
              </button>
            </div>
          ) : (
            <>
              <div className="mt-2 flex gap-2">
                <label htmlFor="promoCode" className="sr-only">
                  {t("promo.label")}
                </label>
                <input
                  id="promoCode"
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder={t("promo.placeholder")}
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className={`${inputClass} min-w-0 flex-1`}
                />
                {/*
                  `type="button"` : sans cela, ce bouton soumettrait la commande,
                  puisqu'il vit a l'interieur du <form>.
                */}
                <button
                  type="button"
                  onClick={onApplyPromo}
                  disabled={promoPending || promoInput.trim().length === 0}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 min-h-11 shrink-0 cursor-pointer rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {promoPending ? t("promo.checking") : t("promo.apply")}
                </button>
              </div>
              {promoError && (
                <p className={errorClass} role="alert">
                  {promoError}
                </p>
              )}
            </>
          )}
        </section>

        <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("summary.subtotal")}</dt>
            <dd className="tabular-price font-semibold">{formatXaf(total, locale)}</dd>
          </div>

          {appliedPromo && (
            <>
              <div className="text-success flex justify-between">
                <dt>{t("summary.promoLine", { code: appliedPromo.code, percent: appliedPromo.percent })}</dt>
                <dd className="tabular-price font-semibold">−{formatXaf(discount, locale)}</dd>
              </div>
              {/*
                Toujours « sous-total » et jamais « total » : les frais de
                livraison restent inconnus, et un « total » creerait une attente
                de prix ferme. Voir lib/money.ts.
              */}
              <div className="flex justify-between border-t pt-2">
                <dt className="text-muted-foreground">{t("summary.netSubtotal")}</dt>
                <dd className="tabular-price font-semibold">{formatXaf(netTotal, locale)}</dd>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("summary.shipping")}</dt>
            <dd className="text-right text-xs">{t("summary.shippingValue")}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <label className="flex cursor-pointer items-start gap-2 text-xs">
            {/* Case NON pre-cochee : un consentement pre-coche n'en est pas un. */}
            <input type="checkbox" className="mt-0.5 size-4" {...register("consent")} />
            <span>{t("consent")}</span>
          </label>
          {errors.consent && <p className={errorClass} role="alert">{errors.consent.message}</p>}
        </div>

        {turnstileSiteKey && (
          <div className="mt-4">
            <Turnstile
              siteKey={turnstileSiteKey}
              onSuccess={setTurnstileToken}
              options={{ size: "flexible", language: locale }}
            />
          </div>
        )}

        {serverError && (
          <p role="alert" className="border-destructive bg-destructive/10 mt-4 rounded-md border-l-4 p-3 text-sm">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 min-h-11 w-full cursor-pointer rounded-md text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </button>

        <p className="text-muted-foreground mt-3 text-xs">{t("noPayment")}</p>
      </aside>
    </form>
  );
}
