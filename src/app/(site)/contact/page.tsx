import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/primitives";
import { ContactForm } from "@/components/site/contact-form";
import { getSiteContent } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez Fay & Partenaires à Ouagadougou : téléphone, e-mail et adresse. Devis gratuit et service sur place.",
};

export default async function ContactPage() {
  const { contact } = await getSiteContent();

  return (
    <>
      <section className="border-b border-steel-100 bg-white">
        <Container className="py-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-cobalt-600">
            Nous contacter
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-bold text-steel-900 sm:text-4xl">
            Parlons de votre besoin
          </h1>
          <p className="mt-2 max-w-2xl text-steel-500">
            Un devis gratuit et des services sur place sont disponibles.
            Contactez-nous si vous ne trouvez pas ce que vous cherchez dans notre
            stock.
          </p>
        </Container>
      </section>

      <Container className="py-12">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Info */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cobalt-50 text-cobalt-600">
                  <Phone className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-steel-900">Téléphone</h3>
                <ul className="mt-1 space-y-1 text-sm text-steel-600">
                  {contact.phones.map((p) => (
                    <li key={p}>
                      <a href={`tel:${p.replace(/\s/g, "")}`} className="hover:text-cobalt-600">
                        {p}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cobalt-50 text-cobalt-600">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-steel-900">E-mail</h3>
                <a
                  href={`mailto:${contact.email}`}
                  className="mt-1 block break-all text-sm text-steel-600 hover:text-cobalt-600"
                >
                  {contact.email}
                </a>
              </div>
              <div className="card p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cobalt-50 text-cobalt-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-steel-900">Adresse</h3>
                <p className="mt-1 text-sm text-steel-600">
                  {contact.address}
                  <br />
                  {contact.city}
                </p>
              </div>
              <div className="card p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cobalt-50 text-cobalt-600">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-steel-900">Horaires</h3>
                <p className="mt-1 text-sm text-steel-600">{contact.hours}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-steel-100 bg-steel-50/60 p-5 text-xs text-steel-500">
              <p className="font-semibold text-steel-600">Informations légales</p>
              <p className="mt-2">{contact.ifu}</p>
              <p>{contact.rccm}</p>
              <p>{contact.cne}</p>
              <p>{contact.regime}</p>
            </div>

            {contact.map_embed && (
              <div
                className="overflow-hidden rounded-2xl border border-steel-100"
                // Admin-provided embed HTML (iframe). Trusted content.
                dangerouslySetInnerHTML={{ __html: contact.map_embed }}
              />
            )}
          </div>

          {/* Form */}
          <div>
            <h2 className="mb-4 font-display text-xl font-bold text-steel-900">
              Envoyez-nous un message
            </h2>
            <ContactForm />
          </div>
        </div>
      </Container>
    </>
  );
}
