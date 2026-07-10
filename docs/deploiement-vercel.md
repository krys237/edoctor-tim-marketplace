# Déploiement Vercel — état provisoire

> **Ce document décrit un déploiement volontairement incomplet**, mis en ligne le
> 10 juillet 2026 pour disposer d'une URL intégrable dans une webview. Il liste ce qui
> fonctionne, ce qui ne fonctionne pas, et l'ordre exact des opérations pour revenir à
> une production correcte.
>
> Voir `docs/commande.md` pour le fonctionnement du tunnel de commande lui-même.

---

## 1. La contrainte qui explique tout le reste

Le compte Resend **n'a aucun domaine authentifié**. Deux conséquences, et elles ne se
contournent pas :

- L'expéditeur ne peut être que `onboarding@resend.dev`.
- Le **seul destinataire accepté est l'adresse email du compte Resend**. Tout autre
  destinataire est rejeté avec un `403`.

C'est pourquoi le compte Resend doit être celui de `contact@edoctor-tim.com` : cette
adresse est à la fois le titulaire du compte et le seul destinataire possible. Et c'est
pourquoi `ORDER_EMAIL_BCC` **doit rester vide** — un BCC compte comme un destinataire et
ferait échouer l'envoi entier, y compris l'email interne.

## 2. Ce qui fonctionne dans cet état

| Élément | État |
|---|---|
| Passage de commande | Oui, si les clés Turnstile sont renseignées (§3) |
| Email interne vers `contact@edoctor-tim.com`, avec le JSON joint | Oui |
| Panier conservé en cas d'échec d'envoi | Oui |
| Page de confirmation et référence de commande | Oui |
| Tarif praticien (code médecin) | Non : `DOCTOR_CODE` vide, aucun code accepté |
| Retrait en agence | Non : `data/pickup-locations.json` est vide, seule la livraison est offerte |

## 3. Turnstile est obligatoire en production

`lib/turnstile.ts` refuse toute commande si `TURNSTILE_SECRET_KEY` est absente et que
`NODE_ENV === "production"`. Sur Vercel, c'est le cas. **Sans clés Turnstile, aucune
commande ne passe**, quelle que soit la configuration Resend.

Créer un widget sur Cloudflare Turnstile (gratuit, aucun accès DNS requis), en déclarant
les domaines du déploiement — l'URL `*.vercel.app` **et** le domaine final. On obtient
une clé de site (publique) et une clé secrète.

Ne jamais désactiver ce refus. Le formulaire déclenche un envoi d'email à chaque
soumission : sans anti-abus, une URL publique devient un relais de spam ouvert, et le
quota Resend — seul transport des commandes — est brûlé en silence.

## 4. Variables à créer dans Vercel

`.env.local` n'est pas déployé. Ces variables se saisissent dans *Settings → Environment
Variables*.

| Variable | Valeur provisoire | Note |
|---|---|---|
| `RESEND_API_KEY` | clé du compte `contact@edoctor-tim.com` | Secret. Jamais `NEXT_PUBLIC_` |
| `ORDER_EMAIL_TO` | `contact@edoctor-tim.com` | Doit être l'email du compte Resend, cf. §1 |
| `ORDER_EMAIL_FROM` | `onboarding@resend.dev` | Seul expéditeur autorisé sans domaine |
| `ORDER_EMAIL_BCC` | *(vide)* | Toute valeur fait échouer l'envoi, cf. §1 |
| `TURNSTILE_SECRET_KEY` | clé secrète Cloudflare | Secret. Sans elle, tout est refusé |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | clé de site Cloudflare | Inlinée au build, cf. ci-dessous |
| `NEXT_PUBLIC_SITE_URL` | l'URL Vercel du déploiement | Inlinée au build. Sert à `metadataBase` |
| `DOCTOR_CODE` | *(vide)* | Vide = aucun code accepté, pas de repli permissif |

**Piège :** les variables préfixées `NEXT_PUBLIC_` sont figées dans le bundle **au moment
du `next build`**, pas lues à l'exécution
(`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`). Les renseigner
*avant* le premier build ; toute modification ultérieure exige un redéploiement pour
prendre effet.

