import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";
import { FollowUpStatus } from "@prisma/client";
import { z } from "zod";

const updateFollowUpSchema = z.object({
  status: z.nativeEnum(FollowUpStatus).optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireClientContext();
    const { id } = await params;
    const body = await req.json();

    const validated = updateFollowUpSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const followUp = await prisma.followUp.findFirst({
      where: { id, tenantId },
    });

    if (!followUp) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    const data = validated.data;

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        ...(data.status && {
          status: data.status,
          ...(data.status === FollowUpStatus.COMPLETED && { completedAt: new Date() }),
        }),
        ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    return NextResponse.json({ success: true, followUp: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
