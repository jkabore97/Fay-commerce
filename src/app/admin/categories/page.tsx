import { PageHeader } from "@/components/ui/primitives";
import { CategoriesManager } from "@/components/admin/categories/categories-manager";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const staff = await requireStaff();
  const isAdmin = staff.role === "admin";
  const supabase = createClient();

  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const categories = (data as Category[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catégories"
        description="Les familles de produits affichées sur la vitrine et utilisées pour classer le catalogue."
      />
      <CategoriesManager categories={categories} isAdmin={isAdmin} />
    </div>
  );
}