## 5. Ce qui ne fonctionne PAS, et qu'il faut savoir avant toute démonstration

**Le client ne reçoit aucun accusé de réception.** L'accusé part vers
`order.customer.email` (`actions/submit-order.ts:212`), c'est-à-dire l'adresse saisie par
le client. Ce n'est jamais l'adresse du compte Resend, donc Resend le rejette.

L'échec est **silencieux par conception** (`actions/submit-order.ts:218`) : on journalise
et on continue, puisque la commande est déjà parvenue au support. C'est le bon arbitrage,
mais il a une conséquence visible :

> La page de confirmation affiche au client « Un accusé de réception vient de vous être
> envoyé par email ». **C'est faux** tant que le domaine n'est pas authentifié.

Le client voit une promesse que le système ne tient pas. Deux façons de le corriger, par
ordre de préférence :

1. Authentifier le domaine (§6). Le problème disparaît de lui-même.
2. En attendant, ne pas afficher cette phrase — il faut alors remonter le succès de
   l'accusé jusqu'à la page de confirmation, qui ne reçoit aujourd'hui que la référence.

Autres limites, déjà documentées dans `docs/commande.md` §4 :

- **Idempotence et limitation de débit vivent en mémoire de processus**
  (`actions/submit-order.ts:35`). Sur le serverless de Vercel, chaque instance a la sienne.
  Ce sont des réductions de risque, pas des garanties. La protection réelle contre l'abus
  automatisé est Turnstile — d'où le §3.
- **La politique de confidentialité n'existe pas.** La case de consentement du checkout
  la référence pourtant. À rédiger avant toute mise en ligne réelle.

## 6. Process pour corriger la production

À faire dans cet ordre. Les étapes 1 à 4 lèvent d'un coup le §1 et le §5.

1. **Authentifier `edoctor-tim.com` chez Resend** (*Domains → Add domain*). Ajouter les
   enregistrements DNS proposés : DKIM, SPF, et DMARC. Sans DMARC, les commandes partent
   en spam — et le seul transport des commandes est alors perdu en silence.
2. `ORDER_EMAIL_FROM` → `commandes@edoctor-tim.com` (une adresse du domaine authentifié).
3. `ORDER_EMAIL_BCC` → `contact@edoctor-tim.com`. La restriction du §1 est levée.
4. `ORDER_EMAIL_TO` → une **boîte partagée et surveillée**, jamais une adresse nominative
   ni une adresse jetable.
5. **Redéployer.** Sur Vercel, une modification de variable ne prend effet qu'au
   déploiement suivant.
6. **Vérifier le chemin complet** : passer une commande réelle avec une adresse client
   *externe* et confirmer qu'elle reçoit bien l'accusé. C'est la seule preuve que le §5
   est résolu.
7. Puis, hors urgence : renseigner `DOCTOR_CODE`, remplir `data/pickup-locations.json`,
   rédiger la politique de confidentialité, migrer idempotence et limitation de débit
   vers un magasin partagé (Upstash Redis) sans toucher aux appels dans la Server Action.

## 7. Raccourcis pris, à annuler explicitement

| Raccourci | Où | Quand l'annuler |
|---|---|---|
| Expéditeur `onboarding@resend.dev` | `ORDER_EMAIL_FROM` | Étape 2 ci-dessus |
| `ORDER_EMAIL_BCC` vide | variables Vercel | Étape 3 |
| Accusé client jamais délivré | conséquence du §1 | Étape 1, vérifié à l'étape 6 |
| Adresse de test `gatah28371@duvips.com` | ne doit apparaître **nulle part** en prod | Immédiatement |

Aucun raccourci n'a été inscrit dans le code : `lib/turnstile.ts` conserve son refus en
production, et `actions/submit-order.ts` n'a pas été modifié. Tout ce qui précède se
règle par la configuration.

---

*Rédigé le 10 juillet 2026, à l'occasion du déploiement provisoire pour intégration
webview.*
