import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runGoogleSheetsIngestionTest() {
  console.log("=================================================");
  console.log("  TEST: Dynamic Google Sheets / Forms Ingestion  ");
  console.log("=================================================");

  try {
    // 1. Get or create a tenant and an ingestion source
    const tenant = await prisma.tenant.findFirst({
      where: { name: { contains: "Azwa", mode: "insensitive" } },
    });

    if (!tenant) {
      throw new Error("Tenant 'azwa' not found in database. Seed the database first.");
    }

    let source = await prisma.ingestionSource.findFirst({
      where: { tenantId: tenant.id, type: "GOOGLE_SHEET" },
    });

    if (!source) {
      source = await prisma.ingestionSource.create({
        data: {
          tenantId: tenant.id,
          name: "Test Dynamic Apartments Sheet",
          type: "GOOGLE_SHEET",
          secretKey: "test-sheet-key-" + Date.now(),
        },
      });
    }

    console.log(`[1] Using Ingestion Source: "${source.name}" (Key: ${source.secretKey})`);

    // 2. Simulate Google Apps Script payload with arbitrary dynamic column names
    const dynamicPayload = {
      secretKey: source.secretKey,
      sourceKey: source.secretKey,
      formName: "Azwa Heights Registration",
      submittedAt: new Date().toISOString(),
      row: {
        "Naam (Full Name)": "Zain Ul Abideen",
        "WhatsApp Mobile": "+92 300 9876543",
        "Email Address": "zain.abideen@example.com",
        "Interested Property Type": "3-Bed Luxury Penthouse",
        "Budget Range": "PKR 45M - 60M",
        "Preferred Floor": "15th Floor or above",
        "Bank Financing Required": "Yes (50% upfront)",
        "Remarks / Special Request": "Needs sea-facing corner unit",
      },
    };

    console.log("[2] Sending dynamic row to webhook API endpoint...");
    const res = await fetch("http://localhost:3000/api/webhooks/google-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dynamicPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Webhook responded with HTTP ${res.status}: ${err}`);
    }

    const json = await res.json();
    console.log("[3] Webhook response:", json);

    if (!json.success || !json.leadId) {
      throw new Error("Webhook did not return success or leadId.");
    }

    // 3. Inspect saved lead in PostgreSQL
    const savedLead = await prisma.lead.findUnique({
      where: { id: json.leadId },
      include: { ingestionSource: true },
    });

    if (!savedLead) {
      throw new Error("Saved lead not found in database.");
    }

    console.log("\n[4] Database Verification of Ingested Lead:");
    console.log(`- Lead ID: ${savedLead.id}`);
    console.log(`- Lead Number: #${savedLead.leadNumber}`);
    console.log(`- Full Name: ${savedLead.fullName}`);
    console.log(`- Phone: ${savedLead.phone}`);
    console.log(`- Email: ${savedLead.email}`);
    console.log(`- Interested Service: ${savedLead.interestedService}`);
    console.log(`- Source Type: ${savedLead.sourceType}`);
    console.log(`- Tenant ID: ${savedLead.tenantId} (Matches Azwa: ${savedLead.tenantId === tenant.id})`);
    console.log("- Custom Fields (JSONB):", JSON.stringify(savedLead.customFields, null, 2));

    // Verify smart column mapping assertions
    if (savedLead.fullName !== "Zain Ul Abideen") {
      throw new Error(`Expected fullName 'Zain Ul Abideen', got '${savedLead.fullName}'`);
    }
    if (savedLead.phone !== "+92 300 9876543") {
      throw new Error(`Expected phone '+92 300 9876543', got '${savedLead.phone}'`);
    }
    if (savedLead.email !== "zain.abideen@example.com") {
      throw new Error(`Expected email 'zain.abideen@example.com', got '${savedLead.email}'`);
    }
    if (savedLead.interestedService !== "3-Bed Luxury Penthouse") {
      throw new Error(`Expected interestedService '3-Bed Luxury Penthouse', got '${savedLead.interestedService}'`);
    }

    const custom = savedLead.customFields as any;
    if (!custom || !custom["Budget Range"] || !custom["Preferred Floor"] || !custom["Bank Financing Required"]) {
      throw new Error("Custom fields were not properly preserved in JSONB!");
    }

    // 4. Verify detected headers on the source
    const updatedSource = await prisma.ingestionSource.findUnique({
      where: { id: source.id },
    });
    console.log("\n[5] Updated Ingestion Source Detected Headers:", updatedSource?.detectedHeaders);

    console.log("\n=================================================");
    console.log("  >>> SUCCESS: Dynamic Ingestion Test Passed! <<<  ");
    console.log("=================================================");
  } catch (error) {
    console.error("Test Failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runGoogleSheetsIngestionTest();
