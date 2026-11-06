import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant-guard";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const fromDate = searchParams.get("fromDate") || searchParams.get("startDate");
    const toDate = searchParams.get("toDate") || searchParams.get("endDate");

    const where: any = {
      ...(tenantId && { tenantId }),
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

    const leads = await prisma.lead.findMany({
      where,
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        tenant: { select: { id: true, name: true } },
        campaign: { select: { name: true } },
        ad: { select: { name: true } },
        metaForm: { select: { name: true } },
      },
    });

    return NextResponse.json({ leads });
  } catch (error) {
    return handleApiError(error);
  }
}
