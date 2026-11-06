import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant-guard";

export async function GET() {
  try {
    await requireSuperAdmin();

    const logs = await prisma.webhookLog.findMany({
      take: 100,
      orderBy: { receivedAt: "desc" },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return handleApiError(error);
  }
}
