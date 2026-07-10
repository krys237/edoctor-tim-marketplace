# Tunnel de commande

> **Point d'entrée unique** : `actions/submit-order.ts` (`"use server"`).
> **Vérifications rejouables** : `npm run check:rules`, `npm run check:emails`.

---

## 1. Le principe qui gouverne tout

**Le navigateur n'envoie que des identifiants et des quantités.** Aucun prix, aucun
total, aucun libellé de produit. Un champ `price` glissé dans la requête est
silencieusement supprimé par le schéma Zod avant d'atteindre la moindre ligne de logique
— c'est vérifié par `npm run check:rules`.

Tout ce qui a une valeur monétaire est re-résolu côté serveur depuis `data/products.json`.
Une valeur venant du client n'est pas une donnée, c'est une suggestion.

## 2. Séquence de la Server Action

```
1. Validation Zod du payload            → refus si un champ est invalide
2. Idempotence (clé du navigateur)      → même clé = même référence, aucun 2e email
3. Turnstile                            → fail closed ; en prod, clé absente = refus
4. Limitation de débit par IP           → 5 commandes / 10 min
5. Re-résolution du panier              → prix, noms, SKU depuis le catalogue
6. Règles métier (cart-rules.ts)        → « 6 Connect sans bandelettes » bloqué ici
7. Mode de réception                    → point de retrait vérifié contre la liste
8. Code médecin                         → comparaison à temps constant, serveur
9. Envoi Resend                         → support (+ JSON joint) puis accusé client
```

Les étapes 5 et 6 rejouent **exactement** ce que l'interface a déjà vérifié. La
vérification du navigateur est une commodité d'ergonomie ; celle-ci fait foi. Une règle
validée uniquement côté client n'est pas une règle, c'est une suggestion.

## 3. Le panier n'est jamais perdu

L'email est le **seul** transport de la commande. Conséquence assumée, et parades :

| Situation | Comportement |
|---|---|
| `RESEND_API_KEY` absente | Message d'indisponibilité, **panier conservé**, aucune navigation |
| Resend renvoie une erreur | Idem. Jamais de faux succès |
| Double-clic / rafraîchissement | La clé d'idempotence renvoie la même référence, aucun 2e email |
| Accusé client non délivré | La commande est déjà chez le support : on journalise, on ne perd rien |

Le panier n'est vidé qu'**après** confirmation que l'email interne est parti. Vérifié en
conditions réelles : sans clé Resend, la soumission affiche « Le service de commande est
momentanément indisponible. Votre panier est conservé » et le `localStorage` reste intact.

## 4. Limites connues, à lever avant la montée en charge

- **Idempotence et limitation de débit sont en mémoire de processus.** Sur une plateforme
  serverless, deux invocations concurrentes ne les partagent pas. Ce sont des réductions
  de risque, pas des garanties. La protection principale contre l'abus automatisé est
  Turnstile. Migration : Upstash Redis, sans toucher aux appels dans la Server Action.
- **Turnstile est ignoré en développement** quand `TURNSTILE_SECRET_KEY` est absente,
  avec un avertissement serveur. En production, une clé absente **refuse** la commande.
- **Le code médecin est unique** (`DOCTOR_CODE`). Sans valeur, aucun code n'est accepté :
  pas de repli permissif. Un code par praticien suppose une base de données.

## 5. Données de santé — la contrainte qui a façonné le formulaire

Le champ libre s'appelle **« Instructions de livraison (étage, repère, horaires) »** et
non « Commentaire ». Un intitulé générique invite le client à décrire sa pathologie ; ce
sont des données sensibles, et l'email est un transport en clair, à rétention incontrôlée.

Aucun champ ne collecte de donnée de santé. Le jour où une ordonnance devra être jointe,
ce sera un projet à part entière : canal chiffré, hébergeur agréé, contrat de
sous-traitance. Voir `docs/cahier-des-charges.md` §5.3.

## 6. Points de retrait

`data/pickup-locations.json` est **volontairement vide**. Les adresses des agences n'ont
jamais été fournies, et inventer un point de retrait sur un site de dispositifs médicaux
enverrait des clients devant une porte close.

Tant que la liste est vide, le checkout n'offre que la livraison et l'explique à
l'utilisateur. Renseigner ce fichier suffit à activer l'option, sans toucher au code.

Format attendu :

```json
[
  { "id": "douala-akwa", "label": "Agence Akwa", "address": "…", "city": "Douala", "hours": "Lun–Ven 8h–17h" }
]
```

## 7. Ce qu'il reste à faire avant la mise en production

> Un déploiement provisoire est en ligne depuis le 10 juillet 2026, sans domaine
> authentifié : voir **`docs/deploiement-vercel.md`** pour ce qui fonctionne, ce qui ne
> fonctionne pas (l'accusé client n'est jamais délivré) et l'ordre des corrections.

1. Renseigner `RESEND_API_KEY`, `ORDER_EMAIL_TO` (**boîte partagée**, jamais nominative),
   `ORDER_EMAIL_FROM`, `ORDER_EMAIL_BCC`.
2. Authentifier le domaine d'envoi : **SPF, DKIM, DMARC**. Sans cela les commandes
   partiront en spam, et le seul transport de vos commandes sera silencieusement perdu.
3. Créer les clés Turnstile et renseigner `TURNSTILE_SECRET_KEY` +
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
4. Définir `DOCTOR_CODE`.
5. Renseigner les points de retrait.
6. Rédiger la politique de confidentialité liée par la case de consentement (page absente).
7. **Tester une commande de bout en bout** avec une vraie clé Resend : le chemin de succès
   n'a jamais été exécuté, faute de clé.

---

*Rédigé le 9 juillet 2026.*
