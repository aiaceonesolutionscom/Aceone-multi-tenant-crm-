import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";
import { LeadStatus } from "@prisma/client";
import { z } from "zod";

const updateLeadSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  interestedService: z.string().optional().nullable(),
  status: z.nativeEnum(LeadStatus).optional(),
  statusChangeReason: z.string().optional(),
  notesSummary: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireClientContext();
    const { id } = await params;

    const lead = await prisma.lead.findFirst({
      where: { id, tenantId }, // Strict tenant isolation
      include: {
        metaSubmission: true, // Unaltered original form responses
        notes: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true } } },
        },
        statusHistories: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true } } },
        },
        followUps: {
          orderBy: { scheduledAt: "desc" },
        },
        campaign: { select: { id: true, name: true, metaCampaignId: true } },
        adSet: { select: { id: true, name: true } },
        ad: { select: { id: true, name: true, metaAdId: true } },
        metaForm: { select: { id: true, name: true, metaFormId: true } },
        facebookPage: { select: { id: true, name: true, metaPageId: true } },
        ingestionSource: { select: { id: true, name: true, type: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantId } = await requireClientContext();
    const { id } = await params;
    const body = await req.json();

    const validated = updateLeadSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const currentLead = await prisma.lead.findFirst({
      where: { id, tenantId },
    });

    if (!currentLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const data = validated.data;

    await prisma.$transaction(async (tx) => {
      // Record status transition if status changed
      if (data.status && data.status !== currentLead.status) {
        await tx.leadStatusHistory.create({
          data: {
            leadId: id,
            userId: user.id,
            previousStatus: currentLead.status,
            newStatus: data.status,
            reason: data.statusChangeReason || "Manual status change from CRM dashboard",
          },
        });
      }

      await tx.lead.update({
        where: { id },
        data: {
          ...(data.fullName && { fullName: data.fullName }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.interestedService !== undefined && { interestedService: data.interestedService }),
          ...(data.status && { status: data.status }),
          ...(data.notesSummary !== undefined && { notesSummary: data.notesSummary }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Lead updated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
