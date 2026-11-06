import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant-guard";

export async function GET() {
  try {
    await requireSuperAdmin();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalClients,
      activeClients,
      inactiveClients,
      totalSources,
      totalLeads,
      leadsToday,
      recentLeads,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: "ACTIVE" } }),
      prisma.tenant.count({ where: { status: { not: "ACTIVE" } } }),
      prisma.ingestionSource.count(),
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.lead.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: { select: { name: true } },
          metaForm: { select: { name: true } },
        },
      }),
      prisma.auditLog.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      metrics: {
        totalClients,
        activeClients,
        inactiveClients,
        totalSources,
        totalLeads,
        leadsToday,
      },
      recentLeads,
      recentAuditLogs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
