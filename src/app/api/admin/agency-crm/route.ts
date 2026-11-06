import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant-guard";
import { LeadStatus } from "@prisma/client";

export async function GET() {
  try {
    await requireSuperAdmin();

    let internalTenant = await prisma.tenant.findFirst({
      where: { isInternal: true },
    });

    if (!internalTenant) {
      internalTenant = await prisma.tenant.create({
        data: {
          name: "AceOne Solutions (Agency Inquiries)",
          companyEmail: "inquiries@aceonesolutions.com",
          contactPerson: "AceOne Agency Admin",
          isInternal: true,
          status: "ACTIVE",
        },
      });
    }

    const tenantId = internalTenant.id;

    const [
      totalLeads,
      newLeads,
      contactedLeads,
      interestedLeads,
      convertedLeads,
      lostLeads,
      whatsappLeads,
      googleFormLeads,
      recentLeads,
      sources,
    ] = await Promise.all([
      prisma.lead.count({ where: { tenantId } }),
      prisma.lead.count({ where: { tenantId, status: LeadStatus.NEW } }),
      prisma.lead.count({ where: { tenantId, status: LeadStatus.CONTACTED } }),
      prisma.lead.count({ where: { tenantId, status: LeadStatus.INTERESTED } }),
      prisma.lead.count({ where: { tenantId, status: LeadStatus.CONVERTED } }),
      prisma.lead.count({ where: { tenantId, status: LeadStatus.LOST } }),
      prisma.lead.count({ where: { tenantId, platform: "whatsapp" } }),
      prisma.lead.count({
        where: { tenantId, platform: { in: ["google_forms", "google_sheets"] } },
      }),
      prisma.lead.findMany({
        where: { tenantId },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          ingestionSource: { select: { name: true, type: true } },
        },
      }),
      prisma.ingestionSource.findMany({
        where: { tenantId },
        include: { _count: { select: { leads: true } } },
      }),
    ]);

    const conversionRate =
      totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0.0";

    return NextResponse.json({
      internalTenant,
      metrics: {
        totalLeads,
        newLeads,
        contactedLeads,
        interestedLeads,
        convertedLeads,
        lostLeads,
        whatsappLeads,
        googleFormLeads,
        conversionRate,
      },
      recentLeads,
      sources,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
