import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { IngestionType, LeadStatus } from "@prisma/client";

/**
 * WhatsApp Cloud API Webhook Verification (GET)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken =
    process.env.META_WEBHOOK_VERIFY_TOKEN || "aceone_webhook_verify_token_secure_2026";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("✅ WhatsApp webhook challenge verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * WhatsApp Inbound Message Ingestion (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawBody = await req.json().catch(() => ({}));
    const secretKey =
      searchParams.get("sourceKey") ||
      searchParams.get("secretKey") ||
      rawBody.secretKey ||
      rawBody.sourceKey;

    let targetTenantId: string | null = null;
    let targetSourceId: string | null = null;

    // Check direct tenantId first (from WhatsApp gateway)
    const directTenantId = rawBody.tenantId || searchParams.get("tenantId");
    if (directTenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: String(directTenantId).trim() },
      });
      if (tenant) {
        targetTenantId = tenant.id;
        const source = await prisma.ingestionSource.findFirst({
          where: { tenantId: tenant.id, type: IngestionType.WHATSAPP },
        });
        if (source) targetSourceId = source.id;
      }
    }

    if (!targetTenantId && secretKey) {
      const source = await prisma.ingestionSource.findUnique({
        where: { secretKey: String(secretKey).trim() },
      });
      if (source) {
        targetTenantId = source.tenantId;
        targetSourceId = source.id;
      }
    }

    if (!targetTenantId) {
      const internalTenant = await prisma.tenant.findFirst({
        where: { isInternal: true },
      });
      targetTenantId = internalTenant?.id || (await prisma.tenant.findFirst())?.id || "";
    }

    // 1. Support Simplified / Direct Gateway Payload format
    // e.g. { from, name, message }
    if (rawBody.from || rawBody.phone) {
      const phone = String(rawBody.from || rawBody.phone).trim();
      const name = rawBody.name || rawBody.senderName || "WhatsApp Customer";
      const messageText = rawBody.message || rawBody.text || "Inquiry from WhatsApp";
      const isOutbound = Boolean(rawBody.isOutbound);
      const messageDate = rawBody.timestamp ? new Date(rawBody.timestamp) : new Date();

      await handleWhatsAppInquiry({
        tenantId: targetTenantId,
        sourceId: targetSourceId,
        phone,
        name,
        messageText,
        rawPayload: rawBody,
        isOutbound,
        messageDate,
      });

      return NextResponse.json({ success: true, message: "WhatsApp inquiry ingested" });
    }

    // 2. Support Official Meta WhatsApp Cloud API format
    const entries = rawBody.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === "messages") {
          const val = change.value;
          const messages = val.messages || [];
          const contacts = val.contacts || [];

          for (const msg of messages) {
            if (msg.type === "text" || msg.text?.body) {
              const phone = msg.from; // e.g. 923001234567
              const name = contacts[0]?.profile?.name || "WhatsApp Customer";
              const messageText = msg.text?.body || "Inquiry via WhatsApp";
              const messageDate = msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date();

              await handleWhatsAppInquiry({
                tenantId: targetTenantId,
                sourceId: targetSourceId,
                phone: phone.startsWith("+") ? phone : "+" + phone,
                name,
                messageText,
                rawPayload: rawBody,
                messageDate,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

interface WhatsAppInquiryParams {
  tenantId: string;
  sourceId: string | null;
  phone: string;
  name: string;
  messageText: string;
  rawPayload: any;
  isOutbound?: boolean;
  messageDate?: Date;
}

// In-memory sequential task queue per phone to eliminate race conditions
const phoneQueues = new Map<string, Promise<any>>();

function enqueueForPhone<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = phoneQueues.get(key) || Promise.resolve();
  const current = previous.then(task, task);
  phoneQueues.set(key, current);
  return current.finally(() => {
    if (phoneQueues.get(key) === current) {
      phoneQueues.delete(key);
    }
  });
}

async function handleWhatsAppInquiry({
  tenantId,
  sourceId,
  phone,
  name,
  messageText,
  rawPayload,
  isOutbound = false,
  messageDate,
}: WhatsAppInquiryParams) {
  const effectiveDate = messageDate instanceof Date && !isNaN(messageDate.getTime()) ? messageDate : new Date();

  // Normalize incoming phone (strip non-digits for comparison)
  const cleanIncoming = phone.replace(/\D/g, "");
  const last8 = cleanIncoming.slice(-8);
  const noteContent = isOutbound
    ? `[Outbound WhatsApp Message]: "${messageText}"`
    : `[Inbound WhatsApp Message]: "${messageText}"`;

  // Sanitize lead full name so "Agent (Outbound)" is never stored as customer name
  const isGenericOrAgent = !name || name.trim() === "Agent (Outbound)" || name.trim() === "WhatsApp Customer" || name.trim().startsWith("WhatsApp Contact");
  const sanitizedName = isGenericOrAgent ? "WhatsApp Contact" : name.trim();

  return enqueueForPhone(last8, async () => {
    // Look up existing leads under this tenant and match by normalized digits (latest first)
    const tenantLeads = await prisma.lead.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, phone: true, fullName: true, leadNumber: true, status: true },
    });

    const existingLead = tenantLeads.find((l) => {
      if (!l.phone) return false;
      const cleanDb = l.phone.replace(/\D/g, "");
      if (cleanDb === cleanIncoming) return true;
      if (last8.length >= 7 && (cleanDb.endsWith(last8) || cleanDb.includes(last8))) return true;
      return false;
    });

    if (existingLead) {
      // Append new message as note in conversation thread (deduplicated against immediate retries)
      const recentDuplicate = await prisma.leadNote.findFirst({
        where: {
          leadId: existingLead.id,
          content: noteContent,
          createdAt: { gte: new Date(effectiveDate.getTime() - 15000) },
        },
      });

      if (!recentDuplicate) {
        await prisma.leadNote.create({
          data: {
            leadId: existingLead.id,
            content: noteContent,
            createdAt: effectiveDate,
          },
        });
      }

      const truncated = messageText.length > 80 ? messageText.substring(0, 77) + "..." : messageText;

      // Update lead with latest message, bump updatedAt so lead jumps to top of CRM
      const shouldUpdateName = !isGenericOrAgent && (!existingLead.fullName || existingLead.fullName.startsWith("WhatsApp Contact") || existingLead.fullName.includes("Agent"));

      await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          phone: phone,
          ...(shouldUpdateName ? { fullName: sanitizedName } : {}),
          interestedService: truncated,
          notesSummary: messageText,
          updatedAt: effectiveDate,
          status: isOutbound
            ? (existingLead.status === "NEW" ? LeadStatus.CONTACTED : existingLead.status)
            : (existingLead.status === "LOST" ? LeadStatus.CONTACTED : existingLead.status),
        },
      });

      console.log(`💬 Updated existing Lead #${existingLead.leadNumber} with ${isOutbound ? "Outbound" : "Inbound"} WhatsApp message at ${effectiveDate.toISOString()}: "${messageText}"`);
    } else {
      // Create new Lead from WhatsApp conversation
      const newLead = await prisma.lead.create({
        data: {
          tenantId,
          sourceType: IngestionType.WHATSAPP,
          ingestionSourceId: sourceId,
          fullName: sanitizedName,
          phone,
          interestedService: messageText.length > 80 ? messageText.substring(0, 77) + "..." : messageText,
          notesSummary: messageText,
          platform: "whatsapp",
          status: isOutbound ? LeadStatus.CONTACTED : LeadStatus.NEW,
          submittedAt: effectiveDate,
          createdAt: effectiveDate,
          updatedAt: effectiveDate,
          customFields: {
            initial_message: messageText,
            source_channel: "WhatsApp Direct Hotline",
          },
        },
      });

      await prisma.leadNote.create({
        data: {
          leadId: newLead.id,
          content: noteContent,
          createdAt: effectiveDate,
        },
      });

      await prisma.metaSubmission.create({
        data: {
          leadId: newLead.id,
          rawPayload,
          formAnswers: {
            whatsapp_message: messageText,
            phone,
            sender_name: name,
          },
        },
      });

      await prisma.leadStatusHistory.create({
        data: {
          leadId: newLead.id,
          previousStatus: LeadStatus.NEW,
          newStatus: LeadStatus.NEW,
          reason: "Customer inquiry received via WhatsApp",
        },
      });

      console.log(`📱 New WhatsApp Lead #${newLead.leadNumber} created for Tenant ID ${tenantId}`);
    }

    await prisma.webhookLog.create({
      data: {
        sourceType: "WHATSAPP",
        eventPayload: rawPayload,
        processed: true,
      },
    });
  });
}
