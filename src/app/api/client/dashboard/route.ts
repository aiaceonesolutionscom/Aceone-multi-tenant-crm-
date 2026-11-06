import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";
import { LeadStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { tenantId, portfolioId } = await requireClientContext();
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";

    // Date filter calculation
    let dateFilter: Date | undefined;
    const now = new Date();
    if (range === "today") {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "7d") {
      dateFilter = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    } else if (range === "30d") {
      dateFilter = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    }

    const baseWhere = {
      tenantId,
      ...(dateFilter && { createdAt: { gte: dateFilter } }),
    };

    const [
      totalLeads,
      newLeads,
      contactedLeads,
      interestedLeads,
      convertedLeads,
      lostLeads,
      whatsappLeads,
      sheetsLeads,
      recentLeads,
      pendingFollowUps,
      portfolio,
      whatsappSource,
    ] = await Promise.all([
      prisma.lead.count({ where: baseWhere }),
      prisma.lead.count({ where: { ...baseWhere, status: LeadStatus.NEW } }),
      prisma.lead.count({ where: { ...baseWhere, status: LeadStatus.CONTACTED } }),
      prisma.lead.count({ where: { ...baseWhere, status: LeadStatus.INTERESTED } }),
      prisma.lead.count({ where: { ...baseWhere, status: LeadStatus.CONVERTED } }),
      prisma.lead.count({ where: { ...baseWhere, status: LeadStatus.LOST } }),
      prisma.lead.count({ where: { ...baseWhere, platform: "whatsapp" } }),
      prisma.lead.count({
        where: {
          ...baseWhere,
          platform: { in: ["google_sheets", "google_forms", "google_sheet"] },
        },
      }),
      prisma.lead.findMany({
        where: { tenantId },
        take: 6,
        orderBy: { updatedAt: "desc" },
        include: {
          campaign: { select: { name: true } },
          metaForm: { select: { name: true } },
        },
      }),
      prisma.followUp.findMany({
        where: {
          tenantId,
          status: "PENDING",
        },
        take: 5,
        orderBy: { scheduledAt: "asc" },
        include: {
          lead: { select: { id: true, leadNumber: true, fullName: true, phone: true } },
        },
      }),
      portfolioId
        ? prisma.businessPortfolio.findUnique({
            where: { id: portfolioId },
            select: { name: true, metaBusinessId: true, status: true },
          })
        : null,
      prisma.ingestionSource.findFirst({
        where: { tenantId, type: "WHATSAPP" },
        select: { name: true, fieldMapping: true, lastReceivedAt: true, isActive: true },
      }),
    ]);

    // 7-day daily WhatsApp inquiry trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const pastLeads = await prisma.lead.findMany({
      where: {
        tenantId,
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true },
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyActivity: Array<{ day: string; date: string; inquiries: number }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = dayNames[d.getDay()];
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      const count = pastLeads.filter((l) => {
        const lDate = `${l.createdAt.getFullYear()}-${pad(l.createdAt.getMonth() + 1)}-${pad(l.createdAt.getDate())}`;
        return lDate === dateKey;
      }).length;

      dailyActivity.push({
        day: dayStr,
        date: dateKey,
        inquiries: count,
      });
    }

    const otherLeads = Math.max(0, totalLeads - (whatsappLeads + sheetsLeads));
    const conversionRate =
      totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0.0";

    const connectedPhone =
      (portfolio as any)?.fieldMapping?.connectedPhone ||
      (whatsappSource?.fieldMapping as any)?.connectedPhone ||
      null;

    return NextResponse.json({
      metrics: {
        totalLeads,
        newLeads,
        contactedLeads,
        interestedLeads,
        convertedLeads,
        lostLeads,
        conversionRate,
        whatsappLeads,
        sheetsLeads,
        otherLeads,
        facebookLeads: whatsappLeads, // backward compatibility
        instagramLeads: sheetsLeads,
      },
      dailyActivity,
      hotline: {
        phone: connectedPhone,
        name: whatsappSource?.name || "WhatsApp Business Hotline",
        lastReceivedAt: whatsappSource?.lastReceivedAt,
        isActive: whatsappSource?.isActive ?? true,
      },
      portfolio,
      recentLeads,
      pendingFollowUps,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
