import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { UserRole } from "@prisma/client";
import { AdminLayoutShell } from "@/components/admin/AdminLayoutShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  return (
    <AdminLayoutShell user={{ name: user.name, email: user.email }}>
      {children}
    </AdminLayoutShell>
  );
}
