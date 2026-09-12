import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/primitives";
import type { ContactContent, FooterContent } from "@/lib/content";
import type { Category } from "@/lib/types";

export function Footer({
  contact,
  footer,
  categories,
}: {
  contact: ContactContent;
  footer: FooterContent;
  categories: Category[];
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 steel-texture text-steel-300">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo variant="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-steel-400">
              {footer.tagline}
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
              Catalogue
            </h3>
            <ul className="space-y-2.5 text-sm">
              {categories.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/catalogue/${c.slug}`}
                    className="text-steel-400 transition-colors hover:text-brass-400"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
              Entreprise
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/a-propos" className="text-steel-400 hover:text-brass-400">À propos</Link></li>
              <li><Link href="/contact" className="text-steel-400 hover:text-brass-400">Contact</Link></li>
              <li><Link href="/devis" className="text-steel-400 hover:text-brass-400">Demander un devis</Link></li>
              <li><Link href="/login" className="text-steel-400 hover:text-brass-400">Espace personnel</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
              Nous contacter
            </h3>
            <ul className="space-y-3 text-sm">
              {contact.phones.slice(0, 2).map((p) => (
                <li key={p} className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" />
                  <a href={`tel:${p.replace(/\s/g, "")}`} className="text-steel-300 hover:text-white">
                    {p}
                  </a>
                </li>
              ))}
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" />
                <a href={`mailto:${contact.email}`} className="break-all text-steel-300 hover:text-white">
                  {contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" />
                <span className="text-steel-400">
                  {contact.address}
                  <br />
                  {contact.city}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-steel-800 pt-6 text-xs text-steel-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Fay &amp; Partenaires — Tous droits réservés.</p>
          <p className="text-steel-600">
            {contact.ifu} · {contact.rccm}
          </p>
        </div>
      </Container>
    </footer>
  );
}
