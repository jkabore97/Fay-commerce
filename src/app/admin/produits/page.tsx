import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { ProductsManager } from "@/components/admin/products/products-manager";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const staff = await requireStaff();
  const isAdmin = staff.role === "admin";
  const supabase = createClient();

  const [productsRes, categoriesRes] = await Promise.all([
    supabase.from("products").select("*, categories(name, slug)").order("name"),
    supabase
      .from("categories")
      .select("id, name, slug, sort_order")
      .order("sort_order"),
  ]);

  const products = productsRes.data ?? [];
  const categories = categoriesRes.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produits"
        description="Gérez votre catalogue : fiches produits, prix et visibilité sur la vitrine."
        actions={
          <LinkButton href="/admin/produits?nouveau=1">
            <Plus className="h-4 w-4" /> Nouveau produit
          </LinkButton>
        }
      />
      <ProductsManager
        products={products}
        categories={categories}
        isAdmin={isAdmin}
      />
    </div>
  );
}
