import type { Metadata } from "next";
import { CheckCircle2, FileText } from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { FayMark } from "@/components/brand/logo";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { DynamicIcon } from "@/components/icons";
import { getSiteContent } from "@/lib/queries";
import { mediaUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Fay & Partenaires, fournisseur de boulonnerie et de fixations au Burkina Faso depuis 1998.",
};

export default async function AboutPage() {
  const { about, home } = await getSiteContent();
  const aboutImg = about.image_url?.startsWith("/")
    ? about.image_url
    : mediaUrl(about.image_url);

  return (
    <>
      <section className="steel-texture py-20 text-white">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-cobalt-400">
                  Depuis {about.founded_year}
                </p>
                <h1 className="mt-3 font-display text-4xl font-extrabold text-white sm:text-5xl">
                  {about.title}
                </h1>
                <p className="mt-5 text-xl text-steel-300">{about.lead}</p>
              </div>
            </Reveal>
            <Reveal delay={1}>
              <div className="relative">
                {aboutImg ? (
                  <img
                    src={aboutImg}
                    alt="Boulonnerie et fixations Fay & Partenaires"
                    className="w-full rotate-2 rounded-2xl border-4 border-white object-cover shadow-2xl"
                  />
                ) : (
                  <div className="flex items-center justify-center">
                    <FayMark className="h-56 w-56 text-cobalt-500/90 animate-spin-slow" />
                  </div>
                )}
                <div
                  className="pointer-events-none absolute -bottom-5 -left-5 h-24 w-24 bg-cobalt-500"
                  style={{ clipPath: "polygon(0 100%, 0 0, 100% 100%)" }}
                />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Stats */}
      <section className="border-b border-steel-100 bg-white py-12">
        <Container>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {about.stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-4xl font-extrabold text-cobalt-600">
                  {s.value}
                </p>
                <p className="mt-1 text-sm font-medium text-steel-500">{s.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Story */}
      <section className="py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="space-y-4">
              {about.body.map((para, i) => (
                <Reveal key={i} delay={i}>
                  <p className="text-lg leading-relaxed text-steel-600">{para}</p>
                </Reveal>
              ))}
            </div>
            <div>
              <Reveal>
                <h3 className="font-display text-xl font-bold text-steel-900">
                  Matériaux disponibles
                </h3>
              </Reveal>
              <RevealGroup className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {about.materials.map((m) => (
                  <Reveal key={m} as="div">
                    <div className="flex items-center gap-2.5 rounded-xl border border-steel-100 bg-white px-4 py-3 text-sm font-medium text-steel-700 shadow-card">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-cobalt-500" />
                      {m}
                    </div>
                  </Reveal>
                ))}
              </RevealGroup>
            </div>
          </div>
        </Container>
      </section>

      {/* Sectors */}
      <section className="bg-white py-20">
        <Container>
          <SectionHeading
            center
            eyebrow="Nos marchés"
            title={home.sectors_title}
            description={home.sectors_subtitle}
          />
          <RevealGroup className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.sectors.map((s) => (
              <Reveal key={s.name} as="div">
                <div className="flex items-center gap-4 rounded-2xl border border-steel-100 bg-white p-5 shadow-card">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cobalt-50 text-cobalt-600">
                    <DynamicIcon name={s.icon} className="h-6 w-6" />
                  </div>
                  <span className="font-semibold text-steel-800">{s.name}</span>
                </div>
              </Reveal>
            ))}
          </RevealGroup>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16">
        <Container>
          <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-steel-900 p-10 text-center sm:flex-row sm:text-left">
            <div>
              <h3 className="font-display text-2xl font-bold text-white">
                {home.cta_title}
              </h3>
              <p className="mt-2 text-steel-300">{home.cta_body}</p>
            </div>
            <LinkButton href="/devis" size="lg" className="shrink-0">
              <FileText className="h-5 w-5" /> Demander un devis
            </LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
