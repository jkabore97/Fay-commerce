// CMS content model + built-in defaults.
//
// Every editable piece of the vitrine is a keyed singleton in `site_content`.
// The defaults below are drawn from the Fay & Partenaires company profile so
// the site renders complete and on-brand BEFORE an admin has edited anything —
// and so `next build` never depends on a live database.

export interface HeroContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_href: string;
  secondary_label: string;
  secondary_href: string;
  background_url: string | null;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface AboutContent {
  title: string;
  lead: string;
  body: string[];
  founded_year: string;
  stats: StatItem[];
  materials: string[];
  image_url: string | null;
}

export interface SectorItem {
  name: string;
  icon: string; // lucide icon name
}

export interface ContactContent {
  phones: string[];
  email: string;
  address: string;
  city: string;
  hours: string;
  ifu: string;
  rccm: string;
  cne: string;
  regime: string;
  map_embed: string | null;
}

export interface HomeContent {
  categories_title: string;
  categories_subtitle: string;
  featured_title: string;
  featured_subtitle: string;
  sectors_title: string;
  sectors_subtitle: string;
  sectors: SectorItem[];
  why_title: string;
  why_body: string;
  cta_title: string;
  cta_body: string;
}

export interface SeoContent {
  title: string;
  description: string;
  keywords: string;
}

export interface FooterContent {
  tagline: string;
}

export interface SiteContent {
  hero: HeroContent;
  about: AboutContent;
  contact: ContactContent;
  home: HomeContent;
  seo: SeoContent;
  footer: FooterContent;
}

export const CONTENT_KEYS = [
  "hero",
  "about",
  "contact",
  "home",
  "seo",
  "footer",
] as const;

