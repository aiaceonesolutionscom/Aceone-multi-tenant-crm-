import "dotenv/config";
import {
  PrismaClient,
  UserRole,
  TenantStatus,
  LeadStatus,
  FollowUpStatus,
  MetaSyncStatus,
  IngestionType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting AceOne Multi-Tenant Omnichannel CRM database seed...");

  // 1. Clean existing records in reverse dependency order
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

  const defaultPasswordHash = await bcrypt.hash("Password@123", 12);

  // 2. Super Admin User
  const superAdmin = await prisma.user.create({
    data: {
      name: "AceOne Super Admin",
      email: "admin@aceone.com",
      username: "superadmin",
      passwordHash: defaultPasswordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log("✅ Super Admin created: admin@aceone.com / Password@123");

  // 3. AceOne Internal Agency Workspace Tenant
  const tenantAceOneInternal = await prisma.tenant.create({
    data: {
      name: "AceOne Solutions (Internal Agency)",
      companyEmail: "inbound@aceonesolutions.com",
      contactPerson: "AceOne Media Team",
      phone: "+92 300 0001122",
      status: TenantStatus.ACTIVE,
      isInternal: true,
      timezone: "Asia/Karachi",
    },
  });
  console.log("✅ AceOne Internal Agency Workspace created");

  // Ingestion sources for AceOne Internal Agency
  const sourceAceOneForm = await prisma.ingestionSource.create({
    data: {
      tenantId: tenantAceOneInternal.id,
      name: "AceOne Official Website Google Form",
      type: IngestionType.GOOGLE_FORM,
      secretKey: "secret_aceone_form_2026",
      detectedHeaders: ["Full Name", "Phone Number", "Email", "Service Required", "Estimated Budget", "Project Description"],
    },
  });

  const sourceAceOneWhatsApp = await prisma.ingestionSource.create({
    data: {
      tenantId: tenantAceOneInternal.id,
      name: "AceOne WhatsApp Business Hotline",
      type: IngestionType.WHATSAPP,
      secretKey: "secret_aceone_whatsapp_2026",
      detectedHeaders: ["Sender Name", "Phone", "Message"],
    },
  });

  // 4. Client Tenants
  const tenantAzwa = await prisma.tenant.create({
    data: {
      name: "Azwa Real Estate & Living",
      companyEmail: "contact@azwa.com",
      contactPerson: "Kamran Siddiqui",
      phone: "+92 300 1234567",
      status: TenantStatus.ACTIVE,
      isInternal: false,
      timezone: "Asia/Karachi",
    },
  });

  await prisma.user.create({
    data: {
      tenantId: tenantAzwa.id,
      name: "Kamran Siddiqui",
      email: "azwa@aceonecrm.com",
      username: "azwa_admin",
      passwordHash: defaultPasswordHash,
      role: UserRole.CLIENT_ADMIN,
      isActive: true,
    },
  });
  console.log("✅ Client Admin created: azwa@aceonecrm.com / Password@123 (Tenant: Azwa)");

  // Ingestion Source for Client Azwa: Google Sheet & Google Form
  const sourceAzwaSheet = await prisma.ingestionSource.create({
    data: {
      tenantId: tenantAzwa.id,
      name: "Azwa Luxury Apartments Google Form Responses",
      type: IngestionType.GOOGLE_FORM,
      secretKey: "secret_azwa_sheet_2026",
      detectedHeaders: ["Client Name", "WhatsApp Contact", "Email", "Preferred Apartment", "Budget Range", "City"],
    },
  });

  const sourceAzwaWhatsApp = await prisma.ingestionSource.create({
    data: {
      tenantId: tenantAzwa.id,
      name: "Azwa Sales Team WhatsApp",
      type: IngestionType.WHATSAPP,
      secretKey: "secret_azwa_whatsapp_2026",
      detectedHeaders: ["Sender", "Mobile", "Inquiry"],
    },
  });

  const tenantApex = await prisma.tenant.create({
    data: {
      name: "Apex Logistics & Trade",
      companyEmail: "info@apexlogistics.com",
      contactPerson: "Sara Malik",
      phone: "+92 321 7654321",
      status: TenantStatus.ACTIVE,
      isInternal: false,
      timezone: "Asia/Karachi",
    },
  });

  await prisma.user.create({
    data: {
      tenantId: tenantApex.id,
      name: "Sara Malik",
      email: "apex@aceonecrm.com",
      username: "apex_admin",
      passwordHash: defaultPasswordHash,
      role: UserRole.CLIENT_ADMIN,
      isActive: true,
    },
  });
  console.log("✅ Client Admin created: apex@aceonecrm.com / Password@123 (Tenant: Apex)");

  // 5. Centralized Meta Connection (For Ads & Campaign Insights)
  const centralMetaConn = await prisma.metaConnection.create({
    data: {
      appId: "meta_app_aceone_2026",
      metaUserId: "meta_user_agency_primary",
      metaUserName: "AceOne Digital Media Agency",
      accessTokenEnc: "mock_encrypted_central_user_access_token_base64",
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      scopes: [
        "business_management",
        "pages_show_list",
        "pages_read_engagement",
        "ads_read",
      ],
      status: MetaSyncStatus.VERIFIED,
      lastVerifiedAt: new Date(),
    },
  });

  const portfolioAzwa = await prisma.businessPortfolio.create({
    data: {
      metaConnectionId: centralMetaConn.id,
      metaBusinessId: "biz_portfolio_azwa_101",
      name: "Azwa Properties Portfolio",
      status: MetaSyncStatus.VERIFIED,
      lastSyncedAt: new Date(),
    },
  });

  const portfolioApex = await prisma.businessPortfolio.create({
    data: {
      metaConnectionId: centralMetaConn.id,
      metaBusinessId: "biz_portfolio_apex_102",
      name: "Apex Global Fleet Portfolio",
      status: MetaSyncStatus.VERIFIED,
      lastSyncedAt: new Date(),
    },
  });

  await prisma.portfolioAssignment.create({
    data: {
      tenantId: tenantAzwa.id,
      businessPortfolioId: portfolioAzwa.id,
    },
  });

  await prisma.portfolioAssignment.create({
    data: {
      tenantId: tenantApex.id,
      businessPortfolioId: portfolioApex.id,
    },
  });
  console.log("✅ Meta Portfolios assigned to client tenants");

  // 6. Seed Sample Leads from Google Forms, Google Sheets & WhatsApp for Azwa
  const sampleLeadsAzwa = [
    {
      fullName: "Muhammad Rizwan",
      phone: "+92 300 8899112",
      email: "rizwan.prop@gmail.com",
      interestedService: "4 Bedroom Penthouse",
      platform: "google_forms",
      sourceType: IngestionType.GOOGLE_FORM,
      sourceId: sourceAzwaSheet.id,
      status: LeadStatus.NEW,
      city: "Karachi",
      customFields: {
        "Budget Range": "3.5 Crore PKR",
        "Financing Needed": "Yes (Bank Islamic Mortgage)",
        "Preferred Floor": "Top Floor (Penthouse)",
      },
    },
    {
      fullName: "Ayesha Jahangir (WhatsApp Inquiry)",
      phone: "+92 321 4455667",
      email: "ayesha.j@outlook.com",
      interestedService: "500 Sq Yards Luxury Villa Booking",
      platform: "whatsapp",
      sourceType: IngestionType.WHATSAPP,
      sourceId: sourceAzwaWhatsApp.id,
      status: LeadStatus.CONTACTED,
      city: "Lahore",
      customFields: {
        "Initial Message": "Hello, I saw your Instagram ad for luxury villas. Can you send the brochure and payment plan on this WhatsApp number?",
        "Lead Quality": "High Intent",
      },
    },
    {
      fullName: "Tariq Mehmood",
      phone: "+92 333 1122334",
      email: "tariq.m@enterprises.pk",
      interestedService: "Commercial Showroom Ground Floor",
      platform: "google_sheets",
      sourceType: IngestionType.GOOGLE_SHEET,
      sourceId: sourceAzwaSheet.id,
      status: LeadStatus.INTERESTED,
      city: "Islamabad",
      customFields: {
        "Business Type": "Retail Pharmacy Chain",
        "Possession Time": "Immediate",
      },
    },
    {
      fullName: "Zainab Fatima",
      phone: "+92 345 9988776",
      email: "zainab.f@gmail.com",
      interestedService: "3 Bedroom Deluxe Apartment",
      platform: "google_forms",
      sourceType: IngestionType.GOOGLE_FORM,
      sourceId: sourceAzwaSheet.id,
      status: LeadStatus.CONVERTED,
      city: "Karachi",
      customFields: {
        "Down Payment Status": "Received via Pay Order",
        "Unit Number": "Tower B - 1204",
      },
    },
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
        submittedAt: new Date(Date.now() - Math.floor(Math.random() * 48 * 3600 * 1000)),
      },
    });

    await prisma.metaSubmission.create({
      data: {
        leadId: createdLead.id,
        rawPayload: {
          submittedVia: sLead.platform,
          data: sLead,
        },
        formAnswers: {
          name: sLead.fullName,
          phone: sLead.phone,
          service: sLead.interestedService,
          ...sLead.customFields,
        },
      },
    });

    await prisma.leadStatusHistory.create({
      data: {
        leadId: createdLead.id,
        previousStatus: LeadStatus.NEW,
        newStatus: sLead.status,
        reason: `Initial lifecycle capture from ${sLead.platform}`,
      },
    });

    if (sLead.status === LeadStatus.CONTACTED || sLead.status === LeadStatus.INTERESTED) {
      await prisma.followUp.create({
        data: {
          tenantId: tenantAzwa.id,
          leadId: createdLead.id,
          scheduledAt: new Date(Date.now() + 4 * 3600 * 1000),
          notes: "Send payment breakdown & schedule project site visit.",
          status: FollowUpStatus.PENDING,
        },
      });
    }
  }

  // 7. Seed Sample Leads for AceOne Internal Agency Workspace
  const sampleLeadsAceOne = [
    {
      fullName: "Imran Sheikh (Apex Retail)",
      phone: "+92 301 5566778",
      email: "imran@apexretail.pk",
      interestedService: "Meta Lead Gen & CRM Setup",
      platform: "google_forms",
      sourceType: IngestionType.GOOGLE_FORM,
      sourceId: sourceAceOneForm.id,
      status: LeadStatus.NEW,
      city: "Karachi",
      customFields: {
        "Monthly Ad Budget": "$1,500 - $3,000 / month",
        "Company Size": "25-50 Employees",
      },
    },
    {
      fullName: "Faraz Ahmed",
      phone: "+92 322 8899001",
      email: "faraz@techhub.com",
      interestedService: "Custom SaaS & WhatsApp Automation",
      platform: "whatsapp",
      sourceType: IngestionType.WHATSAPP,
      sourceId: sourceAceOneWhatsApp.id,
      status: LeadStatus.INTERESTED,
      city: "Lahore",
      customFields: {
        "WhatsApp Inquiry": "Hi AceOne, we need an automated multi-tenant lead management system with WhatsApp integration for our real estate firm.",
      },
    },
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
        submittedAt: new Date(),
      },
    });

    await prisma.metaSubmission.create({
      data: {
        leadId: createdLead.id,
        rawPayload: sLead,
        formAnswers: {
          name: sLead.fullName,
          phone: sLead.phone,
          service: sLead.interestedService,
          ...sLead.customFields,
        },
      },
    });

    await prisma.leadStatusHistory.create({
      data: {
        leadId: createdLead.id,
        previousStatus: LeadStatus.NEW,
        newStatus: sLead.status,
        reason: `Agency lead captured via ${sLead.platform}`,
      },
    });
  }

  console.log(`✅ Seeded leads for Client Azwa and AceOne Internal Agency`);
  console.log("✨ Omnichannel database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
