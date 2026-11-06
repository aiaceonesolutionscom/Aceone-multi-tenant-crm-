import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";
import { IngestionType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GATEWAY_URL = process.env.WA_GATEWAY_URL || "http://127.0.0.1:3001";

export async function GET() {
  try {
    const { tenantId } = await requireClientContext();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, phone: true, enabledChannels: true },
    });

    if (tenant?.enabledChannels && !tenant.enabledChannels.includes("WHATSAPP")) {
      return NextResponse.json(
        { error: "WhatsApp CRM is not enabled for your workspace plan." },
        { status: 403 }
      );
    }

    const tenantName = tenant?.name || "Company";
    const assignedPhone = tenant?.phone || null;

    // Find or create WhatsApp IngestionSource for this tenant
    let source = await prisma.ingestionSource.findFirst({
      where: { tenantId, type: IngestionType.WHATSAPP },
    });

    if (!source) {
      source = await prisma.ingestionSource.create({
        data: {
          tenantId,
          name: `${tenantName} WhatsApp Hotline`,
          type: IngestionType.WHATSAPP,
          secretKey: `wa_${tenantId.slice(0, 8)}_${Date.now().toString(36)}`,
          isActive: true,
        },
      });
    }

    // Check count of WhatsApp leads received
    const leadCount = await prisma.lead.count({
      where: { tenantId, sourceType: IngestionType.WHATSAPP },
    });

    const mapping = (source.fieldMapping as Record<string, any>) || {};
    let connectedPhone = mapping.connectedPhone || null;
    let liveQrCode: string | null = null;
    let isConnected = source.isActive && connectedPhone !== null;

    // Fetch live session from local Baileys gateway if running
    try {
      const gatewayRes = await fetch(
        `${GATEWAY_URL}/status?tenantId=${tenantId}&secretKey=${source.secretKey}`,
        { next: { revalidate: 0 } }
      );
      if (gatewayRes.ok) {
        const gw = await gatewayRes.json();
        liveQrCode = gw.qr || null;
        if (gw.isConnected && gw.phone) {
          connectedPhone = gw.phone;
          isConnected = true;
          // Only persist if phone changed or wasn't set
          if (mapping.connectedPhone !== gw.phone) {
            await prisma.ingestionSource.update({
              where: { id: source.id },
              data: {
                fieldMapping: { ...mapping, connectedPhone: gw.phone },
              },
            });
          }
        } else {
          isConnected = false;
          connectedPhone = null;
        }
      } else {
        isConnected = false;
      }
    } catch (_) {
      // Gateway offline or initializing
      isConnected = false;
    }

    return NextResponse.json({
      source: {
        id: source.id,
        name: source.name,
        secretKey: source.secretKey,
        isActive: source.isActive,
        lastReceivedAt: source.lastReceivedAt,
        connectedPhone,
        leadCount,
        isConnected,
      },
      liveQrCode,
      webhookUrl: `/api/webhooks/whatsapp?sourceKey=${source.secretKey}`,
      tenantName,
      assignedPhone,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireClientContext();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, phone: true, enabledChannels: true },
    });

    if (tenant?.enabledChannels && !tenant.enabledChannels.includes("WHATSAPP")) {
      return NextResponse.json(
        { error: "WhatsApp CRM is not enabled for your workspace plan." },
        { status: 403 }
      );
    }

    const tenantName = tenant?.name || "Company";
    const assignedPhone = tenant?.phone || null;

    const body = await req.json();
    const action = body.action || "test";

    let source = await prisma.ingestionSource.findFirst({
      where: { tenantId, type: IngestionType.WHATSAPP },
    });

    if (!source) {
      source = await prisma.ingestionSource.create({
        data: {
          tenantId,
          name: `${tenantName} WhatsApp Hotline`,
          type: IngestionType.WHATSAPP,
          secretKey: `wa_${tenantId.slice(0, 8)}_${Date.now().toString(36)}`,
          isActive: true,
        },
      });
    }

    if (action === "link") {
      const phoneNumber = body.phoneNumber ? String(body.phoneNumber).trim() : "+92 300 0000000";
      const existingMapping = (source.fieldMapping as Record<string, any>) || {};
      await prisma.ingestionSource.update({
        where: { id: source.id },
        data: {
          lastReceivedAt: new Date(),
          isActive: true,
          fieldMapping: { ...existingMapping, connectedPhone: phoneNumber },
        },
      });

      return NextResponse.json({
        success: true,
        message: "WhatsApp session successfully linked!",
        connectedPhone: phoneNumber,
      });
    }

    if (action === "disconnect") {
      try {
        await fetch(`${GATEWAY_URL}/disconnect?tenantId=${tenantId}`, { method: "POST" });
      } catch (_) {}
      const existingMapping = (source.fieldMapping as Record<string, any>) || {};
      await prisma.ingestionSource.update({
        where: { id: source.id },
        data: {
          isActive: false,
          fieldMapping: { ...existingMapping, connectedPhone: null },
        },
      });

      return NextResponse.json({
        success: true,
        message: "WhatsApp session disconnected.",
      });
    }

    if (action === "reconnect") {
      await prisma.ingestionSource.update({
        where: { id: source.id },
        data: {
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "WhatsApp session ready for scanning.",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
