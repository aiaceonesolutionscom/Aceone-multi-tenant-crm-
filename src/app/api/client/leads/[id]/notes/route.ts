import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";
import { z } from "zod";

const createNoteSchema = z.object({
  content: z.string().min(1, "Note content cannot be empty"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantId } = await requireClientContext();
    const { id } = await params;
    const body = await req.json();

    const validated = createNoteSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findFirst({
      where: { id, tenantId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const note = await prisma.leadNote.create({
      data: {
        leadId: id,
        userId: user.id,
        content: validated.data.content,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    return handleApiError(error);
  }
}
