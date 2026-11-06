import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";

export async function GET() {
  try {
    const { tenantId, portfolioId } = await requireClientContext();

    if (!portfolioId) {
      return NextResponse.json({
        hierarchy: null,
        campaigns: [],
        message: "No Business Portfolio assigned to this company yet.",
      });
    }

    const portfolio = await prisma.businessPortfolio.findUnique({
      where: { id: portfolioId },
      include: {
        adAccounts: {
          include: {
            campaigns: {
              include: {
                adSets: {
                  include: {
                    ads: {
                      include: {
                        _count: {
                          select: { leads: { where: { tenantId } } },
                        },
                      },
                    },
                    _count: {
                      select: { leads: { where: { tenantId } } },
                    },
                  },
                },
                _count: {
                  select: { leads: { where: { tenantId } } },
                },
              },
            },
          },
        },
        pages: {
          include: {
            forms: {
              include: {
                _count: {
                  select: { leads: { where: { tenantId } } },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ portfolio });
  } catch (error) {
    return handleApiError(error);
  }
}
