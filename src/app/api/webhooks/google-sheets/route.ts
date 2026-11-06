import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractFieldsFromRow } from "@/lib/smart-column-matcher";
import { LeadStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const secretKey =
      body.secretKey ||
      body.sourceKey ||
      searchParams.get("secretKey") ||
      searchParams.get("sourceKey");
    const row = body.row || body.data || body;

    if (!secretKey || !row || typeof row !== "object" || Object.keys(row).length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: secretKey and row dictionary are required" },
        { status: 400 }
      );
    }

    // 1. Find IngestionSource by secretKey
    const source = await prisma.ingestionSource.findUnique({
      where: { secretKey: String(secretKey).trim() },
      include: {
        tenant: { select: { id: true, name: true, status: true } },
      },
    });

    if (!source || !source.isActive) {
      return NextResponse.json(
        { error: "Invalid or deactivated ingestion source secretKey" },
        { status: 401 }
      );
    }

    if (source.tenant.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Client company is inactive. Please contact AceOne administration." },
        { status: 403 }
      );
    }

    // 2. Smart Auto-Column Extraction
    const extracted = extractFieldsFromRow(
      row,
      source.fieldMapping as Record<string, string> | null
    );

    // Merge any newly discovered column headers into source record
    const combinedHeaders = Array.from(
      new Set([...(source.detectedHeaders || []), ...extracted.detectedHeaders])
    );

    // 3. Create Lead transactionally
    const lead = await prisma.$transaction(async (tx) => {
      // Update source lastReceivedAt and detectedHeaders
      await tx.ingestionSource.update({
        where: { id: source.id },
        data: {
          lastReceivedAt: new Date(),
          detectedHeaders: combinedHeaders,
        },
      });

      const platform =
        source.type === "GOOGLE_FORM" ? "google_forms" : "google_sheets";

      const createdLead = await tx.lead.create({
        data: {
          tenantId: source.tenantId,
          sourceType: source.type,
          ingestionSourceId: source.id,
          fullName: extracted.fullName,
          phone: extracted.phone,
          email: extracted.email,
          interestedService: extracted.interestedService,
          city: extracted.city,
          companyName: extracted.companyName,
          notesSummary: extracted.notesSummary,
          customFields: extracted.customFields,
          platform,
          status: LeadStatus.NEW,
          submittedAt: new Date(),
        },
      });

      // Save raw row in MetaSubmission
      await tx.metaSubmission.create({
        data: {
          leadId: createdLead.id,
          rawPayload: row,
          formAnswers: row,
        },
      });

      // Save status history
      await tx.leadStatusHistory.create({
        data: {
          leadId: createdLead.id,
          previousStatus: LeadStatus.NEW,
          newStatus: LeadStatus.NEW,
          reason: `Auto-ingested from ${source.name} (${platform})`,
        },
      });

      // If inquiry or notes provided, add initial note
      if (extracted.notesSummary) {
        await tx.leadNote.create({
          data: {
            leadId: createdLead.id,
            content: `Customer Note / Inquiry: ${extracted.notesSummary}`,
          },
        });
      }

      await tx.webhookLog.create({
        data: {
          sourceType: source.type,
          eventPayload: row,
          signatureValid: true,
          processed: true,
        },
      });

      return createdLead;
    });

    console.log(
      `✅ Ingested Google Sheet/Form Lead #${lead.leadNumber} (${lead.fullName}) into Tenant "${source.tenant.name}"`
    );

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      leadNumber: lead.leadNumber,
      message: "Lead captured successfully",
      extractedFields: {
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email,
        interestedService: lead.interestedService,
        customFieldsCount: Object.keys(extracted.customFields).length,
      },
    });
  } catch (error: any) {
    console.error("Google Sheet webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
