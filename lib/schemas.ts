import { z } from "zod";

import type { Locale } from "@/i18n/routing";

export const CATEGORIES = ["dispositifs-connectes", "consommables"] as const;
export type Category = (typeof CATEGORIES)[number];

export const AVAILABILITY = ["in_stock", "on_order", "discontinued"] as const;
export type Availability = (typeof AVAILABILITY)[number];

/*
  Les libelles de categorie et de disponibilite vivent dans messages/*.json
  (espaces `Catalog.categories` et `Catalog.availability`), pas ici : ce
  module est partage par le navigateur et le serveur, et il ne doit porter
  que des identifiants.
*/

/**
 * Texte localise du catalogue.
 *
 * CHAQUE langue est obligatoire : un produit dont la traduction anglaise
 * manque fait echouer le build, plutot que d'afficher une fiche a moitie en
 * francais sur /en. `satisfies` garantit qu'ajouter une locale au routage
 * oblige a l'ajouter ici aussi.
 */
export const LocalizedStringSchema = z.object({
  fr: z.string().min(1),
  en: z.string().min(1),
} satisfies Record<Locale, z.ZodString>);

export type LocalizedString = z.infer<typeof LocalizedStringSchema>;

/**
 * Bloc reglementaire.
 *
 * Tous les champs sont NULLABLES et le restent tant que le referent conformite
 * n'a pas fourni l'information. Afficher « marquage CE » sans source serait une
 * allegation juridique : l'interface n'affiche rien quand la valeur est null.
 */
const MedicalSchema = z.object({
  ceMarked: z.boolean().nullable(),
  deviceClass: z.string().nullable(),
  noticeUrl: z.string().nullable(),
  prescriptionRequired: z.boolean().nullable(),
});

/** Produit tel qu'il est ecrit dans data/products.json : textes multilingues. */
export const RawProductSchema = z.object({
  id: z.string().min(1), // slug d'URL, stable, identique dans toutes les langues
  sku: z.string().min(1),
  name: LocalizedStringSchema,
  brand: z.string().min(1),
  category: z.enum(CATEGORIES),

  /** Prix public en francs CFA. Entier. Seul prix expose au navigateur. */
  price: z.int().positive(),

  availability: z.enum(AVAILABILITY),
  shortDescription: LocalizedStringSchema,
  description: LocalizedStringSchema,
  images: z.array(z.object({ src: z.string(), alt: LocalizedStringSchema })).min(1),
  specs: z.array(z.object({ label: LocalizedStringSchema, value: LocalizedStringSchema })),

  medical: MedicalSchema,

  /** Consommables compatibles, ou appareil compatible pour un consommable. */
  relatedProductIds: z.array(z.string()),

  /**
   * Vrai pour l'appareil 6 Connect : sa commande exige au moins un pack de
   * bandelettes. Contrainte verifiee au panier ET revalidee cote serveur.
   */
  requiresConsumable: z.boolean().default(false),
});

export type RawProduct = z.infer<typeof RawProductSchema>;

/**
 * Produit RESOLU dans une langue : c'est ce que manipulent pages, composants
 * et Server Actions. Les champs textuels sont de simples chaines.
 */
export type Product = Omit<
  RawProduct,
  "name" | "shortDescription" | "description" | "images" | "specs"
> & {
  name: string;
  shortDescription: string;
  description: string;
  images: { src: string; alt: string }[];
  specs: { label: string; value: string }[];
};

export const ProductsFileSchema = z.array(RawProductSchema);

/** Grille de tarifs « code medecin ». Ne doit jamais atteindre le navigateur. */
export const DoctorPricingFileSchema = z.record(z.string(), z.int().positive());
