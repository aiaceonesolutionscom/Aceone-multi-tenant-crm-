import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";
import { LeadStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireClientContext();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as LeadStatus | null;
    const platform = searchParams.get("platform");
    const sourceType = searchParams.get("sourceType") as any;
    const sourceId = searchParams.get("sourceId");
    const campaignId = searchParams.get("campaignId");
    const formId = searchParams.get("formId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const skip = (page - 1) * limit;

    const fromDate = searchParams.get("fromDate") || searchParams.get("startDate");
    const toDate = searchParams.get("toDate") || searchParams.get("endDate");
    const hasNotes = searchParams.get("hasNotes");
    const hasFollowUp = searchParams.get("hasFollowUp");

    const where: any = {
      tenantId,
      ...(status && { status }),
      ...(platform && { platform }),
      ...(sourceType === "GOOGLE_SHEET_FORM"
        ? { sourceType: { in: ["GOOGLE_FORM", "GOOGLE_SHEET"] } }
        : sourceType
        ? { sourceType }
        : {}),
      ...(sourceId && { ingestionSourceId: sourceId }),
      ...(campaignId && { campaignId }),
      ...(formId && { metaFormId: formId }),
      ...(hasNotes === "true" ? { notes: { some: { NOT: [{ content: { startsWith: "[" } }] } } } : {}),
      ...(hasFollowUp === "true" ? { followUps: { some: { status: "PENDING" } } } : {}),
    };

    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) {
        const parsedStart = new Date(fromDate);
        if (!isNaN(parsedStart.getTime())) {
          parsedStart.setHours(0, 0, 0, 0);
          dateFilter.gte = parsedStart;
        }
      }
      if (toDate) {
        const parsedEnd = new Date(toDate);
        if (!isNaN(parsedEnd.getTime())) {
          parsedEnd.setHours(23, 59, 59, 999);
          dateFilter.lte = parsedEnd;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        where.createdAt = dateFilter;
      }
    }

    if (search.trim()) {
      const q = search.trim();
      const asNum = parseInt(q, 10);
      const cleanDigits = q.replace(/\D/g, "");
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        ...(cleanDigits.length >= 4 ? [{ phone: { contains: cleanDigits } }] : []),
        { email: { contains: q, mode: "insensitive" } },
        { interestedService: { contains: q, mode: "insensitive" } },
        { notesSummary: { contains: q, mode: "insensitive" } },
        { notes: { some: { content: { contains: q, mode: "insensitive" } } } },
        ...(!isNaN(asNum) ? [{ leadNumber: asNum }] : []),
      ];
    }

    const [leads, totalCount, campaigns, forms, sources, currentTenant] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          campaign: { select: { id: true, name: true } },
          ad: { select: { id: true, name: true } },
          metaForm: { select: { id: true, name: true } },
          facebookPage: { select: { id: true, name: true } },
          ingestionSource: { select: { id: true, name: true, type: true } },
          notes: {
            take: 20,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              content: true,
              createdAt: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      prisma.lead.count({ where }),
      prisma.campaign.findMany({
        where: { leads: { some: { tenantId } } },
        select: { id: true, name: true },
      }),
      prisma.metaForm.findMany({
        where: { leads: { some: { tenantId } } },
        select: { id: true, name: true },
      }),
      prisma.ingestionSource.findMany({
        where: { tenantId },
        select: { id: true, name: true, type: true },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { enabledChannels: true },
      }),
    ]);

    const leadsFormatted = leads.map((lead) => {
      const whatsappMessages = lead.notes
        .filter((n) => n.content.startsWith("[Inbound") || n.content.startsWith("[Outbound"))
        .slice(0, 3);
      const latestStaffNote = lead.notes.find(
        (n) => !n.content.startsWith("[Inbound") && !n.content.startsWith("[Outbound")
      ) || null;

      return {
        ...lead,
        whatsappMessages,
        latestStaffNote,
        notes: whatsappMessages,
      };
    });

    return NextResponse.json({
      leads: leadsFormatted,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      filterOptions: {
        campaigns,
        forms,
        sources,
        enabledChannels: currentTenant?.enabledChannels || ["WHATSAPP", "GOOGLE_SHEETS"],
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
