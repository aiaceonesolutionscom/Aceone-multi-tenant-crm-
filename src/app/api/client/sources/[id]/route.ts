import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireClientContext();
    const { id } = await params;

    const existing = await prisma.ingestionSource.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    await prisma.ingestionSource.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Source removed" });
  } catch (error) {
    return handleApiError(error);
  }
}
