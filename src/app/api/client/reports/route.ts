import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";

export async function GET() {
  try {
    const { tenantId } = await requireClientContext();

    const [
      leadsByStatus,
      leadsByPlatform,
      leadsByCampaign,
      leadsByForm,
      totalLeads,
    ] = await Promise.all([
      prisma.lead.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ["platform"],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ["campaignId"],
        where: { tenantId, campaignId: { not: null } },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ["metaFormId"],
        where: { tenantId, metaFormId: { not: null } },
        _count: { id: true },
      }),
      prisma.lead.count({ where: { tenantId } }),
    ]);

    // Fetch names for campaign IDs & form IDs
    const campaignIds = leadsByCampaign.map((c) => c.campaignId!).filter(Boolean);
    const formIds = leadsByForm.map((f) => f.metaFormId!).filter(Boolean);

    const [campaigns, forms] = await Promise.all([
      prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, name: true },
      }),
      prisma.metaForm.findMany({
        where: { id: { in: formIds } },
        select: { id: true, name: true },
      }),
    ]);

    const campaignMap = new Map(campaigns.map((c) => [c.id, c.name]));
    const formMap = new Map(forms.map((f) => [f.id, f.name]));

    const campaignStats = leadsByCampaign.map((c) => ({
      name: campaignMap.get(c.campaignId!) || "Other Campaign",
      count: c._count.id,
    }));

    const formStats = leadsByForm.map((f) => ({
      name: formMap.get(f.metaFormId!) || "Instant Form",
      count: f._count.id,
    }));

    return NextResponse.json({
      totalLeads,
      byStatus: leadsByStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byPlatform: leadsByPlatform.map((p) => ({ platform: p.platform, count: p._count.id })),
      byCampaign: campaignStats,
      byForm: formStats,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
