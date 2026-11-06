"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Printer, X, Loader2, MessageSquare, StickyNote } from "lucide-react";
import { formatTime12, formatDate } from "@/lib/date-utils";

function LeadsPrintContent() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    const fetchLeadsForPrint = async () => {
      try {
        const params = new URLSearchParams(searchParams.toString());
        params.set("limit", "1000"); // Full report dump
        params.set("page", "1");

        const res = await fetch(`/api/client/leads?${params.toString()}`);
        const data = await res.json();
        setLeads(data.leads || []);
      } catch (e) {
        console.error("Print data fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadsForPrint();
  }, [searchParams]);

  // Auto-trigger browser print dialog once data is loaded
  useEffect(() => {
    if (!loading && leads.length > 0 && !printed) {
      setPrinted(true);
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, leads, printed]);

  const activeStatus = searchParams.get("status") || "All Statuses";
  const activeSearch = searchParams.get("search");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-3 p-8">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-700">Preparing Printable Leads Document...</p>
        <p className="text-xs text-slate-400">Loading conversation history and customer records</p>
      </div>
    );
  }

  return (
    <>
      {/* Explicit Print Page Rules: Ensures 100% Fit with zero cutoff */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: landscape;
          margin: 6mm 5mm;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
          }
          th, td {
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}} />

      <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 font-sans p-4 sm:p-6 print:p-0">
        {/* Top Action Toolbar (Hidden in Print) */}
        <div className="no-print max-w-7xl mx-auto mb-4 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Print Preview — Leads Master Report</h2>
            <p className="text-xs text-slate-500">
              For best executive layout, keep orientation as <strong>Landscape</strong>. Click below to print or save as PDF.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={() => window.close()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="print-container max-w-7xl mx-auto bg-white border border-slate-200 print:border-none shadow-md print:shadow-none rounded-xl print:rounded-none p-6 sm:p-8 print:p-0">
          {/* Report Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-blue-900 uppercase">
                    Closify CRM
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">by @aceone solutions</span>
                </div>
                <h1 className="text-base font-bold text-slate-900 mt-0.5">
                  Leads &amp; Customer Inquiries Report
                </h1>
              </div>

              <div className="text-right text-xs text-slate-600">
                <div className="font-bold text-slate-900">
                  Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Time: {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </div>
              </div>
            </div>

            {/* Applied Filter Tags */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">Summary:</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold border border-slate-200 text-[11px]">
                Total Records: <strong>{leads.length}</strong>
              </span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold border border-slate-200 text-[11px]">
                Status: <strong>{activeStatus}</strong>
              </span>
              {activeSearch && (
                <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-800 font-semibold border border-blue-200 text-[11px]">
                  Query: &ldquo;{activeSearch}&rdquo;
                </span>
              )}
              {(fromDate || toDate) && (
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold border border-slate-200 text-[11px]">
                  Date Range: {fromDate ? formatDate(fromDate) : "Earliest"} &rarr; {toDate ? formatDate(toDate) : "Latest"}
                </span>
              )}
            </div>
          </div>

          {/* Data Table: 100% Fixed Percentage Layout to Guarantee Zero Cutoff */}
          <table className="w-full text-left text-[11px] border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                <th className="py-2 px-2 w-[8%] text-center border border-slate-800">Lead #</th>
                <th className="py-2 px-2.5 w-[21%] border border-slate-800">Customer &amp; Contact</th>
                <th className="py-2 px-2.5 w-[21%] border border-slate-800">Inquiry / Service</th>
                <th className="py-2 px-2.5 w-[27%] border border-slate-800">Latest Activity &amp; Notes</th>
                <th className="py-2 px-2 w-[11%] text-center border border-slate-800">Status</th>
                <th className="py-2 px-2 w-[12%] text-right border border-slate-800">Date &amp; Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    No leads found matching the selected report criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead, idx) => {
                  const latestNotes = lead.notes || [];
                  const staffNote = lead.latestStaffNote || latestNotes.find((n: any) => !n.content.startsWith("["));
                  const latestMsg = latestNotes.find((n: any) => n.content.startsWith("["));

                  return (
                    <tr
                      key={lead.id}
                      className={`border border-slate-200 ${idx % 2 === 1 ? "bg-slate-50/70" : "bg-white"}`}
                    >
                      {/* Lead # */}
                      <td className="py-2 px-2 font-mono font-bold text-slate-700 text-center align-top border border-slate-200">
                        #{lead.leadNumber}
                      </td>

                      {/* Customer & Contact */}
                      <td className="py-2 px-2.5 align-top border border-slate-200 overflow-hidden break-words">
                        <div className="font-bold text-slate-900 text-xs leading-tight">
                          {lead.fullName}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 font-mono text-slate-700 text-[10.5px]">
                          <span className="whitespace-nowrap">{lead.phone || "No phone"}</span>
                          {(lead.sourceType === "WHATSAPP" || lead.platform === "whatsapp") && (
                            <span className="inline-block px-1 py-0.2 bg-emerald-100 text-emerald-800 font-bold text-[8.5px] rounded shrink-0">
                              WA
                            </span>
                          )}
                        </div>
                        {lead.email && (
                          <div className="text-[9.5px] text-slate-400 truncate mt-0.2">{lead.email}</div>
                        )}
                      </td>

                      {/* Inquiry / Service */}
                      <td className="py-2 px-2.5 align-top border border-slate-200 overflow-hidden break-words">
                        <div className="text-slate-800 font-medium leading-snug">
                          {lead.interestedService || lead.notesSummary || "Inquiry received"}
                        </div>
                        {lead.campaign?.name && (
                          <div className="text-[9.5px] text-slate-400 mt-1 font-mono">
                            Campaign: {lead.campaign.name}
                          </div>
                        )}
                      </td>

                      {/* Latest Activity & Notes */}
                      <td className="py-2 px-2.5 align-top border border-slate-200 overflow-hidden break-words space-y-1">
                        {staffNote && (
                          <div className="p-1 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-950">
                            <div className="font-bold text-[9px] text-amber-800 flex items-center gap-1">
                              <StickyNote className="w-2.5 h-2.5 text-amber-600" />
                              <span>Staff Note:</span>
                            </div>
                            <div className="italic mt-0.2">{staffNote.content}</div>
                          </div>
                        )}
                        {latestMsg && (
                          <div className="text-[10px] text-slate-600 flex items-start gap-1">
                            <MessageSquare className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-tight">
                              {latestMsg.content.replace(/^\[Outbound WhatsApp Message\]:\s*"?/, "You: ").replace(/^\[Inbound WhatsApp Message\]:\s*"?/, "")}
                            </span>
                          </div>
                        )}
                        {!staffNote && !latestMsg && (
                          <span className="text-[10px] text-slate-400 italic">No notes logged</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-1.5 text-center align-top border border-slate-200">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                            lead.status === "NEW"
                              ? "bg-blue-50 text-blue-700 border-blue-300"
                              : lead.status === "CONTACTED"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : lead.status === "INTERESTED"
                              ? "bg-purple-50 text-purple-700 border-purple-300"
                              : lead.status === "CONVERTED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-slate-100 text-slate-700 border-slate-300"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      {/* Date & Time (100% Fit, Zero Clipping) */}
                      <td className="py-2 px-2 text-right font-mono text-[10px] text-slate-700 align-top border border-slate-200 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formatDate(lead.createdAt)}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{formatTime12(lead.createdAt)}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Report Footer */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
            <div>Closify CRM Multi-Tenant Platform &bull; AceOne Solutions</div>
            <div>Confidential &bull; Master Leads Report</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LeadsPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <LeadsPrintContent />
    </Suspense>
  );
}
