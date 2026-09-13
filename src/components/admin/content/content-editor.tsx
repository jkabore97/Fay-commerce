"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/image-upload";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  AboutContent,
  ContactContent,
  ContentKey,
  FooterContent,
  HeroContent,
  HomeContent,
  SeoContent,
  SectorItem,
  SiteContent,
  StatItem,
} from "@/lib/content";

const SECTOR_ICONS =
  "Building2, Mountain, Wheat, Cog, Truck, Hammer, Bolt, Wrench, Anchor, Package";

const TABS = [
  { id: "accueil", label: "Accueil" },
  { id: "about", label: "À propos" },
  { id: "contact", label: "Contact" },
  { id: "seo", label: "SEO" },
  { id: "footer", label: "Pied de page" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Shared save hook ─────────────────────────────────────────────────────────
/** Upsert a single site_content key; refresh + toast on success. */
function useUpsertKey(key: ContentKey) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const save = async (value: unknown) => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("site_content")
        .upsert({ key, value }, { onConflict: "key" });
      if (error) throw error;
      toast("Contenu enregistré.", "success");
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de l'enregistrement.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return { save, saving };
}

// ── Layout helper ────────────────────────────────────────────────────────────
function SectionCard({
  title,
  description,
  children,
  onSave,
  saving,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="font-display text-base font-bold text-steel-900">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-steel-500">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
      <div className="mt-6 flex justify-end border-t border-steel-100 pt-4">
        <Button type="button" onClick={onSave} loading={saving}>
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
      </div>
    </Card>
  );
}

// ── Reusable: string list editor ─────────────────────────────────────────────
function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
  addLabel = "Ajouter",
  multiline = false,
  hint,
}: {
  label?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  multiline?: boolean;
  hint?: string;
}) {
  const update = (i: number, v: string) =>
    onChange(items.map((it, idx) => (idx === i ? v : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);

  return (
    <div className="w-full">
      {label && <Label>{label}</Label>}
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-steel-400">Aucun élément pour l'instant.</p>
        )}
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-2">
            {multiline ? (
              <Textarea
                value={it}
                onChange={(e) => update(i, e.target.value)}
                placeholder={placeholder}
                className="min-h-[72px]"
              />
            ) : (
              <Input
                value={it}
                onChange={(e) => update(i, e.target.value)}
                placeholder={placeholder}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => remove(i)}
              title="Retirer"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Retirer</span>
            </Button>
          </div>
        ))}
      </div>
      {hint && <p className="mt-1 text-xs text-steel-500">{hint}</p>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={add}
      >
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

// ── Reusable: object list editor ─────────────────────────────────────────────
function ObjectListEditor<T extends object>({
  label,
  items,
  onChange,
  fields,
  empty,
  addLabel = "Ajouter",
  hint,
}: {
  label?: string;
  items: T[];
  onChange: (items: T[]) => void;
  fields: { key: keyof T; label: string; placeholder?: string }[];
  empty: T;
  addLabel?: string;
  hint?: string;
}) {
  const update = (i: number, key: keyof T, v: string) =>
    onChange(
      items.map((it, idx) => (idx === i ? ({ ...it, [key]: v } as T) : it)),
    );
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { ...empty }]);

  return (
    <div className="w-full">
      {label && <Label>{label}</Label>}
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-steel-400">Aucun élément pour l'instant.</p>
        )}
        {items.map((it, i) => (
          <div
            key={i}
            className="flex items-end gap-2 rounded-xl border border-steel-100 bg-steel-50/50 p-3"
          >
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <Field key={String(f.key)} label={f.label}>
                  <Input
                    value={String(it[f.key] ?? "")}
                    onChange={(e) => update(i, f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </Field>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => remove(i)}
              title="Retirer"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Retirer</span>
            </Button>
          </div>
        ))}
      </div>
      {hint && <p className="mt-1 text-xs text-steel-500">{hint}</p>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={add}
      >
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

// ── Hero section (key: hero) ─────────────────────────────────────────────────
function HeroSection({ value }: { value: HeroContent }) {
  const { save, saving } = useUpsertKey("hero");
  const [form, setForm] = useState<HeroContent>(value);
  const set = (patch: Partial<HeroContent>) =>
    setForm((f) => ({ ...f, ...patch }));

  return (
    <SectionCard
      title="Section d'accroche (hero)"
      description="Le grand bandeau en haut de la page d'accueil."
      onSave={() => save(form)}
      saving={saving}
    >
      <Field label="Sur-titre">
        <Input
          value={form.eyebrow}
          onChange={(e) => set({ eyebrow: e.target.value })}
          placeholder="Commerce Général · Spécialiste en boulonnerie"
        />
      </Field>
      <Field label="Titre">
        <Input
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="La fixation qui tient votre production"
        />
      </Field>
      <Field label="Sous-titre">
        <Textarea
          value={form.subtitle}
          onChange={(e) => set({ subtitle: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bouton principal — libellé">
          <Input
            value={form.cta_label}
            onChange={(e) => set({ cta_label: e.target.value })}
            placeholder="Demander un devis"
          />
        </Field>
        <Field label="Bouton principal — lien">
          <Input
            value={form.cta_href}
            onChange={(e) => set({ cta_href: e.target.value })}
            placeholder="/devis"
          />
        </Field>
        <Field label="Bouton secondaire — libellé">
          <Input
            value={form.secondary_label}
            onChange={(e) => set({ secondary_label: e.target.value })}
            placeholder="Parcourir le catalogue"
          />
        </Field>
        <Field label="Bouton secondaire — lien">
          <Input
            value={form.secondary_href}
            onChange={(e) => set({ secondary_href: e.target.value })}
            placeholder="/catalogue"
          />
        </Field>
      </div>
      <ImageUpload
        value={form.background_url}
        onChange={(v) => set({ background_url: v })}
        folder="site"
        label="Image de fond"
      />
    </SectionCard>
  );
}

// ── Home sections (key: home) ────────────────────────────────────────────────
function HomeSection({ value }: { value: HomeContent }) {
  const { save, saving } = useUpsertKey("home");
  const [form, setForm] = useState<HomeContent>(value);
  const set = (patch: Partial<HomeContent>) =>
    setForm((f) => ({ ...f, ...patch }));

  return (
    <SectionCard
      title="Sections de la page d'accueil"
      description="Titres et sous-titres des blocs de la page d'accueil, et la liste des secteurs servis."
      onSave={() => save(form)}
      saving={saving}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Familles de produits — titre">
          <Input
            value={form.categories_title}
            onChange={(e) => set({ categories_title: e.target.value })}
          />
        </Field>
        <Field label="Familles de produits — sous-titre">
          <Input
            value={form.categories_subtitle}
            onChange={(e) => set({ categories_subtitle: e.target.value })}
          />
        </Field>
        <Field label="Produits en avant — titre">
          <Input
            value={form.featured_title}
            onChange={(e) => set({ featured_title: e.target.value })}
          />
        </Field>
        <Field label="Produits en avant — sous-titre">
          <Input
            value={form.featured_subtitle}
            onChange={(e) => set({ featured_subtitle: e.target.value })}
          />
        </Field>
        <Field label="Secteurs — titre">
          <Input
            value={form.sectors_title}
            onChange={(e) => set({ sectors_title: e.target.value })}
          />
        </Field>
        <Field label="Secteurs — sous-titre">
          <Input
            value={form.sectors_subtitle}
            onChange={(e) => set({ sectors_subtitle: e.target.value })}
          />
        </Field>
      </div>

      <ObjectListEditor<SectorItem>
        label="Secteurs servis"
        items={form.sectors}
        onChange={(sectors) => set({ sectors })}
        fields={[
          {
            key: "name",
            label: "Nom du secteur",
            placeholder: "Ex. BTP & Construction",
          },
          { key: "icon", label: "Icône (nom lucide)", placeholder: "Building2" },
        ]}
        empty={{ name: "", icon: "" }}
        addLabel="Ajouter un secteur"
        hint={`Icônes disponibles : ${SECTOR_ICONS}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bloc « Pourquoi nous choisir » — titre">
          <Input
            value={form.why_title}
            onChange={(e) => set({ why_title: e.target.value })}
          />
        </Field>
        <Field label="Bloc final (CTA) — titre">
          <Input
            value={form.cta_title}
            onChange={(e) => set({ cta_title: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Bloc « Pourquoi nous choisir » — texte">
        <Textarea
          value={form.why_body}
          onChange={(e) => set({ why_body: e.target.value })}
        />
      </Field>
      <Field label="Bloc final (CTA) — texte">
        <Textarea
          value={form.cta_body}
          onChange={(e) => set({ cta_body: e.target.value })}
        />
      </Field>
    </SectionCard>
  );
}

// ── About section (key: about) ───────────────────────────────────────────────
function AboutSection({ value }: { value: AboutContent }) {
  const { save, saving } = useUpsertKey("about");
  const [form, setForm] = useState<AboutContent>(value);
  const set = (patch: Partial<AboutContent>) =>
    setForm((f) => ({ ...f, ...patch }));

  return (
    <SectionCard
      title="À propos"
      description="La page de présentation de l'entreprise."
      onSave={() => save(form)}
      saving={saving}
    >
      <Field label="Titre">
        <Input
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
        />
      </Field>
      <Field label="Accroche">
        <Textarea
          value={form.lead}
          onChange={(e) => set({ lead: e.target.value })}
        />
      </Field>

      <StringListEditor
        label="Paragraphes du corps de texte"
        items={form.body}
        onChange={(body) => set({ body })}
        multiline
        placeholder="Un paragraphe de présentation…"
        addLabel="Ajouter un paragraphe"
      />

      <Field label="Année de création" className="sm:max-w-xs">
        <Input
          value={form.founded_year}
          onChange={(e) => set({ founded_year: e.target.value })}
          placeholder="1998"
        />
      </Field>

      <ObjectListEditor<StatItem>
        label="Chiffres clés"
        items={form.stats}
        onChange={(stats) => set({ stats })}
        fields={[
          { key: "value", label: "Valeur", placeholder: "25+" },
          { key: "label", label: "Libellé", placeholder: "Ans d'expérience" },
        ]}
        empty={{ value: "", label: "" }}
        addLabel="Ajouter un chiffre clé"
      />

      <StringListEditor
        label="Matériaux disponibles"
        items={form.materials}
        onChange={(materials) => set({ materials })}
        placeholder="Ex. Acier inoxydable"
        addLabel="Ajouter un matériau"
      />

      <ImageUpload
        value={form.image_url}
        onChange={(v) => set({ image_url: v })}
        folder="site"
        label="Image"
      />
    </SectionCard>
  );
}

// ── Contact section (key: contact) ───────────────────────────────────────────
function ContactSection({ value }: { value: ContactContent }) {
  const { save, saving } = useUpsertKey("contact");
  const [form, setForm] = useState<ContactContent>(value);
  const set = (patch: Partial<ContactContent>) =>
    setForm((f) => ({ ...f, ...patch }));

  return (
    <SectionCard
      title="Coordonnées"
      description="Les informations de contact et les mentions légales affichées sur le site."
      onSave={() => save(form)}
      saving={saving}
    >
      <StringListEditor
        label="Téléphones"
        items={form.phones}
        onChange={(phones) => set({ phones })}
        placeholder="+226 70 00 00 00"
        addLabel="Ajouter un numéro"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="contact@exemple.bf"
          />
        </Field>
        <Field label="Horaires">
          <Input
            value={form.hours}
            onChange={(e) => set({ hours: e.target.value })}
            placeholder="Lun – Sam : 08h00 – 18h00"
          />
        </Field>
        <Field label="Adresse">
          <Input
            value={form.address}
            onChange={(e) => set({ address: e.target.value })}
          />
        </Field>
        <Field label="Ville">
          <Input
            value={form.city}
            onChange={(e) => set({ city: e.target.value })}
            placeholder="Ouagadougou, Burkina Faso"
          />
        </Field>
        <Field label="IFU">
          <Input
            value={form.ifu}
            onChange={(e) => set({ ifu: e.target.value })}
          />
        </Field>
        <Field label="RCCM">
          <Input
            value={form.rccm}
            onChange={(e) => set({ rccm: e.target.value })}
          />
        </Field>
        <Field label="Compte CNE">
          <Input
            value={form.cne}
            onChange={(e) => set({ cne: e.target.value })}
          />
        </Field>
        <Field label="Régime fiscal">
          <Input
            value={form.regime}
            onChange={(e) => set({ regime: e.target.value })}
          />
        </Field>
      </div>

      <Field
        label="Carte (code d'intégration)"
        hint="Collez le code <iframe> d'une carte Google Maps (optionnel)."
      >
        <Textarea
          value={form.map_embed ?? ""}
          onChange={(e) => set({ map_embed: e.target.value || null })}
          placeholder='<iframe src="https://www.google.com/maps/embed?…"></iframe>'
          className="font-mono text-xs"
        />
      </Field>
    </SectionCard>
  );
}

// ── SEO section (key: seo) ───────────────────────────────────────────────────
function SeoSection({ value }: { value: SeoContent }) {
  const { save, saving } = useUpsertKey("seo");
  const [form, setForm] = useState<SeoContent>(value);
  const set = (patch: Partial<SeoContent>) =>
    setForm((f) => ({ ...f, ...patch }));

  return (
    <SectionCard
      title="Référencement (SEO)"
      description="Le titre, la description et les mots-clés utilisés par les moteurs de recherche."
      onSave={() => save(form)}
      saving={saving}
    >
      <Field label="Titre de la page">
        <Input
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
        />
      </Field>
      <Field
        label="Description"
        hint="Idéalement entre 120 et 160 caractères."
      >
        <Textarea
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
      <Field label="Mots-clés" hint="Séparés par des virgules.">
        <Textarea
          value={form.keywords}
          onChange={(e) => set({ keywords: e.target.value })}
        />
      </Field>
    </SectionCard>
  );
}

// ── Footer section (key: footer) ─────────────────────────────────────────────
function FooterSection({ value }: { value: FooterContent }) {
  const { save, saving } = useUpsertKey("footer");
  const [form, setForm] = useState<FooterContent>(value);
  const set = (patch: Partial<FooterContent>) =>
    setForm((f) => ({ ...f, ...patch }));

  return (
    <SectionCard
      title="Pied de page"
      description="Le court texte de présentation affiché dans le pied de page du site."
      onSave={() => save(form)}
      saving={saving}
    >
      <Field label="Slogan">
        <Textarea
          value={form.tagline}
          onChange={(e) => set({ tagline: e.target.value })}
        />
      </Field>
    </SectionCard>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export function ContentEditor({ content }: { content: SiteContent }) {
  const [active, setActive] = useState<TabId>("accueil");

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-steel-100">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={cn(
              "-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              active === t.id
                ? "border-brass-500 text-brass-700"
                : "border-transparent text-steel-500 hover:text-steel-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {active === "accueil" && (
        <div className="space-y-6">
          <HeroSection value={content.hero} />
          <HomeSection value={content.home} />
        </div>
      )}
      {active === "about" && <AboutSection value={content.about} />}
      {active === "contact" && <ContactSection value={content.contact} />}
      {active === "seo" && <SeoSection value={content.seo} />}
      {active === "footer" && <FooterSection value={content.footer} />}
    </div>
  );
}
