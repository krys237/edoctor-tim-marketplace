import { z } from "zod";

export const CATEGORIES = ["dispositifs-connectes", "consommables"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  "dispositifs-connectes": "Dispositifs connectés",
  consommables: "Consommables",
};

export const AVAILABILITY = ["in_stock", "on_order", "discontinued"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  in_stock: "En stock",
  on_order: "Sur commande",
  discontinued: "Non disponible",
};

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

export const ProductSchema = z.object({
  id: z.string().min(1), // slug d'URL, stable, jamais reutilise
  sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.enum(CATEGORIES),

  /** Prix public en francs CFA. Entier. Seul prix expose au navigateur. */
  price: z.int().positive(),

  availability: z.enum(AVAILABILITY),
  shortDescription: z.string().min(1),
  description: z.string().min(1),
  images: z.array(z.object({ src: z.string(), alt: z.string().min(1) })).min(1),
  specs: z.array(z.object({ label: z.string(), value: z.string() })),

  medical: MedicalSchema,

  /** Consommables compatibles, ou appareil compatible pour un consommable. */
  relatedProductIds: z.array(z.string()),

  /**
   * Vrai pour l'appareil 6 Connect : sa commande exige au moins un pack de
   * bandelettes. Contrainte verifiee au panier ET revalidee cote serveur.
   */
  requiresConsumable: z.boolean().default(false),
});

export type Product = z.infer<typeof ProductSchema>;

export const ProductsFileSchema = z.array(ProductSchema);

/** Grille de tarifs « code medecin ». Ne doit jamais atteindre le navigateur. */
export const DoctorPricingFileSchema = z.record(z.string(), z.int().positive());
