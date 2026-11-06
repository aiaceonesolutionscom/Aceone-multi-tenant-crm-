import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ClientLayoutShell } from "@/components/client/ClientLayoutShell";
import { WhatsAppMandatoryGate } from "@/components/client/WhatsAppMandatoryGate";

export const dynamic = "force-dynamic";

export default async function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    redirect("/admin");
  }

  if (!user.tenantId) {
    redirect("/login");
  }

  const enabledChannels = user.tenant?.enabledChannels || ["WHATSAPP", "GOOGLE_SHEETS"];
  const isWhatsAppEnabled = enabledChannels.includes("WHATSAPP");

  let isWhatsAppConnected = true;
  if (isWhatsAppEnabled && user.tenantId) {
    try {
      const gatewayRes = await fetch(
        `http://127.0.0.1:3001/status?tenantId=${user.tenantId}`,
        { cache: "no-store", next: { revalidate: 0 } }
      );
      if (gatewayRes.ok) {
        const json = await gatewayRes.json();
        isWhatsAppConnected = Boolean(json.isConnected);
      } else {
        isWhatsAppConnected = false;
      }
    } catch (_) {
      isWhatsAppConnected = false;
    }
  }

  // OWASP ASVS V8: Server-side enforced Access Control Gate
  // If WhatsApp is not connected, strictly block rendering of CRM data, sidebar, and children.
  if (isWhatsAppEnabled && !isWhatsAppConnected) {
    return (
      <div className="min-h-screen flex bg-slate-900/90 items-center justify-center p-4">
        <WhatsAppMandatoryGate
          enabledChannels={enabledChannels}
          isInitiallyConnected={false}
        />
      </div>
    );
  }

  return (
    <ClientLayoutShell
      user={{
        name: user.name,
        email: user.email,
        tenantName: user.tenant?.name,
      }}
      tenantName={user.tenant?.name || "Client Portal"}
      enabledChannels={enabledChannels}
    >
      {children}
    </ClientLayoutShell>
  );
}
