import Image from "next/image";

/**
 * Mention accompagnant le logo. Reprise telle quelle de la demande client.
 * Le fichier source s'appelle « logo dmi-DP.png » : si « DP » est la bonne
 * graphie, corriger ici et nulle part ailleurs.
 */
export const BRAND_TAGLINE = "DMI-D/P";

const LOGO_SRC = "/images/brand/logo-e-dr-tim.png";

type Props = {
  /** Cote du logo en pixels. Le fichier est carre (500x500). */
  size?: number;
  /** Affiche le nom du site a cote du logo. */
  withWordmark?: boolean;
  /**
   * Le logo est-il porteur d'information ? Faux quand un titre voisin donne
   * deja le nom de la marque : l'annoncer deux fois encombre le lecteur d'ecran.
   */
  decorative?: boolean;
  className?: string;
};

export function Brand({
  size = 44,
  withWordmark = true,
  decorative = false,
  className = "",
}: Props) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <Image
        src={LOGO_SRC}
        // Le fichier est carre : width et height identiques preservent le ratio
        // et evitent l'avertissement de next/image sur les dimensions.
        width={size}
        height={size}
        alt={decorative ? "" : "e-Dr TIM — Dossier médical informatisé"}
        aria-hidden={decorative || undefined}
        // Present dans l'en-tete de chaque page, toujours au-dessus de la ligne
        // de flottaison : le charger en differe n'a aucun sens.
        loading="eager"
      />

      <span className="flex flex-col leading-tight">
        {withWordmark && (
          <span className="font-heading text-lg font-bold tracking-tight">
            eDoctor Place
          </span>
        )}
        {/*
          La mention demandée, directement sous le bloc de marque.
          Pas de `uppercase` : la casse de « DMI-D/P » est significative et ne
          doit pas être transformée par la feuille de style.
        */}
        <span className="text-[11px] font-medium tracking-[0.14em] opacity-80">
          {BRAND_TAGLINE}
        </span>
      </span>
    </span>
  );
}
