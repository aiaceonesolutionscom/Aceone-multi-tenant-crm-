import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant-guard";
import { MetaService } from "@/services/meta.service";
import crypto from "crypto";

export async function GET() {
  try {
    await requireSuperAdmin();

    const connection = await prisma.metaConnection.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        portfolios: {
          include: {
            assignment: {
              include: { tenant: { select: { id: true, name: true } } },
            },
            _count: { select: { adAccounts: true, pages: true } },
          },
        },
      },
    });

    return NextResponse.json({
      connection: connection
        ? {
            id: connection.id,
            appId: connection.appId,
            metaUserId: connection.metaUserId,
            metaUserName: connection.metaUserName,
            tokenExpiresAt: connection.tokenExpiresAt,
            scopes: connection.scopes,
            status: connection.status,
            lastVerifiedAt: connection.lastVerifiedAt,
            portfoliosCount: connection.portfolios.length,
          }
        : null,
      portfolios: connection?.portfolios || [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json();
    const { action, portfolioId } = body;

    const connection = await prisma.metaConnection.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!connection && action !== "get_oauth_url") {
      return NextResponse.json(
        { error: "No active central Meta connection found. Please connect first." },
        { status: 400 }
      );
    }

    if (action === "get_oauth_url") {
      const state = crypto.randomBytes(16).toString("hex");
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/admin/meta/oauth/callback`;
      const oauthUrl = MetaService.getOAuthAuthorizeUrl(state, redirectUri);

      return NextResponse.json({ oauthUrl, state });
    }

    if (action === "discover_portfolios" && connection) {
      const result = await MetaService.discoverPortfolios(connection.id);

      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "META_PORTFOLIOS_DISCOVERED",
          entityType: "MetaConnection",
          entityId: connection.id,
          metadata: { count: result.count, portfolios: result.portfolios },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Discovered ${result.count} Business Portfolios from Central Meta account.`,
        portfolios: result.portfolios,
      });
    }

    if (action === "sync_portfolio_assets" && portfolioId) {
      await MetaService.syncPortfolioAssets(portfolioId);

      return NextResponse.json({
        success: true,
        message: "Portfolio assets synchronized successfully.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
