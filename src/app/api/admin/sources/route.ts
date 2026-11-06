import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant-guard";
import { generateGoogleAppsScript } from "@/lib/google-apps-script-generator";
import { IngestionType } from "@prisma/client";
import { z } from "zod";

const createAdminSourceSchema = z.object({
  name: z.string().min(2, "Source name is required"),
  type: z.nativeEnum(IngestionType).default(IngestionType.GOOGLE_FORM),
  sheetUrl: z.string().optional().nullable(),
  tenantId: z.string().optional(), // If not provided, defaults to AceOne Internal tenant
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Find AceOne Internal Agency tenant
    let internalTenant = await prisma.tenant.findFirst({
      where: { isInternal: true },
    });

    if (!internalTenant) {
      // Auto-create AceOne Internal Agency tenant if not existing yet
      internalTenant = await prisma.tenant.create({
        data: {
          name: "AceOne Solutions (Agency Inquiries)",
          companyEmail: "inquiries@aceonesolutions.com",
          contactPerson: "AceOne Agency Admin",
          isInternal: true,
          status: "ACTIVE",
        },
      });
    }

    const sources = await prisma.ingestionSource.findMany({
      where: { tenantId: internalTenant.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { leads: true } },
      },
    });

    const sourcesWithScripts = sources.map((s) => ({
      ...s,
      webhookUrl: `${baseUrl}/api/webhooks/google-sheets`,
      appsScriptCode: generateGoogleAppsScript(baseUrl, s.secretKey, s.name),
    }));

    return NextResponse.json({
      internalTenant,
      sources: sourcesWithScripts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const validated = createAdminSourceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { name, type, sheetUrl } = validated.data;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let targetTenantId = validated.data.tenantId;
    if (!targetTenantId) {
      let internalTenant = await prisma.tenant.findFirst({
        where: { isInternal: true },
      });
      if (!internalTenant) {
        internalTenant = await prisma.tenant.create({
          data: {
            name: "AceOne Solutions (Agency Inquiries)",
            companyEmail: "inquiries@aceonesolutions.com",
            contactPerson: "AceOne Agency Admin",
            isInternal: true,
            status: "ACTIVE",
          },
        });
      }
      targetTenantId = internalTenant.id;
    }

    const source = await prisma.ingestionSource.create({
      data: {
        tenantId: targetTenantId,
        name,
        type,
        sheetUrl: sheetUrl || null,
      },
    });

    return NextResponse.json({
      success: true,
      source: {
        ...source,
        webhookUrl: `${baseUrl}/api/webhooks/google-sheets`,
        appsScriptCode: generateGoogleAppsScript(baseUrl, source.secretKey, source.name),
      },
      message: "Agency ingestion source created successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
