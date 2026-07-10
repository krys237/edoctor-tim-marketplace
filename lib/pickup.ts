import { z } from "zod";

import raw from "@/data/pickup-locations.json";

/*
  Points de retrait.

  Le fichier est VOLONTAIREMENT VIDE : les adresses des agences n'ont pas ete
  fournies, et inventer une adresse de retrait sur un site de dispositifs
  medicaux enverrait des clients devant une porte close.

  Tant que la liste est vide, le checkout n'offre que la livraison et l'explique
  a l'utilisateur. Renseigner ce fichier suffit a activer l'option, sans toucher
  au code.
*/
export const PickupLocationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  hours: z.string().min(1),
});

export type PickupLocation = z.infer<typeof PickupLocationSchema>;

const locations: PickupLocation[] = z.array(PickupLocationSchema).parse(raw);

export function getPickupLocations(): PickupLocation[] {
  return locations;
}

export function getPickupLocation(id: string): PickupLocation | undefined {
  return locations.find((l) => l.id === id);
}

export function pickupAvailable(): boolean {
  return locations.length > 0;
}
