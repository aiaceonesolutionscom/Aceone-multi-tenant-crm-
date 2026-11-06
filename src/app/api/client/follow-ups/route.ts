import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";
import { FollowUpStatus } from "@prisma/client";
import { z } from "zod";

const createFollowUpSchema = z.object({
  leadId: z.string().uuid("Invalid lead ID"),
  scheduledAt: z.string().datetime("Valid ISO date string required"),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireClientContext();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let where: any = { tenantId };

    if (filter === "notifications") {
      where = {
        tenantId,
        status: FollowUpStatus.PENDING,
        scheduledAt: { lte: endOfToday },
      };
    } else if (filter === "today") {
      where = {
        tenantId,
        status: FollowUpStatus.PENDING,
        scheduledAt: { gte: startOfToday, lte: endOfToday },
      };
    } else if (filter === "upcoming") {
      where = {
        tenantId,
        status: FollowUpStatus.PENDING,
        scheduledAt: { gt: endOfToday },
      };
    } else if (filter === "overdue") {
      where = {
        tenantId,
        status: FollowUpStatus.PENDING,
        scheduledAt: { lt: startOfToday },
      };
    } else if (filter === "completed") {
      where = {
        tenantId,
        status: FollowUpStatus.COMPLETED,
      };
    }

    const followUps = await prisma.followUp.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      include: {
        lead: {
          select: {
            id: true,
            leadNumber: true,
            fullName: true,
            phone: true,
            email: true,
            status: true,
            interestedService: true,
          },
        },
      },
    });

    return NextResponse.json({ followUps });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireClientContext();
    const body = await req.json();
    const validated = createFollowUpSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { leadId, scheduledAt, notes } = validated.data;

    // Verify lead belongs to this tenant
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found in this tenant" }, { status: 404 });
    }

    const followUp = await prisma.followUp.create({
      data: {
        tenantId,
        leadId,
        scheduledAt: new Date(scheduledAt),
        notes: notes || null,
        status: FollowUpStatus.PENDING,
      },
      include: {
        lead: {
          select: { id: true, leadNumber: true, fullName: true, phone: true },
        },
      },
    });

    return NextResponse.json({ success: true, followUp });
  } catch (error) {
    return handleApiError(error);
  }
}
