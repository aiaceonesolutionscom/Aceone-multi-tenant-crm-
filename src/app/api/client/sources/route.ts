import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";
import { generateGoogleAppsScript } from "@/lib/google-apps-script-generator";
import { IngestionType } from "@prisma/client";
import { z } from "zod";

const createSourceSchema = z.object({
  name: z.string().min(2, "Source name is required"),
  type: z.nativeEnum(IngestionType).default(IngestionType.GOOGLE_FORM),
  sheetUrl: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const { tenantId } = await requireClientContext();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { enabledChannels: true },
    });

    if (tenant?.enabledChannels && !tenant.enabledChannels.includes("GOOGLE_SHEETS")) {
      return NextResponse.json(
        { error: "Google Sheets & Forms CRM is not enabled for your workspace plan." },
        { status: 403 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const sources = await prisma.ingestionSource.findMany({
      where: { tenantId },
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

    return NextResponse.json({ sources: sourcesWithScripts });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireClientContext();
    const body = await req.json();
    const validated = createSourceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { name, type, sheetUrl } = validated.data;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const source = await prisma.ingestionSource.create({
      data: {
        tenantId,
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
      message: "Ingestion source created successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
