import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant-guard";

export async function GET() {
  try {
    await requireSuperAdmin();

    const portfolios = await prisma.businessPortfolio.findMany({
      orderBy: { name: "asc" },
      include: {
        assignment: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                companyEmail: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            adAccounts: true,
            pages: true,
          },
        },
        adAccounts: {
          select: {
            id: true,
            name: true,
            metaAccountId: true,
            currency: true,
            accountStatus: true,
          },
        },
        pages: {
          select: {
            id: true,
            name: true,
            metaPageId: true,
            leadAccessStatus: true,
            subscribedToWebhook: true,
          },
        },
      },
    });

    return NextResponse.json({ portfolios });
  } catch (error) {
    return handleApiError(error);
  }
}
