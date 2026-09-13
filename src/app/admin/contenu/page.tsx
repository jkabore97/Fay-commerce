import { PageHeader } from "@/components/ui/primitives";
import { ContentEditor } from "@/components/admin/content/content-editor";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { withDefaults, type SiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const staff = await requireAdmin();
  const supabase = createClient();

  const { data } = await supabase.from("site_content").select("key, value");
  const rows = (data as { key: string; value: unknown }[] | null) ?? [];
  const stored = new Map(rows.map((r) => [r.key, r.value]));

  // Merge each stored value over the built-in default so the editor is always
  // pre-filled and the site is never blank.
  const content: SiteContent = {
    hero: withDefaults("hero", stored.get("hero")),
    home: withDefaults("home", stored.get("home")),
    about: withDefaults("about", stored.get("about")),
    contact: withDefaults("contact", stored.get("contact")),
    seo: withDefaults("seo", stored.get("seo")),
    footer: withDefaults("footer", stored.get("footer")),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contenu du site"
        description={`Modifiez chaque partie de la vitrine — accueil, à propos, contact, référencement et pied de page. Connecté en tant que ${staff.full_name}.`}
      />
      <ContentEditor content={content} />
    </div>
  );
}
