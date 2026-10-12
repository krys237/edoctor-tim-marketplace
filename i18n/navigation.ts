import { createNavigation } from "next-intl/navigation";

import { routing } from "@/i18n/routing";

/*
  Remplacants de `next/link` et `next/navigation` conscients de la locale.

  Toujours importer `Link`, `useRouter`, `redirect` d'ICI et non de `next/*` :
  un `href` est un chemin INTERNE (ex. "/produits"), la traduction du chemin et
  le prefixe de langue sont ajoutes automatiquement.
*/
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
