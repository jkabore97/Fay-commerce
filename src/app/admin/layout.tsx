import { AdminShell } from "@/components/admin/shell";
import { ToastProvider } from "@/components/ui/toast";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireStaff();
  return (
    <ToastProvider>
      <AdminShell fullName={staff.full_name} role={staff.role}>
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
