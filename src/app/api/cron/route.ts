import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Automated Cron Job Endpoint
 * Triggered by cPanel Cron every 5-10 minutes to:
 * 1. Keep the Node.js App & WhatsApp Gateway permanently awake (prevents Passenger idle sleep).
 * 2. Reconcile overdue follow-ups in the database.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret") || req.headers.get("x-cron-secret");
    const configuredSecret = process.env.CRON_SECRET || "bbe0366f728a185497067a6c659f8a8b1e4e8c80bbde13d0";

    // Optional secret guard
    if (secret && secret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized cron token" }, { status: 401 });
    }

    // 1. Mark past-due pending follow-ups as OVERDUE
    const overdueResult = await prisma.followUp.updateMany({
      where: {
        status: "PENDING",
        scheduledAt: { lt: new Date() },
      },
      data: {
        status: "OVERDUE",
      },
    });

    // 2. Health check ping to internal gateway
    let waGatewayAlive = false;
    try {
      const gwRes = await fetch("http://127.0.0.1:3001/status?tenantId=health_check", {
        signal: AbortSignal.timeout(3000),
      });
      waGatewayAlive = gwRes.ok;
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: "Closify CRM Cron Maintenance Executed",
      timestamp: new Date().toISOString(),
      overdueFollowUpsUpdated: overdueResult.count,
      waGatewayAlive,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Cron execution failed", details: error.message },
      { status: 500 }
    );
  }
}
