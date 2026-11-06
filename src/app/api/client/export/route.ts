import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClientContext, handleApiError } from "@/lib/tenant-guard";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireClientContext();
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "csv").toLowerCase();
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const sourceType = searchParams.get("sourceType");
    const search = searchParams.get("search") || "";
    const fromDate = searchParams.get("fromDate") || searchParams.get("startDate");
    const toDate = searchParams.get("toDate") || searchParams.get("endDate");
    const hasNotes = searchParams.get("hasNotes");
    const hasFollowUp = searchParams.get("hasFollowUp");

    const where: any = {
      tenantId,
      ...(status && { status: status as any }),
      ...(platform && { platform }),
      ...(sourceType === "GOOGLE_SHEET_FORM"
        ? { sourceType: { in: ["GOOGLE_FORM", "GOOGLE_SHEET"] } }
        : sourceType
        ? { sourceType }
        : {}),
      ...(hasNotes === "true" ? { notes: { some: { NOT: [{ content: { startsWith: "[" } }] } } } : {}),
      ...(hasFollowUp === "true" ? { followUps: { some: { status: "PENDING" } } } : {}),
    };

    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) {
        const parsedStart = new Date(fromDate);
        if (!isNaN(parsedStart.getTime())) {
          parsedStart.setHours(0, 0, 0, 0);
          dateFilter.gte = parsedStart;
        }
      }
      if (toDate) {
        const parsedEnd = new Date(toDate);
        if (!isNaN(parsedEnd.getTime())) {
          parsedEnd.setHours(23, 59, 59, 999);
          dateFilter.lte = parsedEnd;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        where.createdAt = dateFilter;
      }
    }

    if (search.trim()) {
      const q = search.trim();
      const asNum = parseInt(q, 10);
      const cleanDigits = q.replace(/\D/g, "");
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        ...(cleanDigits.length >= 4 ? [{ phone: { contains: cleanDigits } }] : []),
        { email: { contains: q, mode: "insensitive" } },
        { interestedService: { contains: q, mode: "insensitive" } },
        { notesSummary: { contains: q, mode: "insensitive" } },
        { notes: { some: { content: { contains: q, mode: "insensitive" } } } },
        ...(!isNaN(asNum) ? [{ leadNumber: asNum }] : []),
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        campaign: { select: { name: true } },
        ad: { select: { name: true } },
        metaForm: { select: { name: true } },
        notes: {
          orderBy: { createdAt: "desc" },
          select: { content: true, createdAt: true },
        },
      },
    });

    const todayStr = new Date().toISOString().split("T")[0];

    // Format rows cleanly for both Excel and CSV
    const formattedData = leads.map((l) => {
      // Separate latest staff note from customer WhatsApp messages
      const staffNote = l.notes.find((n) => !n.content.startsWith("[Inbound") && !n.content.startsWith("[Outbound"));
      const latestChat = l.notes.find((n) => n.content.startsWith("[Inbound") || n.content.startsWith("[Outbound"));

      let cleanChat = "";
      if (latestChat) {
        cleanChat = latestChat.content
          .replace(/^\[Outbound WhatsApp Message\]:\s*"?/, "You: ")
          .replace(/^\[Inbound WhatsApp Message\]:\s*"?/, "Customer: ")
          .replace(/"$/, "");
      }

      const channel =
        l.sourceType === "WHATSAPP" || l.platform === "whatsapp"
          ? "WhatsApp"
          : l.sourceType === "GOOGLE_SHEET" || l.platform === "google_sheets"
          ? "Google Sheets"
          : l.sourceType === "GOOGLE_FORM"
          ? "Google Forms"
          : l.platform || "Direct Web";

      const createdDateStr = new Date(l.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) + " " + new Date(l.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      return {
        "Lead #": l.leadNumber,
        "Customer Name": l.fullName,
        "Phone Number": l.phone || "N/A",
        "Email Address": l.email || "N/A",
        "Inquiry / Interested Service": l.interestedService || l.notesSummary || "N/A",
        "Status": l.status,
        "Source Channel": channel,
        "Campaign": l.campaign?.name || "Direct",
        "Latest Staff Note": staffNote?.content || "",
        "Latest Conversation": cleanChat || l.notesSummary || "",
        "Created Date": createdDateStr,
      };
    });

    // 1. Genuine Native Excel (.xlsx) Binary Format
    if (format === "excel" || format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(formattedData);

      // Auto-fit column widths so data is beautifully laid out
      ws["!cols"] = [
        { wch: 10 }, // Lead #
        { wch: 24 }, // Customer Name
        { wch: 18 }, // Phone Number
        { wch: 24 }, // Email Address
        { wch: 32 }, // Inquiry / Interested Service
        { wch: 14 }, // Status
        { wch: 16 }, // Source Channel
        { wch: 18 }, // Campaign
        { wch: 32 }, // Latest Staff Note
        { wch: 45 }, // Latest Conversation
        { wch: 22 }, // Created Date
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads Report");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Closify_Leads_${todayStr}.xlsx"`,
        },
      });
    }

    // 2. High-Compatibility UTF-8 CSV with BOM
    const headers = [
      "Lead #",
      "Customer Name",
      "Phone Number",
      "Email Address",
      "Inquiry / Interested Service",
      "Status",
      "Source Channel",
      "Campaign",
      "Latest Staff Note",
      "Latest Conversation",
      "Created Date",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = formattedData.map((d) => [
      d["Lead #"],
      escapeCsv(d["Customer Name"]),
      escapeCsv(d["Phone Number"]),
      escapeCsv(d["Email Address"]),
      escapeCsv(d["Inquiry / Interested Service"]),
      escapeCsv(d["Status"]),
      escapeCsv(d["Source Channel"]),
      escapeCsv(d["Campaign"]),
      escapeCsv(d["Latest Staff Note"]),
      escapeCsv(d["Latest Conversation"]),
      escapeCsv(d["Created Date"]),
    ]);

    // Prepend UTF-8 BOM (\uFEFF) so Excel opens without character corruption
    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Closify_Leads_${todayStr}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
