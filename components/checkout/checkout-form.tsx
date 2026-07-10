"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { submitOrder } from "@/actions/submit-order";
import { validatePromo } from "@/actions/validate-promo";
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

/*
  Schema du FORMULAIRE (a plat, pour React Hook Form). Il differe du schema de
  la commande : c'est une commodite d'ergonomie. La validation qui fait foi est
  celle de la Server Action.
*/
const FormSchema = z
  .object({
    fullName: z.string().trim().min(2, "Indiquez votre nom complet."),
    email: z.email("Adresse email invalide."),
    /*
      L'indicatif +237 est fixe dans l'interface : ce champ ne porte que la
      partie nationale. On refuse donc le « + », qui signalerait un indicatif
      saisi deux fois. Un numero camerounais compte 9 chiffres.
    */
    phone: z
      .string()
      .trim()
      .regex(/^[0-9\s().-]+$/, "Numéro de téléphone invalide.")
      .refine((v) => v.replace(/\D/g, "").length === PHONE_NATIONAL_DIGITS, {
        message: `Un numéro camerounais compte ${PHONE_NATIONAL_DIGITS} chiffres.`,
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
    consent: z.literal(true, "Vous devez accepter la politique de confidentialité."),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillmentType === "delivery") {
      if (!v.addressLine1 || v.addressLine1.length < 3)
        ctx.addIssue({ code: "custom", path: ["addressLine1"], message: "Adresse requise." });
      if (!v.city || v.city.length < 2)
        ctx.addIssue({ code: "custom", path: ["city"], message: "Ville ou quartier requis." });
    } else if (!v.locationId) {
      ctx.addIssue({ code: "custom", path: ["locationId"], message: "Choisissez un point de retrait." });
    }
  });

type FormValues = z.input<typeof FormSchema>;

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

export function CheckoutForm({
  products,
  pickupLocations,
  turnstileSiteKey,
}: {
  products: Product[];
  pickupLocations: PickupLocation[];
  turnstileSiteKey?: string;
}) {
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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
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
    router.replace(`/commande/confirmation/${result.reference}`);
  }

  if (!hydrated) {
    return (
      <div className="mt-8" aria-busy="true">
        <span className="sr-only">Chargement…</span>
        <div className="bg-secondary h-64 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (violations.length > 0) {
    return (
      <div role="alert" className="border-destructive bg-destructive/10 mt-8 rounded-md border-l-4 p-4">
        <p className="text-sm font-semibold">Commande incomplète</p>
        <p className="mt-1 text-sm">{violations[0].message}</p>
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
          <h2 className="text-xl">Vos coordonnées</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="fullName" className={labelClass}>
                Nom complet <span aria-hidden className="text-destructive">*</span>
              </label>
              {/*
                Les placeholders donnent un EXEMPLE de format attendu. Ils ne
                repetent jamais le libelle : un placeholder disparait des la
                premiere frappe, il ne peut donc pas tenir lieu d'etiquette.
              */}
              <input
                id="fullName"
                autoComplete="name"
                placeholder="Marie Ngo Bassong"
                className={inputClass}
                {...register("fullName")}
              />
              {errors.fullName && <p className={errorClass} role="alert">{errors.fullName.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email <span aria-hidden className="text-destructive">*</span>
              </label>
              {/* type=email declenche le bon clavier sur mobile */}
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="marie.bassong@exemple.cm"
                className={inputClass}
                {...register("email")}
              />
              {errors.email && <p className={errorClass} role="alert">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>
                Téléphone <span aria-hidden className="text-destructive">*</span>
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
                  placeholder="6 99 00 11 22"
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
          <h2 className="text-xl">Mode de réception</h2>
          <fieldset className="mt-4">
            <legend className="sr-only">Choisissez un mode de réception</legend>
            <div className="flex flex-wrap gap-3">
              <label className="border-input hover:bg-secondary flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm">
                <input type="radio" value="delivery" {...register("fulfillmentType")} />
                Livraison
              </label>
              <label
                className={`border-input flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm ${
                  pickupPossible ? "hover:bg-secondary cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
              >
                <input type="radio" value="pickup" disabled={!pickupPossible} {...register("fulfillmentType")} />
                Retrait en agence
              </label>
            </div>
            {!pickupPossible && (
              <p className="text-muted-foreground mt-2 text-xs">
                Le retrait en agence n&apos;est pas encore disponible en ligne.
                Contactez notre support si vous souhaitez retirer votre commande.
              </p>
            )}
          </fieldset>

          {fulfillmentType === "delivery" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="addressLine1" className={labelClass}>
                  Adresse <span aria-hidden className="text-destructive">*</span>
                </label>
                <input
                  id="addressLine1"
                  autoComplete="address-line1"
                  placeholder="Rue 1.234, Bonapriso"
                  className={inputClass}
                  {...register("addressLine1")}
                />
                {errors.addressLine1 && <p className={errorClass} role="alert">{errors.addressLine1.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="addressLine2" className={labelClass}>
                  Complément d&apos;adresse
                </label>
                <input
                  id="addressLine2"
                  autoComplete="address-line2"
                  placeholder="Immeuble Les Palmiers, 2e étage"
                  className={inputClass}
                  {...register("addressLine2")}
                />
              </div>
              <div>
                <label htmlFor="city" className={labelClass}>
                  Ville ou quartier <span aria-hidden className="text-destructive">*</span>
                </label>
                <input
                  id="city"
                  autoComplete="address-level2"
                  placeholder="Douala"
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
                  Instructions de livraison (étage, repère, horaires)
                </label>
                <textarea
                  id="instructions"
                  rows={3}
                  maxLength={500}
                  placeholder="Portail bleu en face de la pharmacie, appeler en arrivant"
                  className={`${inputClass} min-h-24 py-2`}
                  {...register("instructions")}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <label htmlFor="locationId" className={labelClass}>
                Point de retrait <span aria-hidden className="text-destructive">*</span>
              </label>
              <select id="locationId" className={inputClass} {...register("locationId")}>
                <option value="">Choisissez…</option>
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
          <h2 className="text-xl">Structure de santé (facultatif)</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Renseignez ces champs si vous commandez au nom d&apos;une clinique, d&apos;une
            pharmacie ou d&apos;un laboratoire.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="companyName" className={labelClass}>Raison sociale</label>
              <input
                id="companyName"
                autoComplete="organization"
                placeholder="Clinique de la Cité"
                className={inputClass}
                {...register("companyName")}
              />
            </div>
            <div>
              <label htmlFor="taxId" className={labelClass}>Numéro d&apos;identifiant fiscal</label>
              <input
                id="taxId"
                placeholder="Tel qu'il figure sur votre attestation"
                className={inputClass}
                {...register("taxId")}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl">Code médecin (facultatif)</h2>
          <div className="mt-4 max-w-sm">
            <label htmlFor="doctorCode" className={labelClass}>Votre code</label>
            <input
              id="doctorCode"
              autoComplete="off"
              placeholder="Code remis par eDoctor"
              className={inputClass}
              {...register("doctorCode")}
            />
            <p className="text-muted-foreground mt-1.5 text-xs">
              Si votre code est valide, le tarif praticien est appliqué à la
              confirmation de votre commande.
            </p>
          </div>
        </section>
      </div>

      <aside className="bg-card h-fit rounded-lg border p-5">
        <h2 className="text-lg">Récapitulatif</h2>

        <ul className="mt-4 space-y-2">
          {lines.map((l) => (
            <li key={l.product.id} className="flex justify-between gap-3 text-sm">
              <span>
                {l.quantity} × {l.product.name}
              </span>
              <span className="tabular-price shrink-0 font-semibold">{formatXaf(l.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <section className="mt-4 border-t pt-4">
          <h3 className="text-sm font-medium">Code promo</h3>

          {promoBlocked ? (
            <p className="text-muted-foreground mt-1.5 text-xs">
              Un code médecin est saisi. Le tarif praticien et un code promo ne se
              cumulent pas : videz le champ « Code médecin » pour utiliser un code promo.
            </p>
          ) : appliedPromo ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-success text-sm font-semibold">
                {appliedPromo.code} appliqué (−{appliedPromo.percent} %)
              </p>
              <button
                type="button"
                onClick={onRemovePromo}
                className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline"
              >
                Retirer
              </button>
            </div>
          ) : (
            <>
              <div className="mt-2 flex gap-2">
                <label htmlFor="promoCode" className="sr-only">
                  Votre code promo
                </label>
                <input
                  id="promoCode"
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder="Votre code"
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
                  {promoPending ? "Vérification…" : "Appliquer"}
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
            <dt className="text-muted-foreground">Sous-total</dt>
            <dd className="tabular-price font-semibold">{formatXaf(total)}</dd>
          </div>

          {appliedPromo && (
            <>
              <div className="text-success flex justify-between">
                <dt>
                  Code {appliedPromo.code} (−{appliedPromo.percent} %)
                </dt>
                <dd className="tabular-price font-semibold">−{formatXaf(discount)}</dd>
              </div>
              {/*
                Toujours « sous-total » et jamais « total » : les frais de
                livraison restent inconnus, et un « total » creerait une attente
                de prix ferme. Voir lib/money.ts.
              */}
              <div className="flex justify-between border-t pt-2">
                <dt className="text-muted-foreground">Sous-total après remise</dt>
                <dd className="tabular-price font-semibold">{formatXaf(netTotal)}</dd>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <dt className="text-muted-foreground">Livraison</dt>
            <dd className="text-right text-xs">Communiquée à la confirmation</dd>
          </div>
        </dl>

        <div className="mt-5">
          <label className="flex cursor-pointer items-start gap-2 text-xs">
            {/* Case NON pre-cochee : un consentement pre-coche n'en est pas un. */}
            <input type="checkbox" className="mt-0.5 size-4" {...register("consent")} />
            <span>
              J&apos;accepte que mes données soient utilisées pour traiter cette commande,
              conformément à la politique de confidentialité.
            </span>
          </label>
          {errors.consent && <p className={errorClass} role="alert">{errors.consent.message}</p>}
        </div>

        {turnstileSiteKey && (
          <div className="mt-4">
            <Turnstile siteKey={turnstileSiteKey} onSuccess={setTurnstileToken} options={{ size: "flexible" }} />
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
          {isSubmitting ? "Envoi en cours…" : "Envoyer ma commande"}
        </button>

        <p className="text-muted-foreground mt-3 text-xs">
          Aucun paiement n&apos;est encaissé en ligne. Notre équipe vous recontacte sous
          24 à 48 h ouvrées.
        </p>
      </aside>
    </form>
  );
}
