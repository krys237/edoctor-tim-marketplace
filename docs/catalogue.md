# Catalogue et tarification

> **Source** : `description -prix-promo des produits.pdf` (racine du dépôt) et `catalogue-img/`.
> **Catalogue public** : `data/products.json` — validé par Zod au chargement.
> **Tarifs médecin** : `data/pricing-doctor.server.json` — **jamais envoyé au navigateur**.

---

## 1. Les trois lignes corrigées

Le document tarifaire d'origine contenait trois lignes où le prix et le pourcentage de
remise se contredisaient. **Décision : le prix en francs CFA fait foi**, le pourcentage
est recalculé à partir de lui.

| Ligne | Public → Médecin (XAF) | Remise réelle | Remise annoncée au PDF |
|---|---|---|---|
| Bandelettes 3-en-1 | 19 800 → 13 725 | **−31 %** | −24 % |
| Bandelettes β-Cétone | 30 000 → 22 875 | **−24 %** | −33 % |
| Bandelettes Cholestérol total | 30 000 → 22 875 | **−24 %** | −33 % |

Deux autres incohérences ont été relevées et n'ont pas d'incidence sur le code, mais
doivent être connues :

- La colonne « Réduction » du PDF est calculée tantôt sur les prix USD (thermomètre),
  tantôt sur les prix XAF (saturomètre). Elle n'a pas de base unique.
- Les prix publics respectent tous exactement **600 XAF pour 1 USD**. Les prix médecin
  impliquent des taux allant de 590 à 624 XAF/USD, ligne par ligne. Les deux colonnes
  ont donc été fixées indépendamment.

**Conséquence sur le code** : le pourcentage de remise n'est jamais stocké. Il est
toujours dérivé des deux montants par `discountPercent()` dans `lib/money.ts`. Un badge
affiché ne peut donc pas contredire le montant facturé.

## 2. Devise

**XAF uniquement** à l'affichage. Le prix montré est le prix payé. Les montants USD du
PDF ne sont pas publiés — publier deux devises exigerait un taux officiel unique, que la
grille actuelle ne fournit pas.

Les montants sont des **entiers** de francs. Le franc CFA n'a pas de subdivision, et
représenter de la monnaie en flottant produit des arrondis silencieux.

## 3. Le code médecin

Un tarif remisé n'est appliqué que si un code valide est fourni **au checkout**, et il
est calculé **côté serveur**.

```
Catalogue et panier  → prix publics uniquement
Checkout             → champ « Code médecin »
                       └─ Server Action : validation du code
                          └─ recalcul des lignes au tarif médecin
                             └─ email support + client, avec les deux tarifs
```

Trois garde-fous, tous vérifiés :

1. `lib/pricing-doctor.ts` importe `server-only`. Toute tentative d'import depuis un
   composant client **fait échouer le build**. Vérifié en tentant délibérément la fuite.
2. Le code lui-même vit dans la variable d'environnement `DOCTOR_CODE`, hors du dépôt.
   **Sans valeur, aucun code n'est accepté** — pas de repli permissif.
3. La comparaison du code est à temps constant : un `===` sur chaîne s'arrête au premier
   caractère différent et laisse fuir la longueur du préfixe correct.

Contrôle de non-régression, à relancer après toute modification :

```bash
npm run build
# Aucun de ces marqueurs ne doit apparaître dans .next/static/**/*.js :
grep -rl "15555\|13725\|22875\|14900\|11900" .next/static || echo "OK : aucune fuite"
```

## 4. Contraintes métier

- **L'appareil e-Dr Tim (6 Connect) exige au moins un pack de bandelettes.** Champ
  `requiresConsumable` dans `products.json`. La contrainte est signalée sur la fiche et
  la carte ; elle devra être **bloquante au panier et revalidée dans la Server Action**
  (lot panier / checkout).

## 5. Données manquantes — à fournir avant mise en ligne

| Donnée | État | Conséquence |
|---|---|---|
| Marquage CE, classe du dispositif, notice | `null` pour les 10 produits | La fiche affiche « informations à venir, contactez le support » plutôt qu'une affirmation fausse. **Ne jamais renseigner ces champs sans source.** |
| Disponibilité réelle | `in_stock` supposé partout | À confirmer. Aucun stock n'est suivi (cf. cahier des charges). |
| Photos des bandelettes | Absentes | Les cinq packs réutilisent la photo du 6 Connect. À remplacer. |
| Prescription obligatoire ? | `null` | Certaines bandelettes réactives peuvent relever d'un circuit réservé. **À arbitrer produit par produit avant publication.** |
| Marque | « e-Dr Tim » déduit du nom | À confirmer : est-ce la marque, ou seulement le nom de l'appareil ? |

`catalogue-img/torche-tag.jpeg` (torche à lecteur RFID) n'a pas été intégrée : elle ne
figure pas au PDF tarifaire et n'est pas un dispositif médical.

---

*Rédigé le 9 juillet 2026.*
