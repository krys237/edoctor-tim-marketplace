# Marketplace eDoctor — Cahier des charges V1

> **Statut** : proposition, à valider.
> **Objectif V1** : mettre en ligne le catalogue d'équipements médicaux et permettre à un visiteur de composer une commande. La commande n'est **pas** traitée par le système : elle est structurée et envoyée par email au support, qui la traite manuellement.
> **Ce document est volontairement limité à la V1.** Le circuit complet (paiement, stock, logistique) sera spécifié séparément.

---

## 1. Périmètre

### Dans le périmètre V1

- Catalogue public des produits (tensiomètres, glucomètres, dispositifs connectés, bandelettes et consommables).
- Fiche produit détaillée.
- Recherche et filtres (catégorie, marque, gamme de prix).
- Panier persistant (survit au rafraîchissement de la page).
- Tunnel de commande sans compte : coordonnées, choix livraison **ou** retrait en agence.
- Envoi de la commande structurée par email au support + accusé de réception au client.
- Pages légales et informationnelles (mentions, CGV, confidentialité, contact, à propos).
- Référencement naturel (SEO) et accessibilité.

### Hors périmètre V1 (assumé, à planifier en V2)

| Exclusion | Conséquence à assumer dès maintenant |
|---|---|
| Paiement en ligne | Le site doit indiquer **explicitement** qu'aucun paiement n'est encaissé et que le support recontacte le client. |
| Comptes utilisateurs | Pas d'historique de commande, pas de suivi en ligne. |
| Gestion de stock temps réel | La disponibilité est une donnée éditoriale (`En stock` / `Sur commande`), pas un compteur. Risque de vendre un article indisponible : le support arbitre à la confirmation. |
| Back-office d'administration | Toute modification du catalogue passe par un commit et un redéploiement. |
| Suivi de livraison | Géré hors ligne par le support. |
| Upload d'ordonnance | **Volontairement exclu** — voir §5.3, contrainte bloquante. |

---

## 2. Acteurs

| Acteur | Description | Besoin principal |
|---|---|---|
| **Visiteur B2C** | Particulier, patient, aidant. | Comprendre à quoi sert l'appareil, comparer, commander simplement. |
| **Visiteur B2B** | Clinique, pharmacie, laboratoire, ONG. | Commander en volume, obtenir une facture au nom de la structure. |
| **Support eDoctor** | Reçoit et traite les commandes. | Recevoir une commande **non ambiguë**, immédiatement exploitable, sans avoir à rappeler le client pour des informations manquantes. |

