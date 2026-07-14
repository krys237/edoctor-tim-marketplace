# Système de design e-Doctor TIM Marketplace

> **Source de vérité des valeurs** : `app/globals.css`.
> **Vérification** : `python scripts/check-contrast.py` — doit sortir en code 0.
> **Référence visuelle vivante** : `/design` (page interne, `noindex`).
> **Recommandations brutes de la skill** : `design-system/edoctor-place/MASTER.md`.

---

## 1. D'où vient ce style

Deux sources, volontairement croisées :

| Source | Ce qu'on en prend | Ce qu'on en rejette |
|---|---|---|
| **glotelho.cm** (site d'inspiration fourni) | ADN chromatique marine + or, police Montserrat, rayons de 4–8 px, structure de carte produit (image, titre, prix, prix barré, badge de remise, bouton pleine largeur) | Pop-ups d'accueil, bannières sponsorisées, compte à rebours d'urgence, widget de chat, densité publicitaire — et son bouton or à texte blanc, qui échoue au contraste |
| **Skill `ui-ux-pro-max`** | Le style résolu « Accessible & Ethical » (WCAG AAA, focus visible, cibles 44 px, motion réduite), la recommandation typographique santé, la liste d'anti-patterns | Sa palette cyan/vert générique — elle ignore la marque du client |

La skill a été interrogée avec les molettes `--variance 3 --motion 2 --density 5` : un site de dispositifs médicaux se juge sur la confiance qu'il inspire, pas sur son audace visuelle.

---

## 2. La décision qui structure tout : l'or est une surface, jamais un texte

Le site de référence pose du texte blanc sur son bouton or. Mesuré : **2,48:1**. Le minimum WCAG pour du texte est 4,5:1. C'est un échec net, et ce n'est pas un détail sur un site qui vend des glucomètres et des tensiomètres à des personnes diabétiques, hypertendues, âgées ou malvoyantes — précisément la population dont la vision baisse.

Trois règles en découlent, toutes vérifiées par script :

1. **Texte sur fond or → marine** (`#000A2B` sur `#C99F2F` = **7,87:1**, niveau AAA). Jamais blanc.
2. **Or en texte sur fond clair → interdit** (`#C99F2F` sur blanc = 2,48:1). Utiliser la variante assombrie `--gold-700` (`#8F7121` = 4,61:1).
3. **Or en anneau de focus sur fond clair → interdit** (2,48:1). L'anneau est marine en mode clair, or en mode sombre.

En mode sombre, le marine devient invisible : **l'or prend le rôle de couleur primaire**, avec un libellé marine par-dessus (10,49:1).

---

## 3. Palette

Toutes les valeurs vivent dans `app/globals.css`. Les ratios ci-dessous sont mesurés, pas estimés.

### Mode clair

| Token | Valeur | Rôle | Contraste mesuré |
|---|---|---|---|
| `--primary` | `#000A2B` | Boutons principaux, header, prix | 19,48:1 avec blanc |
| `--accent` | `#C99F2F` | Recherche, mises en avant | 7,87:1 avec marine |
| `--promo` | `#B91C1C` | Badge de remise | 6,47:1 avec blanc |
| `--success` | `#15803D` | Disponibilité | 5,02:1 avec blanc |
| `--foreground` | `#111827` | Texte courant | 17,74:1 sur carte |
| `--muted-foreground` | `#4B5563` | Texte secondaire | 7,56:1 sur carte |
| `--border` | `#E2E8F0` | Séparateur **décoratif** | exempté du seuil 3:1 |
| `--input` | `#64748B` | Contour **fonctionnel** de champ | 4,76:1 sur carte |
| `--ring` | `#000A2B` | Anneau de focus | 19,48:1 |

### Le piège des bordures

`--border` et `--input` sont deux tokens distincts, et c'est intentionnel. Le critère WCAG 1.4.11 impose 3:1 aux **contours fonctionnels** — ceux qui matérialisent la zone cliquable d'un champ — mais exempte les séparateurs décoratifs d'une carte déjà détachée par son fond.

Conséquence pratique : le `slate-400` (`#94A3B8`) que tout le monde utilise par réflexe pour les bordures d'input **échoue à 2,56:1**. Ne pas y revenir.

---

## 4. Typographie

Trois rôles, du plus décoratif au plus robuste. **Une police décorative se pose en grand et en rare.**

| Rôle | Token | Police | Portée | Pourquoi |
|---|---|---|---|---|
| Display | `--font-display` | **Butler** Bold | `h1` seul, jamais sous 28 px | Didone à fort contraste : son caractère éditorial fait le cachet du titre principal |
| Titres | `--font-heading` | **Montserrat** 600 | `h2` à `h4` | Robuste à toutes les tailles ; reprise du site de référence |
| Corps | `--font-sans` | **Noto Sans** 400/500 | tout le reste | Plus lisible à 16 px qu'une géométrique, diacritiques français complets |

Règles fermes :

- Corps de texte **jamais sous 16 px** (évite aussi le zoom automatique d'iOS sur les champs).
- Mesure limitée à **65 caractères** par ligne.
- Prix et quantités en **chiffres à chasse fixe** (utilitaire `.tabular-price`) : sans cela, la largeur du prix saute quand le montant change et la carte tressaute.
- **Butler ne descend pas sous le `h1`.** Ses déliés s'amincissent jusqu'au cheveu en petit corps, ce qui contredit le postulat d'accessibilité du §5.1 du cahier des charges.

Montserrat et Noto Sans viennent de `next/font/google`. Butler est chargée par
`next/font/local` depuis `app/fonts/Butler-Free-Bd.woff2` (26 Ko, graisse Bold uniquement).
Les trois sont auto-hébergées, sans requête externe à l'exécution.

### Licence de Butler

L'EULA v2 de Fabian De Smet autorise explicitement l'usage commercial. Elle impose en
contrepartie que le fichier de licence accompagne toute redistribution — et servir un
`.woff2` depuis notre serveur en est une. Deux obligations, détaillées dans
`app/fonts/LICENSE-Butler.md` :

1. `app/fonts/Butler-EULA-v2-00.pdf` reste versionné et non modifié.
2. Les mentions légales doivent créditer Fabian De Smet et lier <https://www.fabiandesmet.com>.

### Pourquoi la police « Rude » a été écartée

Rude (Masha Chuprova, 2016) avait été proposée pour les titres. Analyse du fichier :
**152 de ses 236 glyphes sont vides** — zéro contour. Sont concernés tous les caractères
accentués du français (`é è ê à â î ï ô ù û ü ç É È À Ç`), l'esperluette `&`, les tirets
cadratin et demi-cadratin, et l'apostrophe typographique `’`. Les ligatures `œ`/`Œ` ne sont
pas même mappées.

Le mode de défaillance est silencieux : les caractères étant déclarés dans la police, le
navigateur ne bascule pas sur une police de secours et dessine du vide. « Caractéristiques
techniques » s'affiche `Caract ristiques techniques`, sans aucune erreur.

S'ajoute un doute juridique : le copyright interne indique `Typeface © (your company). 2016.
All Rights Reserved`, sans auteur ni licence déclarés, ce qui contredit la mention
« free for commercial use » affichée par l'agrégateur befonts.

Ne pas réintroduire sans un fichier complet et une licence écrite obtenus de l'autrice
(Behance : `zanoza88`).

---

## 5. Règles d'interaction héritées de la skill

- Cible tactile minimale **44 × 44 px** sur tout élément interactif.
- **Anneau de focus toujours visible** au clavier. `outline: none` est proscrit.
- Transitions de **150–300 ms**, sur `transform` et `opacity` uniquement.
- `prefers-reduced-motion` respecté globalement (déclaré dans `globals.css`).
- **L'information n'est jamais portée par la couleur seule** : « En stock » associe une pastille verte *et* le mot. Un daltonien lit le mot.
- Une seule action primaire par écran. L'or est une action secondaire, pas un second bouton primaire.
- Icônes **SVG** (Lucide), jamais d'emoji.

---

## 6. Ce qu'on ne copie pas du site de référence

Ces choix sont délibérés et doivent le rester, car ils sont tentants :

| Motif présent chez glotelho | Pourquoi on l'écarte |
|---|---|
| Pop-up modal à l'arrivée | Bloque la lecture, pénalise le référencement mobile, et sur un site de santé, dégrade la confiance |
| Compte à rebours « stock limité » | Urgence artificielle. Sur un dispositif médical, pousser à l'achat impulsif est éthiquement indéfendable et juridiquement risqué |
| Bannières sponsorisées | Nous vendons nos propres produits ; une bannière tierce brouille la responsabilité du distributeur |
| Bouton or à texte blanc | Échec de contraste mesuré à 2,48:1 |
| Densité publicitaire du bandeau supérieur | Nos acheteurs B2B cherchent une référence produit, pas une promotion |

Ce que nous gardons de leur savoir-faire : la carte produit est excellente. Image carrée, marque sous le titre, prix dominant, prix barré discret, badge de remise, bouton pleine largeur en bas. C'est un patron éprouvé sur le marché camerounais, et nos utilisateurs le reconnaîtront.

---

## 7. Vérifier avant de livrer

```bash
python scripts/check-contrast.py   # 23 paires, doit sortir en code 0
npm run typecheck
npm run build
npm run dev -- --port 3100         # puis ouvrir /design
```

Toute modification d'une couleur dans `app/globals.css` doit être répercutée dans `scripts/check-contrast.py`, et le script relancé. Une palette non mesurée est une palette fausse.

---

*Rédigé le 9 juillet 2026, à partir de glotelho.cm et de la skill `ui-ux-pro-max` v2.6.2.*