export type ContentKey = (typeof CONTENT_KEYS)[number];

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    eyebrow: "Commerce Général · Spécialiste en boulonnerie",
    title: "La fixation qui tient votre production",
    subtitle:
      "Boulons, vis, écrous, rondelles, tiges d'ancrage et roulements — pour l'industrie, le BTP, les mines et l'agroalimentaire. Fournisseur de fixations au Burkina Faso depuis 1998.",
    cta_label: "Demander un devis",
    cta_href: "/devis",
    secondary_label: "Parcourir le catalogue",
    secondary_href: "/catalogue",
    background_url: null,
  },
  about: {
    title: "À propos de Fay & Partenaires",
    lead: "Un distributeur à service complet de boulonnerie et de composants d'assemblage.",
    body: [
      "FAY & Partenaires est une entreprise spécialisée dans la quincaillerie, la boulonnerie, les écrous, vis, rondelles et autres types de fixations. Notre bureau principal est situé à Ouagadougou (Goughin).",
      "Créée en 1998 en tant que fournisseur leader de fixations au Burkina Faso, notre objectif est de fournir des produits de qualité et des services fiables pour répondre aux besoins des marchés locaux et régionaux.",
      "Nous fournissons principalement les usines : réseautage, gabarits et fabrication, automatisation, outillage, industries alimentaires, transport et emballage, mobilier et rénovation, BTP, mines et carrières.",
    ],
    founded_year: "1998",
    stats: [
      { value: "1998", label: "Année de création" },
      { value: "25+", label: "Ans d'expérience" },
      { value: "6", label: "Familles de produits" },
      { value: "9", label: "Matériaux disponibles" },
    ],
    materials: [
      "Acier inoxydable",
      "Acier allié",
      "Acier au carbone",
      "Acier doux",
      "Laiton",
      "Nylon",
      "Zinc",
      "Galvanisé à chaud",
      "Aluminium",
    ],
    image_url: null,
  },
  contact: {
    phones: ["+226 70 50 30 34", "+226 76 80 09 97", "+226 79 77 71 73"],
    email: "fayetpartenaires@gmail.com",
    address: "08 BP 11229 Ouaga 01 — Goughin, Secteur 7",
    city: "Ouagadougou, Burkina Faso",
    hours: "Lun – Sam : 08h00 – 18h00",
    ifu: "IFU N° 001610307 L",
    rccm: "RCCM N° BF OUA 2021 A 7319",
    cne: "Compte CNE N° 01006-03750400467-24",
    regime: "Régime CME — Secteur 7",
    map_embed: null,
  },
  home: {
    categories_title: "Nos familles de produits",
    categories_subtitle:
      "Une gamme complète de fixations pour chaque besoin d'assemblage.",
    featured_title: "Produits en avant",
    featured_subtitle: "Une sélection de nos références les plus demandées.",
    sectors_title: "Les secteurs que nous servons",
    sectors_subtitle:
      "Nous sécurisons la chaîne d'approvisionnement des industries du Burkina et de la région.",
    sectors: [
      { name: "BTP & Construction", icon: "Building2" },
      { name: "Mines & Carrières", icon: "Mountain" },
      { name: "Industrie alimentaire", icon: "Wheat" },
      { name: "Automatisation & Outillage", icon: "Cog" },
      { name: "Transport & Emballage", icon: "Truck" },
      { name: "Mobilier & Rénovation", icon: "Hammer" },
    ],
    why_title: "Pourquoi nous choisir ?",
    why_body:
      "Ayant en son sein une équipe présente dans le domaine depuis 1998, Fay & Partenaires a été fondée sur des valeurs de travail acharné et de dévouement au service du client. Notre attachement à ces valeurs et nos investissements dans les nouvelles technologies font de nous le choix évident pour sécuriser votre chaîne d'approvisionnement.",
    cta_title: "Vous ne trouvez pas ce que vous cherchez ?",
    cta_body:
      "Un devis gratuit et des services sur place sont disponibles. Contactez-nous pour toute demande spécifique.",
  },
  seo: {
    title: "Fay & Partenaires — Boulonnerie & fixations au Burkina Faso",
    description:
      "Spécialiste en boulonnerie depuis 1998 à Ouagadougou : boulons, vis, écrous, rondelles, tiges d'ancrage et roulements pour l'industrie, le BTP et les mines. Demandez votre devis gratuit.",
    keywords:
      "boulonnerie, visserie, écrous, rondelles, roulements, fixations, quincaillerie, Ouagadougou, Burkina Faso, BTP, industrie, mines",
  },
  footer: {
    tagline:
      "Spécialiste en boulonnerie et composants d'assemblage — Ouagadougou, depuis 1998.",
  },
};

// The six fastener families from the company profile — used to seed the
// database and as a fallback if the DB has no categories yet.
export const DEFAULT_CATEGORIES = [
  {
    slug: "boulonnerie",
    name: "Boulonnerie",
    description:
      "Boulons de tous types et diamètres, en acier et matériaux spéciaux.",
  },
  {
    slug: "visserie",
    name: "Visserie",
    description: "Vis pour métal, bois et applications techniques.",
  },
  {
    slug: "ecrous",
    name: "Écrous",
    description: "Écrous hexagonaux, freins, borgnes et à embase.",
  },
  {
    slug: "rondelles",
    name: "Rondelles",
    description: "Rondelles plates, éventail, grower et de blocage.",
  },
  {
    slug: "tiges-d-ancrage",
    name: "Tiges d'ancrage",
    description: "Tiges filetées et d'ancrage pour le génie civil.",
  },
  {
    slug: "roulements",
    name: "Roulements",
    description: "Roulements à billes et à rouleaux pour la mécanique.",
  },
];

/** Merge a partial DB-stored value over the built-in default for a key. */
export function withDefaults<K extends ContentKey>(
  key: K,
  stored: unknown,
): SiteContent[K] {
  const base = DEFAULT_CONTENT[key];
  if (!stored || typeof stored !== "object") return base;
  return { ...base, ...(stored as object) } as SiteContent[K];
}
