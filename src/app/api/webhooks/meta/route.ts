import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { MetaService } from "@/services/meta.service";
import { decryptToken } from "@/lib/crypto";
import { LeadStatus } from "@prisma/client";

/**
 * Meta Webhook Verification Handler (GET)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "aceone_webhook_verify_token_secure_2026";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("✅ Meta Webhook challenge verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("❌ Meta Webhook verification token mismatch:", { received: token, expected: expectedToken });
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Meta Webhook Event Ingestion Handler (POST)
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.META_APP_SECRET || "";

  // 1. Signature Verification
  let signatureValid = false;
  if (appSecret && signature) {
    const expectedSig = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    signatureValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } else if (!appSecret) {
    // If running in development without app secret configured yet, flag signature status
    signatureValid = true;
  }

  if (!signatureValid) {
    console.error("❌ Invalid X-Hub-Signature-256 on Meta webhook");
    await prisma.webhookLog.create({
      data: {
        eventPayload: JSON.parse(rawBody || "{}"),
        signatureValid: false,
        errorMessage: "Invalid X-Hub-Signature-256 signature",
      },
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (parseErr) {
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

  // Quick acknowledgement to Meta (must respond < 20s)
  // We process leadgen changes idempotently
  const entries = payload.entry || [];

  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field === "leadgen") {
        const val = change.value;
        const leadgenId = val.leadgen_id;
        const metaPageId = val.page_id;
        const metaFormId = val.form_id;
        const metaAdId = val.ad_id;

        try {
          await processLeadgenEvent({
            leadgenId,
            metaPageId,
            metaFormId,
            metaAdId,
            eventPayload: val,
            signatureValid: true,
          });
        } catch (leadProcessErr: any) {
          console.error("Lead processing error:", leadProcessErr);
          await prisma.webhookLog.create({
            data: {
              metaPageId,
              leadgenId,
              eventPayload: val,
              signatureValid: true,
              processed: false,
              errorMessage: leadProcessErr.message || "Failed to process leadgen event",
            },
          });
        }
      }
    }
  }

  return NextResponse.json({ success: true, received: true });
}

interface ProcessLeadParams {
  leadgenId: string;
  metaPageId: string;
  metaFormId?: string;
  metaAdId?: string;
  eventPayload: any;
  signatureValid: boolean;
}

async function processLeadgenEvent({
  leadgenId,
  metaPageId,
  metaFormId,
  metaAdId,
  eventPayload,
  signatureValid,
}: ProcessLeadParams) {
  // Idempotency: check if lead already exists
  const existingLead = await prisma.lead.findUnique({
    where: { leadgenId },
  });

  if (existingLead) {
    console.log(`ℹ️ Duplicate webhook ignored: leadgen_id ${leadgenId} already exists in CRM`);
    await prisma.webhookLog.create({
      data: {
        metaPageId,
        leadgenId,
        eventPayload,
        signatureValid,
        processed: true,
        errorMessage: "Idempotent duplicate event skipped",
      },
    });
    return;
  }

  // Find the Facebook Page in CRM database
  const page = await prisma.facebookPage.findUnique({
    where: { metaPageId: String(metaPageId) },
    include: {
      businessPortfolio: {
        include: {
          assignment: true,
        },
      },
    },
  });

  if (!page || !page.businessPortfolio?.assignment) {
    throw new Error(
      `No CRM Tenant mapping found for Page ID ${metaPageId}. Business Portfolio must be assigned to a tenant.`
    );
  }

  const tenantId = page.businessPortfolio.assignment.tenantId;

  // Retrieve Page Access Token to fetch lead details
  let pageToken: string | null = null;
  if (page.pageAccessTokenEnc) {
    try {
      pageToken = decryptToken(page.pageAccessTokenEnc);
    } catch (e) {
      console.warn("Could not decrypt page token, trying central connection token");
    }
  }

  let graphLeadData: any = null;

  // If page token is available, query Graph API; else fallback to event values or central token
  if (pageToken) {
    try {
      graphLeadData = await MetaService.fetchLeadFromGraphApi(leadgenId, pageToken);
    } catch (fetchErr: any) {
      console.warn("Page token fetch failed, falling back:", fetchErr.message);
    }
  }

  // Parse questions & field data
  let fullName = "New Meta Lead";
  let phone: string | null = null;
  let email: string | null = null;
  let interestedService: string | null = null;
  let city: string | null = null;
  let companyName: string | null = null;
  const formAnswers: Record<string, string> = {};

  const fields = graphLeadData?.field_data || eventPayload?.field_data || [];
  for (const field of fields) {
    const key = (field.name || "").toLowerCase();
    const val = Array.isArray(field.values) ? field.values[0] : field.values;
    if (!val) continue;

    formAnswers[key] = String(val);

    if (key.includes("full_name") || key.includes("name") || key === "first_name") {
      fullName = String(val);
    } else if (key.includes("phone") || key.includes("mobile") || key.includes("contact")) {
      phone = String(val);
    } else if (key.includes("email") || key.includes("mail")) {
      email = String(val);
    } else if (key.includes("service") || key.includes("interest") || key.includes("unit") || key.includes("property")) {
      interestedService = String(val);
    } else if (key.includes("city") || key.includes("location")) {
      city = String(val);
    } else if (key.includes("company") || key.includes("business")) {
      companyName = String(val);
    }
  }

  // Match Ad / Campaign / Form from database
  const matchedForm = metaFormId
    ? await prisma.metaForm.findUnique({ where: { metaFormId: String(metaFormId) } })
    : null;
  const matchedAd = metaAdId
    ? await prisma.ad.findUnique({
        where: { metaAdId: String(metaAdId) },
        include: { adSet: { include: { campaign: true } } },
      })
    : null;

  const platform = graphLeadData?.platform || eventPayload?.platform || "facebook";
  const submittedAt = graphLeadData?.created_time ? new Date(graphLeadData.created_time) : new Date();

  // Create Lead & MetaSubmission transactionally
  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        tenantId,
        leadgenId,
        fullName,
        phone,
        email,
        companyName,
        interestedService,
        city,
        platform,
        status: LeadStatus.NEW,
        facebookPageId: page.id,
        adAccountId: matchedAd?.adSet?.campaign?.adAccountId || null,
        campaignId: matchedAd?.adSet?.campaignId || null,
        adSetId: matchedAd?.adSetId || null,
        adId: matchedAd?.id || null,
        metaFormId: matchedForm?.id || null,
        submittedAt,
      },
    });

    await tx.metaSubmission.create({
      data: {
        leadId: lead.id,
        rawPayload: graphLeadData || eventPayload,
        formAnswers,
      },
    });

    await tx.leadStatusHistory.create({
      data: {
        leadId: lead.id,
        previousStatus: LeadStatus.NEW,
        newStatus: LeadStatus.NEW,
        reason: "Lead captured automatically via Meta Webhook",
      },
    });

    await tx.webhookLog.create({
      data: {
        metaPageId: String(metaPageId),
        leadgenId,
        eventPayload,
        signatureValid,
        processed: true,
      },
    });
  });

  console.log(`✅ Lead ${leadgenId} (${fullName}) captured and assigned to Tenant ID ${tenantId}`);
}
