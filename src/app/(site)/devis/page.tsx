import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { DevisClient } from "@/components/quote/devis-client";

export const metadata: Metadata = {
  title: "Demander un devis",
  description:
    "Constituez votre liste de fixations et recevez une offre chiffrée gratuite sous 24h de Fay & Partenaires.",
};

export default function DevisPage() {
  return (
    <>
      <section className="border-b border-steel-100 bg-white">
        <Container className="py-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-brass-600">
            Votre demande
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-bold text-steel-900 sm:text-4xl">
            Demande de devis
          </h1>
          <p className="mt-2 max-w-2xl text-steel-500">
            Ajoutez les produits souhaités, indiquez les quantités et vos
            coordonnées. Notre équipe vous répond avec une offre chiffrée.
          </p>
        </Container>
      </section>
      <Container className="py-10">
        <DevisClient />
      </Container>
    </>
  );
}
