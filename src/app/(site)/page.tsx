import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  PackageCheck,
  Truck,
} from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { FayMark } from "@/components/brand/logo";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { CategoryCard } from "@/components/site/category-card";
import { ProductCard } from "@/components/site/product-card";
import { PartnersStrip } from "@/components/site/partners-strip";
import { DynamicIcon } from "@/components/icons";
import {
  getBanners,
  getPartners,
  getSiteContent,
  getStorefrontCategories,
  getStorefrontProducts,
} from "@/lib/queries";

export default async function HomePage() {
  const [content, categories, featured, promos, partners] = await Promise.all([
    getSiteContent(),
    getStorefrontCategories(),
    getStorefrontProducts({ featured: true, limit: 8 }),
    getBanners("promo"),
    getPartners(),
  ]);
  const { hero, home, about } = content;
  const promo = promos[0];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden steel-texture text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-steel-950/40 via-transparent to-brass-900/20" />
        <FayMark className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 text-steel-800/40 animate-spin-slow" />
        <Container className="relative py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-steel-700 bg-steel-900/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brass-400">
                  <BadgeCheck className="h-4 w-4" />
                  {hero.eyebrow}
                </span>
              </Reveal>
              <Reveal delay={1}>
                <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                  {hero.title}
                </h1>
              </Reveal>
              <Reveal delay={2}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-steel-300">
                  {hero.subtitle}
                </p>
              </Reveal>
              <Reveal delay={3}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <LinkButton href={hero.cta_href} size="lg">
                    <FileText className="h-5 w-5" /> {hero.cta_label}
                  </LinkButton>
                  <LinkButton
                    href={hero.secondary_href}
                    size="lg"
                    variant="outline"
                    className="border-steel-600 bg-transparent text-white hover:bg-steel-800"
                  >
                    {hero.secondary_label} <ArrowRight className="h-5 w-5" />
                  </LinkButton>
                </div>
              </Reveal>
              <Reveal delay={4}>
                <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-steel-400">
                  <span className="inline-flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-brass-500" /> Vente en gros / au lot
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brass-500" /> Devis gratuit
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Truck className="h-4 w-4 text-brass-500" /> Approvisionnement fiable
                  </span>
                </div>
              </Reveal>
            </div>

            {/* Stat cards */}
            <div className="lg:col-span-5">
              <Reveal delay={2}>
                <div className="grid grid-cols-2 gap-4">
                  {about.stats.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl border border-steel-700/60 bg-steel-900/50 p-5 backdrop-blur-sm"
                    >
                      <p className="font-display text-3xl font-extrabold text-brass-400">
                        {s.value}
                      </p>
                      <p className="mt-1 text-sm text-steel-300">{s.label}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Promo strip ──────────────────────────────────────────────────── */}
      {promo && (
        <section className="bg-brass-500">
          <Container className="flex flex-col items-center justify-between gap-3 py-4 text-center sm:flex-row sm:text-left">
            <div>
              <p className="font-display text-lg font-bold text-white">
                {promo.title}
              </p>
              {promo.subtitle && (
                <p className="text-sm text-brass-50">{promo.subtitle}</p>
              )}
            </div>
            {promo.cta_label && (
              <LinkButton
                href={promo.link_url || "/devis"}
                variant="secondary"
                className="shrink-0"
              >
                {promo.cta_label}
              </LinkButton>
            )}
          </Container>
        </section>
      )}

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="Notre catalogue"
            title={home.categories_title}
            description={home.categories_subtitle}
          />
          <RevealGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Reveal key={c.slug} as="div">
                <CategoryCard category={c} />
              </Reveal>
            ))}
          </RevealGroup>
        </Container>
      </section>

      {/* ── Featured products ────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="bg-white py-20">
          <Container>
            <div className="flex items-end justify-between gap-4">
              <SectionHeading
                eyebrow="Sélection"
                title={home.featured_title}
                description={home.featured_subtitle}
              />
              <Link
                href="/catalogue"
                className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-brass-600 hover:text-brass-700 sm:inline-flex"
              >
                Tout le catalogue <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <RevealGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((p) => (
                <Reveal key={p.id} as="div">
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </RevealGroup>
          </Container>
        </section>
      )}

      {/* ── Sectors ──────────────────────────────────────────────────────── */}
      <section className="py-20">
        <Container>
          <SectionHeading
            center
            eyebrow="Nos clients"
            title={home.sectors_title}
            description={home.sectors_subtitle}
          />
          <RevealGroup className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.sectors.map((s) => (
              <Reveal key={s.name} as="div">
                <div className="flex items-center gap-4 rounded-2xl border border-steel-100 bg-white p-5 shadow-card transition-colors hover:border-brass-200">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brass-50 text-brass-600">
                    <DynamicIcon name={s.icon} className="h-6 w-6" />
                  </div>
                  <span className="font-semibold text-steel-800">{s.name}</span>
                </div>
              </Reveal>
            ))}
          </RevealGroup>
        </Container>
      </section>

      {/* ── Why us ───────────────────────────────────────────────────────── */}
      <section className="steel-texture py-20 text-white">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <div>
                <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
                  {home.why_title}
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-steel-300">
                  {home.why_body}
                </p>
                <div className="mt-8 flex flex-wrap gap-2.5">
                  {about.materials.map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-steel-700 bg-steel-900/60 px-3.5 py-1.5 text-sm font-medium text-steel-200"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={1}>
              <div className="rounded-3xl border border-steel-700/60 bg-steel-900/50 p-8 backdrop-blur">
                <h3 className="font-display text-xl font-bold text-white">
                  {home.cta_title}
                </h3>
                <p className="mt-3 text-steel-300">{home.cta_body}</p>
                <LinkButton href="/devis" size="lg" className="mt-6 w-full">
                  <FileText className="h-5 w-5" /> Demander un devis gratuit
                </LinkButton>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ── Partners ─────────────────────────────────────────────────────── */}
      {partners.length > 0 && (
        <section className="border-t border-steel-100 bg-white py-16">
          <Container>
            <p className="mb-8 text-center text-sm font-semibold uppercase tracking-wider text-steel-400">
              Ils nous font confiance
            </p>
            <PartnersStrip partners={partners} />
          </Container>
        </section>
      )}
    </>
  );
}
