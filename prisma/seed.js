"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_client = require("@prisma/client");
var import_bcryptjs = __toESM(require("bcryptjs"));
const prisma = new import_client.PrismaClient();
async function main() {
  console.log("\u{1F331} Starting AceOne Multi-Tenant Omnichannel CRM database seed...");
  await prisma.followUp.deleteMany();
  await prisma.leadNote.deleteMany();
  await prisma.leadStatusHistory.deleteMany();
  await prisma.metaSubmission.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.adSet.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.metaForm.deleteMany();
  await prisma.facebookPage.deleteMany();
  await prisma.adAccount.deleteMany();
  await prisma.portfolioAssignment.deleteMany();
  await prisma.businessPortfolio.deleteMany();
  await prisma.metaConnection.deleteMany();
  await prisma.ingestionSource.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
  const defaultPasswordHash = await import_bcryptjs.default.hash("Password@123", 12);
  const superAdmin = await prisma.user.create({
    data: {
      name: "AceOne Super Admin",
      email: "admin@aceone.com",
      username: "superadmin",
      passwordHash: defaultPasswordHash,
      role: import_client.UserRole.SUPER_ADMIN,
      isActive: true
    }
  });
  console.log("\u2705 Super Admin created: admin@aceone.com / Password@123");
  const tenantAceOneInternal = await prisma.tenant.create({
    data: {
      name: "AceOne Solutions (Internal Agency)",
      companyEmail: "inbound@aceonesolutions.com",
      contactPerson: "AceOne Media Team",
      phone: "+92 300 0001122",
      status: import_client.TenantStatus.ACTIVE,
      isInternal: true,
      timezone: "Asia/Karachi"
    }
  });
  console.log("\u2705 AceOne Internal Agency Workspace created");
  const sourceAceOneForm = await prisma.ingestionSource.create({
    data: {
      tenantId: tenantAceOneInternal.id,
      name: "AceOne Official Website Google Form",
      type: import_client.IngestionType.GOOGLE_FORM,
      secretKey: "secret_aceone_form_2026",
      detectedHeaders: ["Full Name", "Phone Number", "Email", "Service Required", "Estimated Budget", "Project Description"]
    }
  });
  const sourceAceOneWhatsApp = await prisma.ingestionSource.create({
    data: {
      tenantId: tenantAceOneInternal.id,
      name: "AceOne WhatsApp Business Hotline",
      type: import_client.IngestionType.WHATSAPP,
      secretKey: "secret_aceone_whatsapp_2026",
      detectedHeaders: ["Sender Name", "Phone", "Message"]
    }
  });
  const tenantAzwa = await prisma.tenant.create({
    data: {
      name: "Azwa Real Estate & Living",
      companyEmail: "contact@azwa.com",
      contactPerson: "Kamran Siddiqui",
      phone: "+92 300 1234567",
      status: import_client.TenantStatus.ACTIVE,
      isInternal: false,
      timezone: "Asia/Karachi"
    }
  });
  await prisma.user.create({
    data: {
      tenantId: tenantAzwa.id,
      name: "Kamran Siddiqui",
      email: "azwa@aceonecrm.com",
      username: "azwa_admin",
      passwordHash: defaultPasswordHash,
      role: import_client.UserRole.CLIENT_ADMIN,
      isActive: true
    }
  });
  console.log("\u2705 Client Admin created: azwa@aceonecrm.com / Password@123 (Tenant: Azwa)");
  const sourceAzwaSheet = await prisma.ingestionSource.create({
    data: {
      tenantId: tenantAzwa.id,
      name: "Azwa Luxury Apartments Google Form Responses",
      type: import_client.IngestionType.GOOGLE_FORM,
      secretKey: "secret_azwa_sheet_2026",
      detectedHeaders: ["Client Name", "WhatsApp Contact", "Email", "Preferred Apartment", "Budget Range", "City"]
    }
  });
  const sourceAzwaWhatsApp = await prisma.ingestionSource.create({
    data: {
      tenantId: tenantAzwa.id,
      name: "Azwa Sales Team WhatsApp",
      type: import_client.IngestionType.WHATSAPP,
      secretKey: "secret_azwa_whatsapp_2026",
      detectedHeaders: ["Sender", "Mobile", "Inquiry"]
    }
  });
  const tenantApex = await prisma.tenant.create({
    data: {
      name: "Apex Logistics & Trade",
      companyEmail: "info@apexlogistics.com",
      contactPerson: "Sara Malik",
      phone: "+92 321 7654321",
      status: import_client.TenantStatus.ACTIVE,
      isInternal: false,
      timezone: "Asia/Karachi"
    }
  });
  await prisma.user.create({
    data: {
      tenantId: tenantApex.id,
      name: "Sara Malik",
      email: "apex@aceonecrm.com",
      username: "apex_admin",
      passwordHash: defaultPasswordHash,
      role: import_client.UserRole.CLIENT_ADMIN,
      isActive: true
    }
  });
  console.log("\u2705 Client Admin created: apex@aceonecrm.com / Password@123 (Tenant: Apex)");
  const centralMetaConn = await prisma.metaConnection.create({
    data: {
      appId: "meta_app_aceone_2026",
      metaUserId: "meta_user_agency_primary",
      metaUserName: "AceOne Digital Media Agency",
      accessTokenEnc: "mock_encrypted_central_user_access_token_base64",
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1e3),
      scopes: [
        "business_management",
        "pages_show_list",
        "pages_read_engagement",
        "ads_read"
      ],
      status: import_client.MetaSyncStatus.VERIFIED,
      lastVerifiedAt: /* @__PURE__ */ new Date()
    }
  });
  const portfolioAzwa = await prisma.businessPortfolio.create({
    data: {
      metaConnectionId: centralMetaConn.id,
      metaBusinessId: "biz_portfolio_azwa_101",
      name: "Azwa Properties Portfolio",
      status: import_client.MetaSyncStatus.VERIFIED,
      lastSyncedAt: /* @__PURE__ */ new Date()
    }
  });
  const portfolioApex = await prisma.businessPortfolio.create({
    data: {
      metaConnectionId: centralMetaConn.id,
      metaBusinessId: "biz_portfolio_apex_102",
      name: "Apex Global Fleet Portfolio",
      status: import_client.MetaSyncStatus.VERIFIED,
      lastSyncedAt: /* @__PURE__ */ new Date()
    }
  });
  await prisma.portfolioAssignment.create({
    data: {
      tenantId: tenantAzwa.id,
      businessPortfolioId: portfolioAzwa.id
    }
  });
  await prisma.portfolioAssignment.create({
    data: {
      tenantId: tenantApex.id,
      businessPortfolioId: portfolioApex.id
    }
  });
  console.log("\u2705 Meta Portfolios assigned to client tenants");
  const sampleLeadsAzwa = [
    {
      fullName: "Muhammad Rizwan",
      phone: "+92 300 8899112",
      email: "rizwan.prop@gmail.com",
      interestedService: "4 Bedroom Penthouse",
      platform: "google_forms",
      sourceType: import_client.IngestionType.GOOGLE_FORM,
      sourceId: sourceAzwaSheet.id,
      status: import_client.LeadStatus.NEW,
      city: "Karachi",
      customFields: {
        "Budget Range": "3.5 Crore PKR",
        "Financing Needed": "Yes (Bank Islamic Mortgage)",
        "Preferred Floor": "Top Floor (Penthouse)"
      }
    },
    {
      fullName: "Ayesha Jahangir (WhatsApp Inquiry)",
      phone: "+92 321 4455667",
      email: "ayesha.j@outlook.com",
      interestedService: "500 Sq Yards Luxury Villa Booking",
      platform: "whatsapp",
      sourceType: import_client.IngestionType.WHATSAPP,
      sourceId: sourceAzwaWhatsApp.id,
      status: import_client.LeadStatus.CONTACTED,
      city: "Lahore",
      customFields: {
        "Initial Message": "Hello, I saw your Instagram ad for luxury villas. Can you send the brochure and payment plan on this WhatsApp number?",
        "Lead Quality": "High Intent"
      }
    },
    {
      fullName: "Tariq Mehmood",
      phone: "+92 333 1122334",
      email: "tariq.m@enterprises.pk",
      interestedService: "Commercial Showroom Ground Floor",
      platform: "google_sheets",
      sourceType: import_client.IngestionType.GOOGLE_SHEET,
      sourceId: sourceAzwaSheet.id,
      status: import_client.LeadStatus.INTERESTED,
      city: "Islamabad",
      customFields: {
        "Business Type": "Retail Pharmacy Chain",
        "Possession Time": "Immediate"
      }
    },
    {
      fullName: "Zainab Fatima",
      phone: "+92 345 9988776",
      email: "zainab.f@gmail.com",
      interestedService: "3 Bedroom Deluxe Apartment",
      platform: "google_forms",
      sourceType: import_client.IngestionType.GOOGLE_FORM,
      sourceId: sourceAzwaSheet.id,
      status: import_client.LeadStatus.CONVERTED,
      city: "Karachi",
      customFields: {
        "Down Payment Status": "Received via Pay Order",
        "Unit Number": "Tower B - 1204"
      }
    }
  ];
  for (const sLead of sampleLeadsAzwa) {
    const createdLead = await prisma.lead.create({
      data: {
        tenantId: tenantAzwa.id,
        sourceType: sLead.sourceType,
        ingestionSourceId: sLead.sourceId,
        fullName: sLead.fullName,
        phone: sLead.phone,
        email: sLead.email,
        interestedService: sLead.interestedService,
        platform: sLead.platform,
        status: sLead.status,
        city: sLead.city,
        customFields: sLead.customFields,
        submittedAt: new Date(Date.now() - Math.floor(Math.random() * 48 * 3600 * 1e3))
      }
    });
    await prisma.metaSubmission.create({
      data: {
        leadId: createdLead.id,
        rawPayload: {
          submittedVia: sLead.platform,
          data: sLead
        },
        formAnswers: {
          name: sLead.fullName,
          phone: sLead.phone,
          service: sLead.interestedService,
          ...sLead.customFields
        }
      }
    });
    await prisma.leadStatusHistory.create({
      data: {
        leadId: createdLead.id,
        previousStatus: import_client.LeadStatus.NEW,
        newStatus: sLead.status,
        reason: `Initial lifecycle capture from ${sLead.platform}`
      }
    });
    if (sLead.status === import_client.LeadStatus.CONTACTED || sLead.status === import_client.LeadStatus.INTERESTED) {
      await prisma.followUp.create({
        data: {
          tenantId: tenantAzwa.id,
          leadId: createdLead.id,
          scheduledAt: new Date(Date.now() + 4 * 3600 * 1e3),
          notes: "Send payment breakdown & schedule project site visit.",
          status: import_client.FollowUpStatus.PENDING
        }
      });
    }
  }
  const sampleLeadsAceOne = [
    {
      fullName: "Imran Sheikh (Apex Retail)",
      phone: "+92 301 5566778",
      email: "imran@apexretail.pk",
      interestedService: "Meta Lead Gen & CRM Setup",
      platform: "google_forms",
      sourceType: import_client.IngestionType.GOOGLE_FORM,
      sourceId: sourceAceOneForm.id,
      status: import_client.LeadStatus.NEW,
      city: "Karachi",
      customFields: {
        "Monthly Ad Budget": "$1,500 - $3,000 / month",
        "Company Size": "25-50 Employees"
      }
    },
    {
      fullName: "Faraz Ahmed",
      phone: "+92 322 8899001",
      email: "faraz@techhub.com",
      interestedService: "Custom SaaS & WhatsApp Automation",
      platform: "whatsapp",
      sourceType: import_client.IngestionType.WHATSAPP,
      sourceId: sourceAceOneWhatsApp.id,
      status: import_client.LeadStatus.INTERESTED,
      city: "Lahore",
      customFields: {
        "WhatsApp Inquiry": "Hi AceOne, we need an automated multi-tenant lead management system with WhatsApp integration for our real estate firm."
      }
    }
  ];
  for (const sLead of sampleLeadsAceOne) {
    const createdLead = await prisma.lead.create({
      data: {
        tenantId: tenantAceOneInternal.id,
        sourceType: sLead.sourceType,
        ingestionSourceId: sLead.sourceId,
        fullName: sLead.fullName,
        phone: sLead.phone,
        email: sLead.email,
        interestedService: sLead.interestedService,
        platform: sLead.platform,
        status: sLead.status,
        city: sLead.city,
        customFields: sLead.customFields,
        submittedAt: /* @__PURE__ */ new Date()
      }
    });
    await prisma.metaSubmission.create({
      data: {
        leadId: createdLead.id,
        rawPayload: sLead,
        formAnswers: {
          name: sLead.fullName,
          phone: sLead.phone,
          service: sLead.interestedService,
          ...sLead.customFields
        }
      }
    });
    await prisma.leadStatusHistory.create({
      data: {
        leadId: createdLead.id,
        previousStatus: import_client.LeadStatus.NEW,
        newStatus: sLead.status,
        reason: `Agency lead captured via ${sLead.platform}`
      }
    });
  }
  console.log(`\u2705 Seeded leads for Client Azwa and AceOne Internal Agency`);
  console.log("\u2728 Omnichannel database seed completed successfully!");
}
main().catch((e) => {
  console.error("\u274C Seed error:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
