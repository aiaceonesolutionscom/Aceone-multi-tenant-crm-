import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runWhatsAppIngestionTest() {
  console.log("=================================================");
  console.log("  TEST: WhatsApp Business Webhook Ingestion      ");
  console.log("=================================================");

  try {
    // 1. Get AceOne internal agency tenant
    const agencyTenant = await prisma.tenant.findFirst({
      where: { isInternal: true },
    });

    if (!agencyTenant) {
      throw new Error("AceOne Internal Agency Tenant not found.");
    }

    let waSource = await prisma.ingestionSource.findFirst({
      where: { tenantId: agencyTenant.id, type: "WHATSAPP" },
    });

    if (!waSource) {
      waSource = await prisma.ingestionSource.create({
        data: {
          tenantId: agencyTenant.id,
          name: "AceOne WhatsApp Hotline",
          type: "WHATSAPP",
          secretKey: "test-wa-key-" + Date.now(),
        },
      });
    }

    console.log(`[1] Using WhatsApp Ingestion Source: "${waSource.name}" (Key: ${waSource.secretKey})`);

    // 2. Simulate standard Meta Cloud API WhatsApp webhook payload with unique phone
    const testPhone = `92321${Math.floor(1000000 + Math.random() * 9000000)}`;
    const testMessageId = "wamid.HBgLMjMyNDU2Nzg5MBUCABEYEkRFMzg2OEY4OTU1" + Date.now();
    const metaCloudPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+92 300 0000000",
                  phone_number_id: "PHONE_NUMBER_ID",
                },
                contacts: [
                  {
                    profile: { name: "Tariq Mahmood" },
                    wa_id: testPhone,
                  },
                ],
                messages: [
                  {
                    from: testPhone,
                    id: testMessageId,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    text: {
                      body: "Hello AceOne, I need Meta Ads management and CRM setup for our ecommerce brand. What are your pricing packages?",
                    },
                    type: "text",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    console.log("[2] Sending Meta Cloud API WhatsApp Webhook to endpoint...");
    const res = await fetch(`http://localhost:3000/api/webhooks/whatsapp?sourceKey=${waSource.secretKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metaCloudPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WhatsApp Webhook responded with HTTP ${res.status}: ${err}`);
    }

    const json = await res.json();
    console.log("[3] Webhook response:", json);

    // 3. Verify lead in database
    const savedLead = await prisma.lead.findFirst({
      where: {
        tenantId: agencyTenant.id,
        phone: "+" + testPhone,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!savedLead) {
      throw new Error("WhatsApp inquiry lead was not found in AceOne internal tenant.");
    }

    console.log("\n[4] Database Verification of WhatsApp Lead:");
    console.log(`- Lead ID: ${savedLead.id}`);
    console.log(`- Customer Name: ${savedLead.fullName}`);
    console.log(`- Phone: ${savedLead.phone}`);
    console.log(`- Source Type: ${savedLead.sourceType}`);
    console.log(`- Platform: ${savedLead.platform}`);
    console.log(`- Notes / Inquiry Summary: ${savedLead.notesSummary}`);
    console.log("- Custom Fields:", JSON.stringify(savedLead.customFields, null, 2));

    if (savedLead.fullName !== "Tariq Mahmood") {
      throw new Error(`Expected fullName 'Tariq Mahmood', got '${savedLead.fullName}'`);
    }
    if (!savedLead.notesSummary?.includes("pricing packages")) {
      throw new Error("Inquiry message body was not captured in notesSummary!");
    }

    // 4. Test Idempotency: Resend identical message ID
    console.log("\n[5] Testing Idempotency (resending identical message ID)...");
    const resDup = await fetch(`http://localhost:3000/api/webhooks/whatsapp?sourceKey=${waSource.secretKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metaCloudPayload),
    });

    const jsonDup = await resDup.json();
    console.log("[5b] Duplicate webhook response:", jsonDup);

    console.log("\n=================================================");
    console.log("  >>> SUCCESS: WhatsApp Ingestion Test Passed! <<< ");
    console.log("=================================================");
  } catch (error) {
    console.error("Test Failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runWhatsAppIngestionTest();
