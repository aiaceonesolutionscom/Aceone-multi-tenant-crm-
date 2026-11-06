import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  // If user has a tenant, fetch their assigned business portfolio info
  let portfolioInfo = null;
  let enabledChannels: string[] = ["WHATSAPP", "GOOGLE_SHEETS"];
  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { enabledChannels: true },
    });
    if (tenant?.enabledChannels) {
      enabledChannels = tenant.enabledChannels;
    }

    const assignment = await prisma.portfolioAssignment.findUnique({
      where: { tenantId: user.tenantId },
      include: {
        businessPortfolio: {
          select: {
            id: true,
            name: true,
            metaBusinessId: true,
            status: true,
          },
        },
      },
    });

    if (assignment) {
      portfolioInfo = assignment.businessPortfolio;
    }
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      ...user,
      enabledChannels,
      assignedPortfolio: portfolioInfo,
    },
  });
}
