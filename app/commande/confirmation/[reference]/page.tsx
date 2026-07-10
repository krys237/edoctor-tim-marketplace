import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isValidOrderReference } from "@/lib/order-reference";

export const metadata: Metadata = {
  title: "Commande envoyée",
  robots: { index: false, follow: false },
};

type Params = { params: Promise<{ reference: string }> };

/*
  Cette page n'affiche AUCUNE donnee de commande : il n'existe pas de base de
  donnees, et une reference dans une URL n'est pas un secret. Elle se contente
  de confirmer l'envoi et de rappeler la reference que le client vient de saisir.
*/
export default async function ConfirmationPage({ params }: Params) {
  const { reference } = await params;
  if (!isValidOrderReference(reference)) notFound();

  return (
    <main id="contenu" className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-success text-sm font-semibold">Commande envoyée</p>

        <h1 className="mt-3 text-3xl">Merci, nous avons bien reçu votre demande.</h1>

        <p className="text-muted-foreground mt-4">Votre référence de commande :</p>
        <p className="tabular-price bg-secondary text-secondary-foreground mt-2 inline-block rounded-md px-4 py-2 text-xl font-bold">
          {reference}
        </p>

        <div className="border-accent bg-accent/10 mt-8 rounded-md border-l-4 p-4 text-left">
          <p className="text-sm font-semibold">Votre commande n&apos;est pas encore confirmée.</p>
          <p className="mt-1 text-sm">
            Aucun paiement n&apos;a été effectué. Notre équipe vous contacte sous 24 à
            48 h ouvrées pour confirmer la disponibilité des produits, les frais de
            livraison et les modalités de règlement.
          </p>
        </div>

        <p className="text-muted-foreground mt-6 text-sm">
          Un accusé de réception vient de vous être envoyé par email. Conservez votre
          référence : notre support vous la demandera.
        </p>

        <Link
          href="/produits"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-8 inline-flex min-h-11 items-center rounded-md px-5 text-sm font-semibold transition-colors"
        >
          Retour aux produits
        </Link>
      </div>
    </main>
  );
}
