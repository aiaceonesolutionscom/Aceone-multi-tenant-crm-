import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant-guard";
import { z } from "zod";

const assignPortfolioSchema = z.object({
  tenantId: z.string().uuid("Invalid client ID"),
  businessPortfolioId: z.string().uuid("Invalid portfolio ID").nullable(),
  confirmReassignment: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json();
    const validated = assignPortfolioSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { tenantId, businessPortfolioId, confirmReassignment } = validated.data;

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { portfolioAssignment: { include: { businessPortfolio: true } } },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Unassign case
    if (!businessPortfolioId) {
      if (tenant.portfolioAssignment) {
        await prisma.portfolioAssignment.delete({
          where: { tenantId },
        });

        await prisma.auditLog.create({
          data: {
            tenantId,
            userId: admin.id,
            action: "PORTFOLIO_UNASSIGNED",
            entityType: "PortfolioAssignment",
            metadata: {
              previousPortfolio: tenant.portfolioAssignment.businessPortfolio.name,
            },
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Portfolio assignment removed successfully",
      });
    }

    // Verify portfolio exists
    const portfolio = await prisma.businessPortfolio.findUnique({
      where: { id: businessPortfolioId },
      include: {
        assignment: {
          include: { tenant: { select: { id: true, name: true } } },
        },
      },
    });

    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    // Check if portfolio is already assigned to another tenant
    if (portfolio.assignment && portfolio.assignment.tenantId !== tenantId) {
      if (!confirmReassignment) {
        return NextResponse.json(
          {
            conflict: true,
            currentTenant: portfolio.assignment.tenant.name,
            message: `This portfolio is already assigned to "${portfolio.assignment.tenant.name}". Reassigning will detach it from that client. Do you wish to proceed?`,
          },
          { status: 409 }
        );
      }

      // If confirmed reassignment, delete old assignment
      await prisma.portfolioAssignment.delete({
        where: { businessPortfolioId },
      });
    }

    // Assign to new tenant (upsert)
    const assignment = await prisma.portfolioAssignment.upsert({
      where: { tenantId },
      update: {
        businessPortfolioId,
      },
      create: {
        tenantId,
        businessPortfolioId,
      },
      include: {
        businessPortfolio: true,
        tenant: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: admin.id,
        action: "PORTFOLIO_ASSIGNED",
        entityType: "PortfolioAssignment",
        entityId: assignment.id,
        metadata: {
          client: tenant.name,
          portfolio: portfolio.name,
          metaBusinessId: portfolio.metaBusinessId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      assignment,
      message: `Assigned "${portfolio.name}" to client "${tenant.name}" successfully.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
