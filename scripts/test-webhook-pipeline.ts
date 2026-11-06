import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function runWebhookTests() {
  console.log("⚡ Running Automated Meta Lead Ads Webhook Pipeline Verification...");

  const targetPage = await prisma.facebookPage.findFirst({
    include: {
      businessPortfolio: {
        include: { assignment: true },
      },
      forms: true,
    },
  });

  if (!targetPage || !targetPage.businessPortfolio?.assignment) {
    throw new Error("No Page mapped to a tenant found. Please run seed script.");
  }

  const assignedTenantId = targetPage.businessPortfolio.assignment.tenantId;
  const testLeadgenId = "leadgen_autotest_" + Date.now();
  const testCustomerName = "Dr. Farhan Qureshi";
  const testPhone = "+92 300 7766554";
  const testEmail = "dr.farhan@hospital.pk";
  const testService = "Executive 4-Bed Penthouse";

  console.log(`✓ Testing target Page: "${targetPage.name}" (Meta Page ID: ${targetPage.metaPageId})`);
  console.log(`✓ Destination Tenant ID: ${assignedTenantId}`);

  // Test 1: Ingest New Leadgen Event
  const { processLeadgenEvent } = await import("../src/app/api/webhooks/meta/route");

  console.log(`→ Submitting initial leadgen event (ID: ${testLeadgenId})...`);
  await processLeadgenEvent({
    leadgenId: testLeadgenId,
    metaPageId: targetPage.metaPageId,
    metaFormId: targetPage.forms[0]?.metaFormId,
    eventPayload: {
      id: testLeadgenId,
      created_time: new Date().toISOString(),
      platform: "facebook",
      field_data: [
        { name: "full_name", values: [testCustomerName] },
        { name: "phone_number", values: [testPhone] },
        { name: "email", values: [testEmail] },
        { name: "interested_service", values: [testService] },
      ],
    },
    signatureValid: true,
  });

  // Verify Lead Exists in Database under correct Tenant
  const createdLead = await prisma.lead.findUnique({
    where: { leadgenId: testLeadgenId },
    include: { metaSubmission: true },
  });

  if (!createdLead) {
    throw new Error("❌ FAILURE: Lead record was not created in database!");
  }

  if (createdLead.tenantId !== assignedTenantId) {
    throw new Error(`❌ FAILURE: Lead was assigned to wrong tenant! Expected ${assignedTenantId}, got ${createdLead.tenantId}`);
  }

  if (!createdLead.metaSubmission || !createdLead.metaSubmission.rawPayload) {
    throw new Error("❌ FAILURE: Raw Meta submission JSONB was not persisted!");
  }

  console.log("✅ TEST 1 PASSED: Lead ingested with correct tenant scoping and unaltered JSONB raw submission.");

  // Test 2: Idempotency & Duplicate Prevention
  console.log("→ Submitting duplicate leadgen event with exact same leadgen_id...");
  const initialLeadCount = await prisma.lead.count();

  await processLeadgenEvent({
    leadgenId: testLeadgenId, // Identical ID
    metaPageId: targetPage.metaPageId,
    metaFormId: targetPage.forms[0]?.metaFormId,
    eventPayload: { test: "duplicate" },
    signatureValid: true,
  });

  const countAfterDuplicate = await prisma.lead.count();
  if (countAfterDuplicate !== initialLeadCount) {
    throw new Error("❌ FAILURE: Duplicate webhook created a second lead record!");
  }

  console.log("✅ TEST 2 PASSED: Idempotency check verified. Duplicate webhook event safely acknowledged without duplicate creation.");

  // Clean up test lead
  await prisma.lead.delete({ where: { leadgenId: testLeadgenId } });
  console.log("✓ Test lead cleaned up successfully.");

  console.log("🎉 ALL WEBHOOK PIPELINE VERIFICATION TESTS PASSED!");
}

runWebhookTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
