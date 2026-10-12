# Internationalisation (i18n)

Le site est bilingue : **français** (langue par défaut) et **anglais**. Ce document
décrit l'architecture retenue, où vivent les textes, et comment ajouter une langue.

Décisions prises le 12 octobre 2026 :

- Le français garde ses URLs actuelles, sans préfixe (`/produits`, `/panier`).
  Aucun lien externe ni résultat de recherche n'est cassé.
- L'anglais vit sous `/en`, avec des chemins traduits (`/en/products`, `/en/cart`,
  `/en/checkout`).
- La langue du navigateur (`Accept-Language`) est détectée au premier accès sur `/`
  et peut rediriger vers `/en`. Le choix est ensuite mémorisé dans le cookie
  `NEXT_LOCALE`, mis à jour par le sélecteur de langue.
- Les traductions anglaises ont été rédigées par l'équipe de développement et
  **doivent être validées par un spécialiste** avant mise en production, en
  particulier les mentions réglementaires (dispositifs médicaux), qui ont une portée
  juridique.

## 1. Bibliothèque

[`next-intl`](https://next-intl.dev) v4. Elle fournit le routage par segment
`[locale]`, les chemins traduits, les liens `hreflang`, les messages ICU (pluriels,
arguments) et un typage strict des clés. Le fichier `proxy.ts` (ex-middleware de
Next 16) lui est délégué.

## 2. Fichiers

```
i18n/
  routing.ts      locales, locale par défaut, chemins traduits  <- SOURCE DE VÉRITÉ
  navigation.ts   Link, useRouter, redirect, getPathname conscients de la locale
  request.ts      configuration par requête (messages, fuseau)
  messages.ts     import statique de messages/*.json, type Messages
messages/
  fr.json         référence : le typage des clés en dérive
  en.json         doit avoir exactement les mêmes clés (npm run check:messages)
proxy.ts          détection de langue, réécriture /en/products -> [locale]/produits
global.d.ts       typage next-intl : Locale et Messages
lib/alternates.ts balises hreflang d'une page (metadata.alternates.languages)
lib/translator.ts traducteurs utilisables hors requête (emails, scripts)
app/[locale]/     toutes les pages ; app/fonts, globals.css et icônes restent à la racine
```

## 3. Règles d'écriture

**Toujours importer `Link`, `useRouter`, `redirect` depuis `@/i18n/navigation`**,
jamais depuis `next/link` ou `next/navigation`. Un `href` est un chemin *interne*
(`"/produits"`, `{ pathname: "/produits/[slug]", params: { slug } }`) ; la
traduction du chemin et le préfixe de langue sont ajoutés automatiquement.

**Aucun texte en dur dans un composant.** Server Components : `getTranslations`
(async) ou `useTranslations` (sync). Client Components : `useTranslations`. Les clés
sont typées : une faute de frappe est une erreur de compilation.

**Chaque page appelle `setRequestLocale(locale)`** avant toute API next-intl.
Sans cet appel, la page bascule en rendu dynamique et perd le prérendu statique.

**Les pluriels passent par ICU**, jamais par un `s` conditionnel :
`"{count, plural, one {# produit} other {# produits}}"`.

**Les montants passent par `formatXaf(amount, locale)`** : « 19 800 FCFA » en
français, « 19,800 FCFA » en anglais. Côté client, la locale vient de `useLocale()`.

## 4. Ce qui est traduit, et où

| Contenu | Emplacement | Mécanisme |
|---|---|---|
| Interface (pages, header, footer, panier, formulaire) | `messages/*.json` | `useTranslations` / `getTranslations` |
| Métadonnées (`<title>`, description) | `messages/*.json`, espace `Metadata` | `generateMetadata` + `alternates()` |
| Catalogue (nom, descriptions, alt, specs) | `data/products.json`, champs `{ fr, en }` | `lib/catalog.ts` résout dans une langue |
| Libellés de catégorie et de disponibilité | `messages/*.json`, espace `Catalog` | clés dynamiques `categories.<id>` |
| Erreurs des Server Actions | `messages/*.json`, espace `Errors` | `errorsTranslator(await getLocale())` |
| Messages de validation du formulaire | `messages/*.json`, espace `Checkout.validation` | schéma Zod construit avec `t` |
| Accusé de réception client | `messages/*.json`, espace `EmailReceipt` | `emailTranslator(order.locale)` |

## 5. Ce qui n'est PAS traduit, volontairement

- **Identifiants** : slugs produits (`/produits/tensiometre-connecte` est le même
  en anglais), SKU, références de commande, codes promo, clés du panier en
  `localStorage`.
- **Paramètres de requête** `categorie`, `q`, `tri` et leurs valeurs
  (`prix-asc`…). Ce sont des identifiants, pas du texte.
- **L'email interne au support** : il reste en français, mais indique la langue du
  client (« Langue : anglais ») pour que le rappel se fasse dans sa langue.
- **La page `/design`** : référence de style interne.
- **Le nom de marque** « e-Doctor TIM Marketplace » et la mention « DMI-D/P ».

## 6. Côté serveur

La langue d'une commande est déterminée **par le serveur** (`getLocale()` dans la
Server Action, posée par le proxy sur la requête), jamais envoyée par le
navigateur. Elle est enregistrée dans `Order.locale`, choisit la langue de l'accusé
de réception et apparaît dans l'email interne.

`lib/cart-rules.ts` reste pur : il renvoie des *codes* de violation
(`requires-consumable` + nom du produit), que l'appelant traduit.

## 7. Vérifications

```
npm run typecheck        clés de messages et locales typées
npm run check:messages   parité fr.json / en.json (clés et arguments ICU)
npm run check:emails     accusé de réception rendu en français ET en anglais
npm run build            une page statique par langue et par produit
```

## 8. Ajouter une langue

1. `i18n/routing.ts` : ajouter la locale à `locales`, et un chemin traduit à chaque
   entrée de `pathnames`. Ajouter son code BCP 47 à `INTL_LOCALE`.
2. `messages/<locale>.json` : copier `fr.json` et traduire. L'enregistrer dans
   `i18n/messages.ts`.
3. `lib/schemas.ts` : ajouter la locale à `LocalizedStringSchema`. Le `satisfies`
   l'exige, et le build échoue tant que `data/products.json` n'a pas la traduction
   de chaque champ textuel.
4. `components/layout/locale-switcher.tsx` : rien à faire, il itère sur
   `routing.locales`. Ajouter seulement le libellé `Layout.localeSwitcher.<locale>`.
5. `emails/order-internal.tsx` : ajouter le nom de la langue à `CUSTOMER_LANGUAGE`.
6. `npm run check:messages && npm run typecheck && npm run build`.
