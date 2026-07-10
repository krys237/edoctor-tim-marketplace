import Link from "next/link";

import { Brand } from "@/components/layout/brand";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground mt-16">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            {/*
              96 px : en dessous, la signature « Dossier médical informatisé »
              gravée dans le logo devient illisible. Verifie en rendant le
              fichier aux tailles reelles d'affichage.
            */}
            <Brand size={96} />
            <p className="mt-4 max-w-[45ch] text-sm opacity-80">
              Dispositifs médicaux connectés et consommables. Commande en ligne,
              traitement par notre équipe.
            </p>
          </div>

          <nav aria-label="Pied de page">
            <p className="text-sm font-semibold">Navigation</p>
            {/* Uniquement des liens vers des pages qui existent. */}
            <ul className="mt-2 space-y-1 text-sm opacity-80">
              <li>
                <Link href="/produits" className="hover:underline">
                  Nos produits
                </Link>
              </li>
              <li>
                <Link href="/panier" className="hover:underline">
                  Votre panier
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="text-sm font-semibold">Commande</p>
            <p className="mt-2 max-w-[45ch] text-sm opacity-80">
              Aucun paiement n&apos;est encaissé en ligne. Notre équipe vous
              recontacte sous 24 à 48 h ouvrées pour confirmer votre commande, les
              frais de livraison et le règlement.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/15 pt-6">
          {/*
            Avertissement obligatoire sur un site distribuant des dispositifs
            medicaux. Ne pas retirer.
          */}
          <p className="max-w-[80ch] text-xs opacity-80">
            Dispositifs médicaux — lisez attentivement la notice avant utilisation.
            Les informations présentées sur ce site ne remplacent pas l&apos;avis
            d&apos;un professionnel de santé et ne constituent ni un diagnostic ni
            une prescription.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs opacity-70">
            <p>© {year} eDoctor Place</p>
            {/*
              Attribution imposee par l'EULA de Butler : la licence n'autorise la
              redistribution des fichiers (servir un .woff2 en est une) qu'a la
              condition d'afficher une reference claire au site de l'auteur.
              Voir app/fonts/LICENSE-Butler.md
            */}
            <p>
              Police Butler ©{" "}
              <a
                href="https://www.fabiandesmet.com"
                rel="noopener noreferrer"
                target="_blank"
                className="underline"
              >
                Fabian De Smet
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
