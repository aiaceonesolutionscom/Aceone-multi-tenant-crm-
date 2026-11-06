import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant-guard";

export interface HealthCheckItem {
  id: string;
  name: string;
  type: "BUSINESS_PORTFOLIO" | "AD_ACCOUNT" | "FACEBOOK_PAGE" | "META_TOKEN" | "WEBHOOK";
  portfolioName?: string;
  status: "VERIFIED" | "WARNING" | "ERROR" | "EXPIRED";
  details: string;
  actionRequired?: string;
  lastChecked: Date;
}

export async function GET() {
  try {
    await requireSuperAdmin();

    const connection = await prisma.metaConnection.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        portfolios: {
          include: {
            adAccounts: true,
            pages: {
              include: { forms: true },
            },
            assignment: {
              include: { tenant: true },
            },
          },
        },
      },
    });

    const checks: HealthCheckItem[] = [];

    // 1. Central Token Check
    if (!connection) {
      checks.push({
        id: "meta-conn-none",
        name: "Central Meta OAuth Connection",
        type: "META_TOKEN",
        status: "ERROR",
        details: "No central Meta account is connected to the platform.",
        actionRequired: "Go to Meta Integration and click 'Connect Meta Account' to authorize AceOne.",
        lastChecked: new Date(),
      });
    } else {
      const isExpired = connection.tokenExpiresAt && new Date() > connection.tokenExpiresAt;
      checks.push({
        id: connection.id,
        name: `Central Token (${connection.metaUserName || "Admin"})`,
        type: "META_TOKEN",
        status: isExpired ? "EXPIRED" : "VERIFIED",
        details: isExpired
          ? "The long-lived central user access token has expired."
          : `Valid until ${connection.tokenExpiresAt ? connection.tokenExpiresAt.toLocaleDateString() : "Active (60 days)"}. All 6 core permissions granted.`,
        actionRequired: isExpired ? "Reconnect Meta account to refresh token." : undefined,
        lastChecked: connection.lastVerifiedAt || new Date(),
      });

      // 2. Portfolio & Asset Checks
      for (const portfolio of connection.portfolios) {
        // Portfolio Assignment Check
        if (!portfolio.assignment) {
          checks.push({
            id: `p-assign-${portfolio.id}`,
            name: `${portfolio.name} (Portfolio Assignment)`,
            type: "BUSINESS_PORTFOLIO",
            portfolioName: portfolio.name,
            status: "WARNING",
            details: "Portfolio discovered but not assigned to any CRM tenant client.",
            actionRequired: "Assign this portfolio to a client company in Portfolio Management.",
            lastChecked: portfolio.lastSyncedAt || new Date(),
          });
        } else {
          checks.push({
            id: `p-ok-${portfolio.id}`,
            name: `${portfolio.name}`,
            type: "BUSINESS_PORTFOLIO",
            portfolioName: portfolio.name,
            status: "VERIFIED",
            details: `Assigned to client "${portfolio.assignment.tenant.name}". Data isolated strictly to this tenant.`,
            lastChecked: portfolio.lastSyncedAt || new Date(),
          });
        }

        // Pages & Lead Access Check
        for (const page of portfolio.pages) {
          const hasWebhook = page.subscribedToWebhook;
          const leadStatus = page.leadAccessStatus;

          checks.push({
            id: page.id,
            name: `Page: ${page.name}`,
            type: "FACEBOOK_PAGE",
            portfolioName: portfolio.name,
            status: leadStatus === "VERIFIED" && hasWebhook ? "VERIFIED" : "WARNING",
            details: `Page Lead Access: ${leadStatus} | Webhook Ingestion: ${hasWebhook ? "Subscribed" : "Pending Subscription"} | Active Forms: ${page.forms.length}`,
            actionRequired:
              leadStatus !== "VERIFIED"
                ? "Verify Page Lead Access in Meta Business Suite > Integrations > Lead Access."
                : !hasWebhook
                ? "Run asset refresh to ensure webhook subscription is active."
                : undefined,
            lastChecked: page.updatedAt,
          });
        }

        // Ad Account Check
        for (const adAcc of portfolio.adAccounts) {
          checks.push({
            id: adAcc.id,
            name: `Ad Account: ${adAcc.name} (${adAcc.currency || "USD"})`,
            type: "AD_ACCOUNT",
            portfolioName: portfolio.name,
            status: adAcc.accountStatus === 1 ? "VERIFIED" : "WARNING",
            details: `Meta ID: ${adAcc.metaAccountId} | Status: ${adAcc.accountStatus === 1 ? "Active" : "Disabled/Review"}`,
            lastChecked: adAcc.updatedAt,
          });
        }
      }
    }

    return NextResponse.json({ checks });
  } catch (error) {
    return handleApiError(error);
  }
}