Le B2B se distingue par trois champs facultatifs au checkout (raison sociale, numéro d'identifiant fiscal, contact commande) et par la possibilité de saisir des quantités élevées. Il n'y a **pas** de grille tarifaire distincte en V1 — le support ajuste le tarif à la confirmation. Si une remise B2B automatique est souhaitée, elle relève de la V2 (elle suppose de savoir qui est B2B, donc des comptes).

---

## 3. Parcours utilisateur

```
Accueil
  └─> Catalogue (filtres, recherche, tri)
        └─> Fiche produit
              ├─> Ajout au panier ──> Panier
              └─> Produits liés
                                      Panier (modifier quantités, supprimer)
                                        └─> Checkout
                                              1. Coordonnées (nom, email, téléphone)
                                              2. Mode de réception
                                                   ├─ Livraison  ─> adresse complète
                                                   └─ Retrait    ─> choix du point de retrait
                                              3. Informations structure (B2B, facultatif)
                                              4. Récapitulatif + validation
                                                    │
                                                    ├──> Email interne au support (commande structurée + pièce jointe JSON)
                                                    ├──> Email d'accusé de réception au client
                                                    └──> Page de confirmation + référence de commande
```

**Règle** : le panier n'est vidé qu'**après** confirmation que l'email a bien été accepté par le fournisseur d'envoi. Si l'envoi échoue, le panier est conservé et l'utilisateur peut réessayer. Perdre un panier sur une erreur réseau est le pire échec possible de ce tunnel.

---

## 4. Spécifications fonctionnelles

### 4.1 Catalogue

- Grille de produits paginée (ou défilement infini), image, nom, marque, prix, badge de disponibilité.
- Filtres : catégorie, marque, disponibilité, fourchette de prix. Les filtres sont reflétés dans l'URL (`/produits?categorie=glucometres&marque=accu-chek`) — indispensable pour partager un lien et pour le SEO.
- Recherche plein texte côté client sur nom, marque, description courte, référence.
- Tri : pertinence, prix croissant, prix décroissant, nouveautés.
- État vide explicite quand aucun produit ne correspond, avec bouton de réinitialisation des filtres.

### 4.2 Fiche produit

- Galerie d'images, nom, marque, référence (SKU), prix, disponibilité.
- Description longue (rédigée en Markdown).
- Caractéristiques techniques sous forme de tableau clé/valeur.
- Contenu de la boîte, garantie.
- **Mentions réglementaires** : classe du dispositif, marquage CE, lien vers la notice PDF, avertissement « dispositif médical — lisez attentivement la notice » (voir §5.2).
- Sélecteur de quantité + bouton « Ajouter au panier » avec retour visuel immédiat.
- Produits liés (consommables compatibles : bandelettes pour un glucomètre, brassards pour un tensiomètre). Ce lien est éditorial, déclaré dans la fiche produit.

### 4.3 Panier

- Persistance en `localStorage`, restauré au chargement.
- Modification des quantités, suppression d'une ligne, vidage complet.
- Sous-total par ligne, total général.
- **Les frais de livraison ne sont pas calculés** : afficher `Frais de livraison : communiqués à la confirmation`. Ne jamais afficher un total qui pourrait être compris comme définitif.
- Le prix est **revalidé côté serveur** au moment de la commande contre `products.json`. Le prix envoyé par le navigateur n'est jamais considéré comme fiable.

### 4.4 Checkout

Formulaire en une page, sections repliables, validation au blur puis au submit.

| Champ | Obligatoire | Règle |
|---|---|---|
| Nom complet | oui | 2–100 caractères |
| Email | oui | format email valide |
| Téléphone | oui | format international, indicatif requis |
| Mode de réception | oui | `livraison` \| `retrait` |
| Adresse ligne 1 | si livraison | — |
| Ville / quartier | si livraison | — |
| Point de retrait | si retrait | liste fermée |
| Instructions de livraison | non | 500 caractères max |
| Raison sociale | non | déclenche l'affichage du bloc B2B |
| Identifiant fiscal | non | — |
| Consentement RGPD | oui | case à cocher non pré-cochée |

**Contrainte** : aucun champ libre ne doit inviter le client à décrire son état de santé. Le libellé du champ « Instructions » sera explicitement `Instructions de livraison (étage, repère, horaires)` et non `Commentaire`, afin de ne pas induire la saisie de données de santé (§5.3).

### 4.5 Emails générés

**Email interne (au support)**
- Objet : `[Commande] CMD-20260709-A3F2 — 3 articles — Livraison Douala`
- Corps HTML : tableau des lignes, totaux, coordonnées, mode de réception, bloc B2B si renseigné.
- **Pièce jointe `commande-CMD-20260709-A3F2.json`** : la commande complète, structurée. C'est ce qui rend la V2 possible sans perte : la boîte email devient un journal append-only de commandes réexploitables par script le jour où la base de données arrive.
- `Reply-To` positionné sur l'email du client — le support répond directement.

**Email client (accusé de réception)**
- Objet : `Votre commande CMD-20260709-A3F2 chez eDoctor`
- Rappel du contenu, de la référence, et **mention claire** : « Cette commande n'est pas encore confirmée et aucun paiement n'a été effectué. Notre équipe vous contacte sous 24–48 h ouvrées. »

### 4.6 Page de confirmation

Affiche la référence de commande, un récapitulatif, et le délai de rappel annoncé. Accessible à une URL non devinable et non indexable (`noindex`). Ne pas rendre cette page rejouable au rafraîchissement (pattern POST → redirect → GET).

---

## 5. Exigences non fonctionnelles

### 5.1 Performance, SEO, accessibilité

- Rendu serveur des pages catalogue et produit (Next.js App Router) — nécessaire pour être indexé par Google, ce qui est la condition d'existence commerciale du site.
- Images servies via `next/image` (formats modernes, dimensionnement automatique, chargement différé).
- Données structurées `schema.org/Product` sur chaque fiche produit : fait apparaître prix et disponibilité directement dans les résultats de recherche.
- `sitemap.xml` et `robots.txt` générés.
- Cibles Lighthouse : Performance ≥ 90, Accessibilité ≥ 95, SEO = 100.
- Accessibilité : navigation clavier complète, contrastes WCAG AA, libellés de formulaire liés, erreurs annoncées aux lecteurs d'écran. Ce n'est pas cosmétique — une partie de la clientèle d'un site de matériel médical est âgée ou malvoyante.
- Site responsive, conçu mobile d'abord.

### 5.2 Conformité dispositifs médicaux

> ⚠️ **Ces points doivent être validés par votre référent conformité / juridique. Ils ne sont pas des conseils juridiques.**

- Vous passez d'éditeur de logiciel à **distributeur de dispositifs médicaux** : cela crée des obligations propres (traçabilité, matériovigilance, conservation des notices).
- Certains produits (bandelettes réactives, autotests) peuvent être soumis à prescription ou à un circuit de distribution réservé selon la juridiction. **À arbitrer produit par produit avant mise en ligne.**
- Chaque fiche doit porter : marquage CE, classe du dispositif, notice accessible, avertissement d'usage.
- Le site ne doit délivrer **aucun conseil médical** ni suggérer un diagnostic. Bannière/mention : « Ces informations ne remplacent pas l'avis d'un professionnel de santé. »
- Le champ « juridiction » (pays de vente, devise, TVA applicable) est **à trancher** — voir §9.

### 5.3 Données personnelles — contrainte bloquante

Le tunnel collecte des données personnelles (identité, adresse, téléphone). Trois règles non négociables :

1. **Aucune donnée de santé ne transite par email.** Pathologie, ordonnance, traitement, résultats de mesure : ce sont des données sensibles. L'email est un transport en clair, à rétention incontrôlée, dupliqué sur des serveurs tiers. La V1 est conçue pour ne jamais en collecter. Si le métier exige un jour l'upload d'ordonnance, cela impose un canal chiffré, un hébergeur agréé données de santé et un contrat de sous-traitance — c'est un projet en soi, pas une évolution du formulaire.
2. **Consentement explicite** au checkout, case non pré-cochée, avec lien vers la politique de confidentialité.
3. **Minimisation** : ne demander que ce qui est nécessaire à la livraison et au rappel du client.

### 5.4 Sécurité

- Le formulaire de commande déclenche l'envoi d'un email : c'est un **vecteur de spam et d'abus**. Protection obligatoire par CAPTCHA invisible (Cloudflare Turnstile) + champ honeypot + limitation de débit par IP.
- La clé API du fournisseur d'email n'existe que côté serveur, jamais exposée au navigateur (c'est la raison principale du choix Next.js plutôt qu'une SPA pure).
- Toutes les entrées sont validées **côté serveur** par le même schéma Zod que côté client. La validation navigateur est une commodité d'ergonomie, jamais une sécurité.
- Prix et existence des produits recalculés côté serveur depuis la source de vérité.
- En-têtes de sécurité : CSP, `X-Content-Type-Options`, `Referrer-Policy`.

### 5.5 Fiabilité — le point faible assumé

**L'email est le seul moyen de transport de la commande. S'il échoue, la commande est perdue.** C'est le risque structurel de cette V1. Parades :

| Risque | Parade |
|---|---|
| L'envoi échoue (API down, quota) | Erreur affichée, **panier conservé**, bouton « Réessayer ». Jamais de faux succès. |
| L'email part mais atterrit en spam | Domaine authentifié (SPF, DKIM, DMARC) obligatoire avant mise en production. |
| Double soumission (double-clic, refresh) | Référence de commande générée à l'ouverture du checkout et envoyée avec la requête ; bouton désactivé pendant l'envoi ; déduplication côté serveur sur cette référence. |
| Le support ne voit pas la commande | Envoi à une **boîte partagée** (`commandes@`), jamais à une adresse nominative. Copie à une seconde adresse de secours. |
| Perte d'historique | La pièce jointe JSON rend chaque commande réimportable. Le fournisseur d'email conserve les logs d'envoi. |

---

## 6. Modèle de données

Pas de base de données en V1. Deux structures, toutes deux typées en TypeScript et validées par Zod.

### 6.1 Produit — `data/products.json`

```ts
type Product = {
  id: string;              // slug URL, stable, jamais réutilisé : "glucometre-accu-chek-guide"
  sku: string;             // référence interne
  name: string;
  brand: string;
  category: 'tensiometres' | 'glucometres' | 'dispositifs-connectes'
          | 'consommables' | 'accessoires';
  price: number;           // entier, en unité mineure de la devise. Jamais de flottant.
  currency: 'XAF';         // à confirmer, cf. §9
  availability: 'in_stock' | 'on_order' | 'discontinued';
  shortDescription: string;
  description: string;     // Markdown
  images: { src: string; alt: string }[];  // alt obligatoire (accessibilité + SEO)
  specs: { label: string; value: string }[];
  boxContents: string[];
  warrantyMonths: number;

  // Bloc réglementaire
  medical: {
    ceMarked: boolean;
    deviceClass: string;         // "IIa", "DIV liste A"...
    noticeUrl: string;           // PDF dans /public/notices/
    prescriptionRequired: boolean;
  };

  relatedProductIds: string[];   // consommables compatibles
};
```

Le prix est un **entier**. Représenter de l'argent en nombre flottant produit des erreurs d'arrondi silencieuses ; le franc CFA n'ayant pas de subdivision, l'entier représente directement le montant.

### 6.2 Commande — payload de la Server Action

```ts
type Order = {
  reference: string;           // "CMD-20260709-A3F2", généré serveur
  submittedAt: string;         // ISO 8601, horodaté serveur

  customer: {
    fullName: string;
    email: string;
    phone: string;
  };

  business?: {                 // présent si B2B
    companyName: string;
    taxId?: string;
  };

  fulfillment:
    | { type: 'delivery'; addressLine1: string; addressLine2?: string;
        city: string; instructions?: string }
    | { type: 'pickup'; locationId: string };

  items: {
    productId: string;
    sku: string;
    name: string;
    unitPrice: number;         // re-résolu serveur, jamais celui du client
    quantity: number;
    lineTotal: number;
  }[];

  subtotal: number;            // recalculé serveur
  currency: 'XAF';
  // Pas de `total` : les frais de livraison sont inconnus à ce stade.
  // Nommer ce champ `total` serait un mensonge contractuel envers le client.

  consentGivenAt: string;
};
```

---

## 7. Architecture technique

### 7.1 Vue d'ensemble

```
┌──────────────────────────────────────────────────┐
│  Navigateur                                      │
│   • React (Server + Client Components)           │
│   • Panier : Zustand + localStorage              │
│   • Turnstile (jeton anti-abus)                  │
└──────────────────┬───────────────────────────────┘
                   │  Server Action (POST, typée)
                   ▼
┌──────────────────────────────────────────────────┐
│  Next.js — runtime serveur (Vercel)              │
│   1. Vérification du jeton Turnstile             │
│   2. Limitation de débit par IP                  │
│   3. Validation Zod du payload                   │
│   4. Re-résolution produits + prix (products.json)│
│   5. Génération de la référence de commande      │
│   6. Rendu des emails (React Email)              │
│   7. Envoi via Resend  ─────────────────┐        │
│   8. Succès → redirect page confirmation│        │
│      Échec  → erreur, panier conservé   │        │
└─────────────────────────────────────────┼────────┘
                                          ▼
                              ┌───────────────────────┐
                              │  Resend               │
                              │   → commandes@…       │
                              │      (+ JSON joint)   │
                              │   → client (accusé)   │
                              └───────────────────────┘

Source de vérité catalogue : data/products.json + /public/images (versionnés Git)
```

Aucune base de données, aucun service à administrer. La surface d'attaque et le coût d'exploitation sont réduits au minimum, ce qui est exactement ce qu'on veut tant que le circuit métier n'est pas figé.

### 7.2 Arborescence

État réel du dépôt (mis à jour le 12 octobre 2026, après l'ajout du multilingue).
Les pages légales, le contact, le sitemap et les tests e2e restent à faire (voir §11).

```
edoctor-place/
├── app/
│   ├── [locale]/                   # fr (sans préfixe) et en (/en) — voir docs/internationalisation.md
│   │   ├── layout.tsx              # polices, header, footer, NextIntlClientProvider
│   │   ├── page.tsx                # accueil
│   │   ├── produits/
│   │   │   ├── page.tsx            # catalogue (filtres via searchParams)
│   │   │   └── [slug]/page.tsx     # fiche produit + JSON-LD, prérendue par langue
│   │   ├── panier/page.tsx
│   │   ├── commande/
│   │   │   ├── page.tsx            # checkout
│   │   │   └── confirmation/[reference]/page.tsx
│   │   └── design/page.tsx         # référence de style interne (noindex)
│   ├── fonts/                      # Butler (licence : LICENSE-Butler.md)
│   ├── globals.css
│   ├── icon.png
│   └── apple-icon.png
│
├── proxy.ts                        # détection de langue, réécriture /en/products → [locale]/produits
├── global.d.ts                     # typage next-intl : locales et clés de messages
│
├── i18n/
│   ├── routing.ts                  # locales, chemins traduits — source de vérité
│   ├── navigation.ts               # Link, useRouter, redirect, getPathname localisés
│   ├── request.ts                  # configuration par requête (messages, fuseau)
│   └── messages.ts                 # import statique des catalogues
├── messages/
│   ├── fr.json                     # référence
│   └── en.json                     # même structure, vérifiée par check:messages
│
├── actions/
│   ├── submit-order.ts             # 'use server' — unique point d'entrée mutant
│   └── validate-promo.ts           # vérification d'un code promo, sans révéler la liste
│
├── components/
│   ├── ui/                         # primitives shadcn/ui
│   ├── layout/                     # SiteHeader, SiteFooter, Brand, CartBadge, LocaleSwitcher
│   ├── product/                    # ProductCard
│   ├── cart/                       # CartView, AddToCartButton, QuantityPicker, ProductPurchase
│   └── checkout/                   # CheckoutForm
│
├── lib/
│   ├── catalog.ts                  # lecture, validation et résolution par langue du catalogue
│   ├── schemas.ts                  # schémas Zod partagés client/serveur, textes localisés
│   ├── cart-store.ts               # Zustand + persist (identifiants et quantités seulement)
│   ├── cart-rules.ts               # règles métier pures, violations sous forme de codes
│   ├── order.ts                    # contrat d'entrée de la commande, type Order (avec locale)
│   ├── order-reference.ts
│   ├── money.ts                    # formatage par langue, arithmétique entière
│   ├── alternates.ts               # balises hreflang d'une page
│   ├── translator.ts               # traducteurs hors requête (emails, scripts)
│   ├── pickup.ts
│   ├── promo.ts                    # server-only
│   ├── pricing-doctor.ts           # server-only
│   ├── turnstile.ts
│   ├── rate-limit.ts
│   ├── constant-time.ts
│   └── utils.ts
│
├── emails/
│   ├── order-internal.tsx          # React Email, support (français)
│   └── order-receipt.tsx           # accusé client, dans la langue de la commande
│
├── data/
│   ├── products.json               # textes en { fr, en }
│   ├── pickup-locations.json
│   └── pricing-doctor.server.json
│
├── scripts/
│   ├── check-order-rules.ts
│   ├── check-emails.ts
│   ├── check-messages.ts
│   └── check-contrast.py
│
├── public/
│   └── images/                     # produits, marque
│
└── docs/
    ├── cahier-des-charges.md       # ce document
    ├── internationalisation.md
    ├── catalogue.md
    ├── commande.md
    ├── design-system.md
    └── deploiement-vercel.md
```

### 7.3 Décisions d'architecture et leur justification

| Décision | Pourquoi |
|---|---|
| **Server Action** plutôt que Route Handler `/api` | Le formulaire de commande est une mutation liée à une page unique. La Server Action donne un typage bout-en-bout et fonctionne sans JavaScript activé (dégradation gracieuse). Pas de route publique à protéger séparément. |
| **Catalogue en fichier versionné** | Le catalogue est petit et change rarement. Un fichier Git donne gratuitement historique, revue par pull request et rollback. Une base de données ici coûterait un service à administrer pour aucun bénéfice. |
| **Prix re-résolus côté serveur** | Le client peut modifier n'importe quelle valeur envoyée. Un prix venant du navigateur n'est pas une donnée, c'est une suggestion. |
| **Zustand + persist** plutôt que Context | Le panier est un état global lu par le header, la fiche produit et le checkout. Zustand évite les re-rendus en cascade et fournit la persistance `localStorage` en une ligne. |
| **React Email** plutôt que HTML manuel | Les clients mail (Outlook en tête) imposent un HTML archaïque. React Email produit un rendu fiable, testable et prévisualisable en développement. |
| **Pas de `total` dans la commande** | Les frais de livraison sont inconnus. Exposer un `total` incomplet crée une attente de prix ferme côté client. |

---

## 8. Stack

| Couche | Choix | Motif |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Rendu serveur pour le SEO, Server Actions pour garder la clé email côté serveur, un seul déploiement. |
| Langage | **TypeScript**, mode `strict` | Le modèle produit/commande est le cœur du système ; le typer élimine une classe entière de bugs. |
| Styles | **Tailwind CSS** | Vitesse d'itération, cohérence, pas de CSS mort. |
| Composants | **shadcn/ui** (Radix) | Composants accessibles par construction (dialog, select, form), copiés dans le repo donc modifiables. |
| État panier | **Zustand** + middleware `persist` | Léger, persistance immédiate. |
| Validation | **Zod** | Un schéma unique partagé client et serveur. |
| Formulaires | **React Hook Form** + resolver Zod | Peu de re-rendus, gestion d'erreurs accessible. |
| Emails | **Resend** + **React Email** | API simple, logs de délivrabilité, gratuit jusqu'à 3 000 envois/mois. *Alternative si contrainte régionale : Brevo, ou SMTP + Nodemailer.* |
| Anti-abus | **Cloudflare Turnstile** | Invisible pour l'utilisateur, gratuit, sans traçage publicitaire. |
| Tests | **Vitest** (unitaire) + **Playwright** (E2E) | Le parcours « ajout panier → checkout → email » doit être couvert par un test E2E : c'est le seul chemin qui génère du revenu. |
| Qualité | ESLint, Prettier, `tsc --noEmit` en CI | — |
| Hébergement | **Vercel** | Intégration native Next.js, prévisualisation par pull request, HTTPS et CDN inclus. |
| Analytics | **Vercel Analytics** ou **Plausible** | Sans cookie, donc sans bandeau de consentement supplémentaire. |

### Variables d'environnement

```
RESEND_API_KEY=            # secret, serveur uniquement
ORDER_EMAIL_TO=            # boîte partagée : commandes@edoctor.xx
ORDER_EMAIL_BCC=           # adresse de secours
ORDER_EMAIL_FROM=          # doit appartenir à un domaine authentifié SPF/DKIM/DMARC
TURNSTILE_SECRET_KEY=      # secret
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
NEXT_PUBLIC_SITE_URL=
```

---

## 9. Décisions restantes à trancher

Ces points bloquent la mise en production, pas le démarrage du développement.

1. **Devise et juridiction de vente.** Le modèle suppose `XAF` (franc CFA) et un marché camerounais. À confirmer — cela détermine le format des prix, la TVA applicable, les mentions des CGV et la liste des points de retrait.
2. **Statut réglementaire produit par produit.** Lesquels sont soumis à prescription ou à un circuit de distribution réservé ? Ceux-là ne peuvent pas être vendus par simple ajout au panier.
3. **Adresse email de destination des commandes.** Doit être une boîte **partagée** et surveillée, pas une adresse personnelle.
4. **Domaine et authentification email.** SPF, DKIM et DMARC doivent être configurés avant la mise en ligne, sinon les commandes finiront en spam.
5. **Points de retrait.** Liste, adresses, horaires.
6. **Charte graphique.** Logo, palette, typographie. À défaut, je propose une palette clinique sobre (bleu/blanc, accents verts) cohérente avec le secteur.
7. **Contenu légal.** Les CGV, mentions légales et politique de confidentialité doivent être rédigées ou validées par votre juriste. Je peux fournir une trame, pas un texte opposable.

---

## 10. Découpage et estimation

Estimation pour **un développeur**, hors rédaction du contenu produit et des textes légaux.

| Lot | Contenu | Effort |
|---|---|---|
| 0 | Initialisation : Next.js, TypeScript, Tailwind, shadcn/ui, ESLint, CI | 0,5 j |
| 1 | Design system, layout, header, footer, bandeau réglementaire | 2 j |
| 2 | Modèle de données, catalogue, filtres, recherche, tri | 3 j |
| 3 | Fiche produit, galerie, specs, JSON-LD, produits liés | 2 j |
| 4 | Panier : store, persistance, page panier, résumé | 2 j |
| 5 | Checkout : formulaire, validation, Server Action, emails, Turnstile, confirmation | 3,5 j |
| 6 | Pages légales, contact, à propos, SEO, sitemap | 1,5 j |
| 7 | Accessibilité, responsive, tests E2E, recette, déploiement | 2,5 j |
| | **Total** | **≈ 17 jours ouvrés** (~3,5 semaines) |

---

## 11. Chemin vers la V2

L'architecture V1 est conçue pour ne rien jeter au moment de brancher le circuit complet :

- La pièce jointe JSON de chaque commande est **réimportable** dans une future base de données : aucun historique n'est perdu pendant la phase manuelle.
- Le schéma Zod `Order` devient le schéma de la table `orders`.
- La Server Action `submit-order` gagne une écriture en base **avant** l'envoi de l'email ; l'email devient une notification, plus un transport. C'est un ajout de quelques lignes, pas une réécriture.
- `products.json` se migre vers PostgreSQL via Prisma le jour où un back-office devient nécessaire ; l'interface `lib/catalog.ts` isole déjà le reste du code de la source de données.

Évolutions attendues, par ordre de valeur décroissante : comptes clients et historique → paiement (Mobile Money, carte) → back-office et stock → statuts de commande et suivi → facturation.

---

*Document rédigé le 9 juillet 2026. À amender avant tout développement.*
