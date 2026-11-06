import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    redirect("/admin");
  }

  redirect("/dashboard");
}
