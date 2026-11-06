import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";
import { LeadStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { tenantId } = await requireClientContext();

    const leads = await prisma.lead.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: { select: { name: true } },
        ad: { select: { name: true } },
      },
    });

    const columns: Record<LeadStatus, any[]> = {
      [LeadStatus.NEW]: [],
      [LeadStatus.CONTACTED]: [],
      [LeadStatus.INTERESTED]: [],
      [LeadStatus.CONVERTED]: [],
      [LeadStatus.LOST]: [],
    };

    for (const lead of leads) {
      if (columns[lead.status]) {
        columns[lead.status].push(lead);
      }
    }

    return NextResponse.json({
      columns,
      counts: {
        [LeadStatus.NEW]: columns[LeadStatus.NEW].length,
        [LeadStatus.CONTACTED]: columns[LeadStatus.CONTACTED].length,
        [LeadStatus.INTERESTED]: columns[LeadStatus.INTERESTED].length,
        [LeadStatus.CONVERTED]: columns[LeadStatus.CONVERTED].length,
        [LeadStatus.LOST]: columns[LeadStatus.LOST].length,
        total: leads.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, tenantId } = await requireClientContext();
    const body = await req.json();
    const { leadId, newStatus } = body;

    if (!leadId || !newStatus) {
      return NextResponse.json({ error: "leadId and newStatus are required" }, { status: 400 });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (lead.status !== newStatus) {
      await prisma.$transaction(async (tx) => {
        await tx.leadStatusHistory.create({
          data: {
            leadId,
            userId: user.id,
            previousStatus: lead.status,
            newStatus,
            reason: `Pipeline Kanban drag transition: ${lead.status} -> ${newStatus}`,
          },
        });

        await tx.lead.update({
          where: { id: leadId },
          data: { status: newStatus },
        });
      });

      logger.audit("Pipeline Lead Status Changed", {
        userId: user.id,
        tenantId,
        targetId: leadId,
        details: { previousStatus: lead.status, newStatus, leadNumber: lead.leadNumber },
      });
    }

    return NextResponse.json({ success: true, message: "Status updated" });
  } catch (error) {
    return handleApiError(error);
  }
}
