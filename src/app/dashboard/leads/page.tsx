"use client";

import { useEffect, useState } from "react";
import {
  Inbox,
  Search,
  Filter,
  Download,
  Share2,
  Phone,
  Mail,
  Building2,
  Calendar,
  Clock,
  Send,
  X,
  Loader2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  CheckCheck,
  MessageSquare,
  History,
  FileSpreadsheet,
  CalendarClock,
  Sparkles,
  PhoneCall,
  MessageCircle,
  FileText,
  StickyNote,
  ChevronDown,
  Printer,
} from "lucide-react";
import { formatTime12, formatDateTime12, formatFullDateTime12, formatDate } from "@/lib/date-utils";
import { getTelLink, getWhatsAppChatLink, getWhatsAppCallLink } from "@/lib/phone-utils";
import { ConfirmModal, ConfirmDialogOptions } from "@/components/common/ConfirmModal";

interface LeadListItem {
  id: string;
  leadNumber: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  interestedService: string | null;
  platform: string;
  sourceType?: "GOOGLE_FORM" | "GOOGLE_SHEET" | "WHATSAPP" | "CUSTOM_WEBHOOK" | "META_LEAD_ADS";
  status: "NEW" | "CONTACTED" | "INTERESTED" | "CONVERTED" | "LOST";
  createdAt: string;
  submittedAt: string;
  customFields?: Record<string, any> | null;
  ingestionSource?: { id: string; name: string; type: string } | null;
  campaign?: { id: string; name: string } | null;
  ad?: { id: string; name: string } | null;
  metaForm?: { id: string; name: string } | null;
  facebookPage?: { id: string; name: string } | null;
  notes?: Array<{ id: string; content: string; createdAt: string }>;
  latestStaffNote?: {
    id: string;
    content: string;
    createdAt: string;
    user?: { name: string } | null;
  } | null;
}

interface LeadDetailData extends LeadListItem {
  leadgenId?: string | null;
  city: string | null;
  companyName: string | null;
  adSet?: { id: string; name: string } | null;
  metaSubmission?: {
    formAnswers: Record<string, string>;
    rawPayload: any;
  } | null;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
    user?: { name: string } | null;
  }>;
  statusHistories: Array<{
    id: string;
    previousStatus: string;
    newStatus: string;
    reason: string | null;
    createdAt: string;
    user?: { name: string } | null;
  }>;
  followUps: Array<{
    id: string;
    scheduledAt: string;
    notes: string | null;
    status: string;
  }>;
}

function parseWhatsAppNote(content: string) {
  const isOutbound = content.startsWith("[Outbound WhatsApp Message]:");
  const isInbound = content.startsWith("[Inbound WhatsApp Message]:");
  let text = content;
  if (isOutbound) {
    text = content.replace(/^\[Outbound WhatsApp Message\]:\s*"?/, "").replace(/"?$/, "");
  } else if (isInbound) {
    text = content.replace(/^\[Inbound WhatsApp Message\]:\s*"?/, "").replace(/"?$/, "");
  }

  // Sanitize media/voice note labels
  if (text.includes("Customer sent a Voice Note") || text === "[Voice Note]" || text === "Voice Note") {
    text = "🎙️ Voice Note";
  } else if (text.includes("Customer sent a Photo") || text === "[Photo]" || text === "Photo") {
    text = "📷 Photo";
  } else if (text.includes("Customer sent a Video") || text === "[Video]" || text === "Video") {
    text = "🎥 Video";
  } else if (text.includes("Customer sent a Document") || text === "[Document]" || text === "Document") {
    text = "📄 Document";
  }

  return {
    isOutbound,
    isInbound,
    isWhatsApp: isOutbound || isInbound,
    isInternalNote: !isOutbound && !isInbound,
    text,
  };
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [campaignOptions, setCampaignOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [sourceOptions, setSourceOptions] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [enabledChannels, setEnabledChannels] = useState<string[]>(["WHATSAPP"]);
  const [hasNotesFilter, setHasNotesFilter] = useState("");
  const [hasFollowUpFilter, setHasFollowUpFilter] = useState("");
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Universal Confirmation Dialog State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmDialogOptions | null>(null);

  const requestConfirm = (opts: ConfirmDialogOptions) => {
    setConfirmOptions(opts);
    setIsConfirmOpen(true);
  };

  // Date Range (Date to Date) Filter State
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [datePreset, setDatePreset] = useState("all");

  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const toStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (preset === "all") {
      setFromDate("");
      setToDate("");
    } else if (preset === "today") {
      setFromDate(toStr);
      setToDate(toStr);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const dStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      setFromDate(dStr);
      setToDate(toStr);
    } else if (preset === "30days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const dStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      setFromDate(dStr);
      setToDate(toStr);
    } else if (preset === "thisMonth") {
      const firstDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      setFromDate(firstDay);
      setToDate(toStr);
    }
  };

  // Detail Modal State
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<LeadDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);

  // Quick Follow-up in Lead Drawer
  const [isSchedulingFollowUp, setIsSchedulingFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadLeads = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (platformFilter) params.set("platform", platformFilter);
      if (sourceTypeFilter) params.set("sourceType", sourceTypeFilter);
      if (selectedSourceId) params.set("sourceId", selectedSourceId);
      if (campaignFilter) params.set("campaignId", campaignFilter);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (hasNotesFilter) params.set("hasNotes", hasNotesFilter);
      if (hasFollowUpFilter) params.set("hasFollowUp", hasFollowUpFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/client/leads?${params.toString()}`);
      const json = await res.json();
      setLeads(json.leads || []);
      if (json.pagination) {
        setTotalLeadsCount(json.pagination.total ?? 0);
        setTotalPages(json.pagination.totalPages ?? 1);
      }
      if (json.filterOptions?.campaigns) {
        setCampaignOptions(json.filterOptions.campaigns);
      }
      if (json.filterOptions?.sources) {
        setSourceOptions(json.filterOptions.sources);
      }
      if (json.filterOptions?.enabledChannels) {
        setEnabledChannels(json.filterOptions.enabledChannels);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
    const interval = setInterval(() => {
      loadLeads(true); // Silent real-time auto-refresh
    }, 3500);
    return () => clearInterval(interval);
  }, [page, limit, search, statusFilter, platformFilter, sourceTypeFilter, selectedSourceId, campaignFilter, fromDate, toDate, hasNotesFilter, hasFollowUpFilter]);

  const openLeadDetail = async (id: string) => {
    setSelectedLeadId(id);
    setDetailLoading(true);
    setIsSchedulingFollowUp(false);
    try {
      const res = await fetch(`/api/client/leads/${id}`);
      const json = await res.json();
      setDetailData(json.lead);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const performStatusChange = async (newStatus: string) => {
    if (!detailData) return;
    try {
      const res = await fetch(`/api/client/leads/${detailData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        openLeadDetail(detailData.id);
        loadLeads();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!detailData || detailData.status === newStatus) return;

    if (newStatus === "LOST") {
      requestConfirm({
        title: "Mark Lead as Lost?",
        message: `Are you sure you want to mark lead #${detailData.leadNumber} (${detailData.fullName}) as Lost?`,
        variant: "danger",
        confirmText: "Yes, Mark Lost",
        onConfirm: () => performStatusChange(newStatus),
      });
      return;
    }

    if (newStatus === "CONVERTED") {
      requestConfirm({
        title: "Convert Deal / Won?",
        message: `Are you sure you want to mark lead #${detailData.leadNumber} (${detailData.fullName}) as Converted / Won? Great job!`,
        variant: "success",
        confirmText: "Yes, Mark Converted",
        onConfirm: () => performStatusChange(newStatus),
      });
      return;
    }

    await performStatusChange(newStatus);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailData || !newNote.trim()) return;

    setNoteSubmitting(true);
    try {
      const res = await fetch(`/api/client/leads/${detailData.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote("");
        openLeadDetail(detailData.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailData || !followUpDate) return;

    setFollowUpSubmitting(true);
    try {
      const res = await fetch("/api/client/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: detailData.id,
          scheduledAt: new Date(followUpDate).toISOString(),
          notes: followUpNotes,
        }),
      });
      if (res.ok) {
        setIsSchedulingFollowUp(false);
        setFollowUpDate("");
        setFollowUpNotes("");
        openLeadDetail(detailData.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    setExportDropdownOpen(false);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (platformFilter) params.set("platform", platformFilter);
    if (sourceTypeFilter) params.set("sourceType", sourceTypeFilter);
    if (selectedSourceId) params.set("sourceId", selectedSourceId);
    if (campaignFilter) params.set("campaignId", campaignFilter);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (hasNotesFilter) params.set("hasNotes", hasNotesFilter);
    if (hasFollowUpFilter) params.set("hasFollowUp", hasFollowUpFilter);

    if (format === "pdf") {
      window.open(`/dashboard/leads/print?${params.toString()}`, "_blank");
      return;
    }

    params.set("format", format);
    window.location.href = `/api/client/export?${params.toString()}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leads Management</h1>
          <p className="text-sm text-slate-500">
            Search, manage customer statuses, and review real-time incoming inquiries.
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export Leads</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {exportDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs divide-y divide-slate-100">
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => handleExport("excel")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 flex items-center gap-2.5 text-slate-700 hover:text-emerald-800 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold">Microsoft Excel (.xlsx)</div>
                    <div className="text-[10px] text-slate-400">Formatted spreadsheet table</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 flex items-center gap-2.5 text-slate-700 hover:text-blue-800 transition cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-semibold">CSV Spreadsheet (.csv)</div>
                    <div className="text-[10px] text-slate-400">Universal comma-separated values</div>
                  </div>
                </button>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 flex items-center gap-2.5 text-slate-700 hover:text-rose-800 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <div className="font-semibold">Print / Save as PDF (.pdf)</div>
                    <div className="text-[10px] text-slate-400">Clean printable document</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Search Input (Protected against form submit & enter reloads) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
            className="relative w-full sm:w-64"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, phone, messages, #ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </form>

          {/* Primary Channel Filter: Dynamically adapts to client's assigned channels */}
          {enabledChannels.length === 1 && enabledChannels.includes("WHATSAPP") ? (
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp Inquiries</span>
            </div>
          ) : enabledChannels.length > 1 ? (
            <select
              value={sourceTypeFilter}
              onChange={(e) => {
                setSourceTypeFilter(e.target.value);
                setSelectedSourceId("");
                setPage(1);
              }}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              <option value="">All Channels</option>
              {enabledChannels.includes("WHATSAPP") && (
                <option value="WHATSAPP">WhatsApp Business</option>
              )}
              {enabledChannels.includes("GOOGLE_SHEETS") && (
                <option value="GOOGLE_SHEET_FORM">Google Sheets &amp; Forms</option>
              )}
            </select>
          ) : null}

          {/* Secondary Dropdown: Specific Form / Sheet (Only shown when Google Sheets & Forms is enabled) */}
          {enabledChannels.includes("GOOGLE_SHEETS") && (sourceTypeFilter === "GOOGLE_SHEET_FORM" || sourceTypeFilter === "GOOGLE_FORM" || sourceTypeFilter === "GOOGLE_SHEET") && (
            <select
              value={selectedSourceId}
              onChange={(e) => {
                setSelectedSourceId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 max-w-[220px] truncate"
            >
              <option value="">All Google Forms &amp; Sheets</option>
              {sourceOptions
                .filter((s) => s.type === "GOOGLE_FORM" || s.type === "GOOGLE_SHEET")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type === "GOOGLE_FORM" ? "Form" : "Sheet"})
                  </option>
                ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="INTERESTED">Interested</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </select>

          {/* Quick Filter: Notes & Follow-ups */}
          <select
            value={hasNotesFilter ? "notes" : hasFollowUpFilter ? "followup" : ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "notes") {
                setHasNotesFilter("true");
                setHasFollowUpFilter("");
              } else if (val === "followup") {
                setHasNotesFilter("");
                setHasFollowUpFilter("true");
              } else {
                setHasNotesFilter("");
                setHasFollowUpFilter("");
              }
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          >
            <option value="">All Records</option>
            <option value="notes">Has Staff Notes</option>
            <option value="followup">Has Pending Follow-up</option>
          </select>

          {/* Platform Filter (Only shown if client has multi-platform / non-WhatsApp sources) */}
          {!enabledChannels.every((c) => c === "WHATSAPP") && (
            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              <option value="">All Platforms</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
          )}

          {/* Campaign Filter */}
          {campaignOptions.length > 0 && (
            <select
              value={campaignFilter}
              onChange={(e) => {
                setCampaignFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white max-w-full sm:max-w-[200px] truncate"
            >
              <option value="">All Campaigns</option>
              {campaignOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Date to Date Filter (Full width on mobile, inline on desktop) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs w-full sm:w-auto">
            <div className="flex items-center gap-1 pl-1.5 text-slate-500 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold text-slate-700 hidden sm:inline">Date:</span>
            </div>

            <select
              value={datePreset}
              onChange={(e) => handleDatePreset(e.target.value)}
              className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer flex-1 sm:flex-initial w-full sm:w-auto"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {(datePreset === "custom" || fromDate || toDate) && (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2 py-1 w-full sm:w-auto mt-1 sm:mt-0">
                <div className="flex items-center gap-1 flex-1 min-w-[110px]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">From:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setDatePreset("custom");
                    }}
                    className="text-xs text-slate-800 bg-transparent focus:outline-none cursor-pointer w-full"
                  />
                </div>
                <div className="flex items-center gap-1 flex-1 min-w-[110px]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">To:</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setDatePreset("custom");
                    }}
                    className="text-xs text-slate-800 bg-transparent focus:outline-none cursor-pointer w-full"
                  />
                </div>
                {(fromDate || toDate) && (
                  <button
                    onClick={() => handleDatePreset("all")}
                    title="Clear date filter"
                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition shrink-0 ml-auto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500 w-full lg:w-auto flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 lg:pt-0">
          {(fromDate || toDate) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold whitespace-nowrap shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                {fromDate === toDate
                  ? formatDate(fromDate!)
                  : `${fromDate ? formatDate(fromDate) : "Start"} → ${toDate ? formatDate(toDate) : "End"}`}
              </span>
            </span>
          )}
          <span className="whitespace-nowrap text-xs font-medium">
            Total: <strong className="text-slate-900 font-bold">{totalLeadsCount}</strong> leads
          </span>
        </div>
      </div>

      {/* Leads Content: Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No leads found matching your filters.
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (Hidden on Tablet/Desktop: md:hidden) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {leads.map((lead) => {
                const telUrl = getTelLink(lead.phone);
                const waChatUrl = getWhatsAppChatLink(lead.phone);
                const waCallUrl = getWhatsAppCallLink(lead.phone);

                return (
                  <div
                    key={`mobile-${lead.id}`}
                    onClick={() => openLeadDetail(lead.id)}
                    className="p-4 hover:bg-slate-50/70 transition cursor-pointer space-y-3"
                  >
                    {/* Header: Lead #, Customer Name, Status Badge, Date */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                          #{lead.leadNumber}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 break-words min-w-0" title={lead.fullName}>
                          {lead.fullName}
                        </h3>
                      </div>
                      <span
                        className={`shrink-0 px-2.5 py-0.5 rounded text-[11px] font-bold ${
                          lead.status === "NEW"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : lead.status === "CONTACTED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : lead.status === "INTERESTED"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : lead.status === "CONVERTED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </div>

                    {/* Contact & Channel Meta */}
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.phone || "No phone"}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDate(lead.createdAt)}
                      </span>
                    </div>

                    {/* Last Messages Bubble Preview */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>Last Messages</span>
                        </span>
                        {lead.notes && lead.notes.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatTime12(lead.notes[0]?.createdAt)}
                          </span>
                        )}
                      </div>
                      {lead.notes && lead.notes.length > 0 ? (
                        <div className="space-y-1">
                          {[...lead.notes.slice(0, 2)].reverse().map((note, idx, arr) => {
                            const isLatest = idx === arr.length - 1;
                            const parsed = parseWhatsAppNote(note.content);
                            return (
                              <div
                                key={note.id || idx}
                                className={`text-xs px-2.5 py-1 rounded-md flex items-center justify-between gap-2 ${
                                  parsed.isInternalNote
                                    ? "bg-amber-50/90 text-amber-950 border border-amber-300/80 shadow-2xs"
                                    : parsed.isOutbound
                                    ? isLatest
                                      ? "bg-blue-50 text-blue-950 border border-blue-300 font-semibold shadow-2xs"
                                      : "bg-blue-50/60 text-blue-900 border border-blue-100 text-[11px]"
                                    : isLatest
                                    ? "bg-emerald-50 text-emerald-950 border border-emerald-300 font-semibold shadow-2xs"
                                    : "bg-white text-slate-600 border border-slate-200 text-[11px]"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {parsed.isInternalNote ? (
                                    <span className="inline-flex items-center gap-1 text-amber-800 font-bold shrink-0 text-[10px]">
                                      <StickyNote className="w-3 h-3 text-amber-600" />
                                      <span>Staff Note:</span>
                                    </span>
                                  ) : parsed.isOutbound ? (
                                    <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold shrink-0 text-[10px]">
                                      <CheckCheck className="w-3 h-3 text-blue-600" />
                                      <span>You:</span>
                                    </span>
                                  ) : isLatest ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                  ) : null}
                                  <span className="truncate">{parsed.text}</span>
                                </div>
                                <span className={`text-[10px] shrink-0 font-mono ${parsed.isInternalNote ? "text-amber-700/70" : "text-slate-400"}`}>
                                  {formatTime12(note.createdAt)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-700 italic">
                          {lead.interestedService || "No inbound message yet."}
                        </p>
                      )}

                      {/* Prominent Latest Staff Note Banner (Always pinned if exists) */}
                      {lead.latestStaffNote && (
                        <div className="mt-1 px-2.5 py-1 bg-amber-50/95 border border-amber-300/80 rounded-md text-[11px] text-amber-950 flex items-center justify-between gap-1.5 shadow-2xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="inline-flex items-center gap-1 text-amber-800 font-bold shrink-0 text-[10px]">
                              <StickyNote className="w-3 h-3 text-amber-600" />
                              <span>Staff Note:</span>
                            </span>
                            <span className="truncate italic font-medium">{lead.latestStaffNote.content}</span>
                          </div>
                          <span className="text-[10px] text-amber-700/80 font-mono shrink-0 ml-1">
                            {formatDate(lead.latestStaffNote.createdAt)}, {formatTime12(lead.latestStaffNote.createdAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 3 Touch-Optimized Quick Action Buttons (Height 42px, Touch Spacing Gap 8px) */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {telUrl ? (
                        <a
                          href={telUrl}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 h-10 px-2 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs active:scale-95 transition"
                          title="Direct Cellular Call"
                        >
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          <span>Call</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="flex items-center justify-center gap-1.5 h-10 px-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 cursor-not-allowed"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </button>
                      )}

                      {waCallUrl ? (
                        <a
                          href={waCallUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 h-10 px-2 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs active:scale-95 transition"
                          title="Call on WhatsApp"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WA Call</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="flex items-center justify-center gap-1.5 h-10 px-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 cursor-not-allowed"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>WA Call</span>
                        </button>
                      )}

                      {waChatUrl ? (
                        <a
                          href={waChatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 h-10 px-2 rounded-lg text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-2xs active:scale-95 transition"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-white" />
                          <span>WA Chat</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="flex items-center justify-center gap-1.5 h-10 px-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 cursor-not-allowed"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WA Chat</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Desktop High-Density Table View (Hidden on Mobile: hidden md:block) - ZERO HORIZONTAL SCROLL FIT */}
            <div className="hidden md:block">
              <table className="w-full text-left text-xs table-fixed">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-16 text-center">Lead #</th>
                    <th className="py-3 px-3.5 w-56">Customer & Contact</th>
                    <th className="py-3 px-3.5">Last 3 Messages / Inquiry</th>
                    <th className="py-3 px-3.5 w-28">Status</th>
                    <th className="py-3 px-3.5 w-28">Date</th>
                    <th className="py-3 px-3.5 w-36 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => {
                    const telUrl = getTelLink(lead.phone);
                    const waChatUrl = getWhatsAppChatLink(lead.phone);
                    const waCallUrl = getWhatsAppCallLink(lead.phone);

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => openLeadDetail(lead.id)}
                        className="hover:bg-slate-50/80 transition cursor-pointer"
                      >
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 text-center">
                          #{lead.leadNumber}
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900 break-words" title={lead.fullName}>
                            {lead.fullName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-medium text-slate-600 text-[11px] font-mono whitespace-nowrap">
                              {lead.phone || "No phone"}
                            </span>
                            {lead.sourceType === "WHATSAPP" || lead.platform === "whatsapp" ? (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                WA
                              </span>
                            ) : lead.sourceType === "GOOGLE_SHEET" || lead.platform === "google_sheets" ? (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-green-100 text-green-800">
                                Sheet
                              </span>
                            ) : null}
                          </div>
                          {lead.email && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              {lead.email}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3.5">
                          {lead.notes && lead.notes.length > 0 ? (
                            <div className="space-y-1">
                              {[...lead.notes.slice(0, 3)].reverse().map((note, idx, arr) => {
                                const isLatest = idx === arr.length - 1;
                                const parsed = parseWhatsAppNote(note.content);
                                return (
                                  <div
                                    key={note.id || idx}
                                    className={`text-xs px-2.5 py-1 rounded-md flex items-center justify-between gap-2 ${
                                      parsed.isInternalNote
                                        ? "bg-amber-50/90 text-amber-950 border border-amber-300/80 shadow-2xs"
                                        : parsed.isOutbound
                                        ? isLatest
                                          ? "bg-blue-50 text-blue-950 border border-blue-300 font-semibold shadow-2xs"
                                          : "bg-blue-50/60 text-blue-900 border border-blue-100 text-[11px]"
                                        : isLatest
                                        ? "bg-emerald-50 text-emerald-950 border border-emerald-300 font-semibold shadow-2xs"
                                        : "bg-slate-50 text-slate-700 border border-slate-200/70 text-[11px]"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {parsed.isInternalNote ? (
                                        <span className="inline-flex items-center gap-1 text-amber-800 font-bold shrink-0 text-[10px]">
                                          <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Staff Note:</span>
                                        </span>
                                      ) : parsed.isOutbound ? (
                                        <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold shrink-0 text-[10px]">
                                          <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                                          <span>You:</span>
                                        </span>
                                      ) : isLatest ? (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                      ) : null}
                                      <span className="truncate max-w-[200px] lg:max-w-[280px]">
                                        {parsed.text}
                                      </span>
                                    </div>
                                    <span className={`text-[10px] shrink-0 font-mono ${parsed.isInternalNote ? "text-amber-700/70" : "text-slate-400"}`}>
                                      {formatTime12(note.createdAt)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-700 line-clamp-2">
                              {lead.interestedService || "—"}
                            </div>
                          )}

                          {/* Prominent Latest Staff Note Banner (Always pinned if exists) */}
                          {lead.latestStaffNote && (
                            <div className="mt-1.5 px-2.5 py-1 bg-amber-50/95 border border-amber-300/80 rounded-md text-[11px] text-amber-950 flex items-center justify-between gap-1.5 shadow-2xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="inline-flex items-center gap-1 text-amber-800 font-bold shrink-0 text-[10px]">
                                  <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Staff Note:</span>
                                </span>
                                <span className="truncate italic font-medium">{lead.latestStaffNote.content}</span>
                              </div>
                              <span className="text-[10px] text-amber-700/80 font-mono shrink-0 ml-1">
                                {formatDate(lead.latestStaffNote.createdAt)}, {formatTime12(lead.latestStaffNote.createdAt)}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              lead.status === "NEW"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : lead.status === "CONTACTED"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : lead.status === "INTERESTED"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : lead.status === "CONVERTED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                          <div className="font-medium text-slate-700">{formatDate(lead.createdAt)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{formatTime12(lead.createdAt)}</div>
                        </td>

                        {/* 3 Dedicated Communication Icons + Chevron */}
                        <td className="py-3 px-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {telUrl ? (
                              <a
                                href={telUrl}
                                onClick={(e) => e.stopPropagation()}
                                title={`Direct Phone Call to ${lead.phone}`}
                                className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition shadow-2xs"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="p-1.5 text-slate-300 bg-slate-50 border border-slate-100 rounded-md">
                                <Phone className="w-3.5 h-3.5" />
                              </span>
                            )}

                            {waCallUrl ? (
                              <a
                                href={waCallUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title={`Call ${lead.phone} on WhatsApp`}
                                className="p-1.5 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition shadow-2xs"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="p-1.5 text-slate-300 bg-slate-50 border border-slate-100 rounded-md">
                                <PhoneCall className="w-3.5 h-3.5" />
                              </span>
                            )}

                            {waChatUrl ? (
                              <a
                                href={waChatUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title={`Chat with ${lead.phone} on WhatsApp`}
                                className="p-1.5 text-white bg-[#25D366] hover:bg-[#20bd5a] rounded-md transition shadow-2xs"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="p-1.5 text-slate-300 bg-slate-50 border border-slate-100 rounded-md">
                                <MessageCircle className="w-3.5 h-3.5" />
                              </span>
                            )}

                            <ChevronRight className="w-4 h-4 text-slate-400 ml-0.5 inline-block" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-500">
                Showing <span className="font-semibold text-slate-800">{totalLeadsCount === 0 ? 0 : (page - 1) * limit + 1}</span> to{" "}
                <span className="font-semibold text-slate-800">{Math.min(page * limit, totalLeadsCount)}</span> of{" "}
                <span className="font-bold text-slate-900">{totalLeadsCount}</span> leads
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="text-[11px] text-slate-400">Rows:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <span className="px-2 py-1 text-slate-700 font-semibold">
                    Page {page} of {Math.max(1, totalPages)}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Slide-over / Modal: Comprehensive Lead Detail Drawer */}
      {selectedLeadId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50 transition">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-600 text-sm">
                    #{detailData?.leadNumber}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    {detailData?.fullName || "Lead Details"}
                  </h2>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Captured: {detailData?.submittedAt ? formatFullDateTime12(detailData.submittedAt) : ""}
                </div>
              </div>
              <button
                onClick={() => setSelectedLeadId(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading || !detailData ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : (
              <div className="p-6 space-y-6 text-xs flex-1">
                {/* Status Switcher Bar */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">
                      Current Lead Status
                    </span>
                    <div className="mt-1">
                      <select
                        value={detailData.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="px-3 py-1.5 font-semibold text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="INTERESTED">Interested</option>
                        <option value="CONVERTED">Converted / Won</option>
                        <option value="LOST">Lost</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsSchedulingFollowUp(!isSchedulingFollowUp)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-xs cursor-pointer"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>Schedule Follow-Up</span>
                  </button>
                </div>

                {/* Follow-up inline scheduler */}
                {isSchedulingFollowUp && (
                  <form onSubmit={handleScheduleFollowUp} className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
                    <span className="font-bold text-slate-900 block">
                      Schedule Follow-up with {detailData.fullName}
                    </span>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Date & Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Follow-up Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Call to discuss payment schedule..."
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsSchedulingFollowUp(false)}
                        className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-md"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={followUpSubmitting}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-xs flex items-center gap-1"
                      >
                        {followUpSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>Confirm Schedule</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Customer Information Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500">
                      Customer Information
                    </h3>
                    {detailData.phone && (
                      <div className="flex items-center gap-1.5">
                        {getTelLink(detailData.phone) && (
                          <a
                            href={getTelLink(detailData.phone)!}
                            title="Direct Cellular Call"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md shadow-2xs transition"
                          >
                            <Phone className="w-3 h-3 text-blue-600" />
                            <span>Call</span>
                          </a>
                        )}
                        {getWhatsAppCallLink(detailData.phone) && (
                          <a
                            href={getWhatsAppCallLink(detailData.phone)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Call on WhatsApp"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md shadow-2xs transition"
                          >
                            <PhoneCall className="w-3 h-3 text-emerald-600" />
                            <span>WA Call</span>
                          </a>
                        )}
                        {getWhatsAppChatLink(detailData.phone) && (
                          <a
                            href={getWhatsAppChatLink(detailData.phone)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Chat on WhatsApp"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[#25D366] hover:bg-[#20bd5a] px-2.5 py-1 rounded-md shadow-2xs transition"
                          >
                            <MessageCircle className="w-3 h-3 text-white" />
                            <span>WA Chat</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">PHONE NUMBER</span>
                      <span className="font-semibold text-slate-900 text-sm mt-0.5 block font-mono">
                        {detailData.phone || "—"}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">EMAIL ADDRESS</span>
                      <span className="font-semibold text-slate-900 text-sm mt-0.5 block truncate">
                        {detailData.email || "—"}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 col-span-2">
                      <span className="text-slate-400 block text-[10px]">INTERESTED SERVICE / PROPERTY</span>
                      <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
                        {detailData.interestedService || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Google Form / Sheet Custom Fields */}
                {detailData.customFields && Object.keys(detailData.customFields).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dynamic Form & Sheet Column Answers ({Object.keys(detailData.customFields).length})</span>
                    </h3>
                    <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100 space-y-2.5">
                      {Object.entries(detailData.customFields).map(([key, val]) => (
                        <div
                          key={key}
                          className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-emerald-100/60 last:border-0 last:pb-0 gap-1"
                        >
                          <span className="font-medium text-slate-600 capitalize text-xs">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="font-semibold text-slate-900 text-xs">
                            {typeof val === "object" ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Original Meta Form Submission Answers (if any) */}
                {detailData.metaSubmission?.formAnswers && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {detailData.sourceType === "WHATSAPP" || detailData.platform === "whatsapp"
                          ? "WhatsApp Inbound Details"
                          : "Form Submission Answers"}
                      </span>
                    </h3>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                      {Object.entries(detailData.metaSubmission.formAnswers).map(([key, val]) => (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/60 last:border-0 last:pb-0">
                          <span className="font-medium text-slate-500 capitalize">{key.replace(/_/g, " ")}:</span>
                          <span className="font-semibold text-slate-900">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ingestion & Attribution Details */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500">
                    Source & Attribution Details
                  </h3>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Source Type:</span>
                      <span className="font-semibold text-slate-900">
                        {detailData.sourceType?.replace(/_/g, " ") || detailData.platform}
                      </span>
                    </div>
                    {detailData.ingestionSource && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ingestion Channel:</span>
                        <span className="font-semibold text-slate-900">{detailData.ingestionSource.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Platform:</span>
                      <span className="font-semibold text-slate-900 capitalize">{detailData.platform}</span>
                    </div>
                    {detailData.campaign?.name && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ad Campaign:</span>
                        <span className="font-semibold text-slate-900">{detailData.campaign.name}</span>
                      </div>
                    )}
                    {detailData.adSet?.name && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ad Set:</span>
                        <span className="font-semibold text-slate-900">{detailData.adSet.name}</span>
                      </div>
                    )}
                    {detailData.ad?.name && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ad Creative:</span>
                        <span className="font-semibold text-slate-900">{detailData.ad.name}</span>
                      </div>
                    )}
                    {detailData.leadgenId && (
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-400 font-mono text-[10px]">Meta Lead ID:</span>
                        <span className="font-mono text-[10px] text-slate-600">{detailData.leadgenId}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 1: DEDICATED INTERNAL STAFF NOTES */}
                {(() => {
                  const staffNotes = (detailData.notes || []).filter(
                    (n) => !n.content.startsWith("[Inbound") && !n.content.startsWith("[Outbound")
                  );
                  const chatMessages = (detailData.notes || []).filter(
                    (n) => n.content.startsWith("[Inbound") || n.content.startsWith("[Outbound")
                  );
                  const visibleChatMessages = showAllMessages
                    ? chatMessages
                    : chatMessages.slice(-5);

                  return (
                    <>
                      {/* Box 1: Team Staff Notes */}
                      <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                            <span>Internal Staff Notes ({staffNotes.length})</span>
                          </h3>
                          <span className="text-[10px] text-amber-700 font-medium">Visible to team only</span>
                        </div>

                        {/* Add Note Input */}
                        <form onSubmit={handleAddNote} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Write an internal remark, callback detail, or quote notes..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="submit"
                            disabled={noteSubmitting || !newNote.trim()}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            {noteSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            <span>Save Note</span>
                          </button>
                        </form>

                        {/* Staff Notes List */}
                        <div className="space-y-2 pt-1">
                          {staffNotes.length === 0 ? (
                            <div className="text-center py-3 text-[11px] text-amber-800/70 italic bg-white/70 rounded-lg border border-dashed border-amber-200">
                              No internal staff notes yet. Add follow-up remarks above.
                            </div>
                          ) : (
                            [...staffNotes].reverse().map((n) => {
                              const parsed = parseWhatsAppNote(n.content);
                              return (
                                <div
                                  key={n.id}
                                  className="p-3 rounded-lg bg-white border border-amber-200/90 shadow-2xs space-y-1"
                                >
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                                      <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Staff Note by {n.user?.name || "Team Member"}</span>
                                    </span>
                                    <span className="text-amber-800/80 font-mono">{formatDateTime12(n.createdAt)}</span>
                                  </div>
                                  <p className="text-xs font-medium text-slate-900 whitespace-pre-wrap">{parsed.text}</p>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Box 2: Customer WhatsApp Conversation Thread */}
                      <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            <span>WhatsApp Customer Conversation ({chatMessages.length})</span>
                          </h3>
                          {chatMessages.length > 5 && (
                            <button
                              type="button"
                              onClick={() => setShowAllMessages(!showAllMessages)}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                            >
                              {showAllMessages ? "Collapse to last 5" : `View earlier (${chatMessages.length - 5} older)`}
                            </button>
                          )}
                        </div>

                        {chatMessages.length === 0 ? (
                          <div className="text-center py-6 text-[11px] text-slate-400 italic bg-white rounded-lg border border-dashed border-slate-200">
                            No WhatsApp messages recorded for this contact.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {visibleChatMessages.map((n, idx, arr) => {
                              const isLatest = idx === arr.length - 1;
                              const parsed = parseWhatsAppNote(n.content);

                              return (
                                <div
                                  key={n.id}
                                  className={`p-3 rounded-xl text-xs border ${
                                    parsed.isOutbound
                                      ? "bg-blue-50/90 border-blue-200 ml-6"
                                      : isLatest
                                      ? "bg-emerald-50/90 border-emerald-300 mr-6 shadow-2xs"
                                      : "bg-white border-slate-200 mr-6"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                                    <span
                                      className={`font-semibold flex items-center gap-1.5 ${
                                        parsed.isOutbound ? "text-blue-800" : "text-emerald-800"
                                      }`}
                                    >
                                      {parsed.isOutbound ? (
                                        <>
                                          <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                                          <span>You (WhatsApp Outbound)</span>
                                        </>
                                      ) : (
                                        <>
                                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                                          <span>WhatsApp Inbound</span>
                                          {isLatest && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-200 text-emerald-900 uppercase">
                                              Latest
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </span>
                                    <span className="font-mono text-slate-500">{formatDateTime12(n.createdAt)}</span>
                                  </div>
                                  <p className={`font-medium ${parsed.isOutbound ? "text-blue-950" : "text-slate-900"}`}>
                                    {parsed.text}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Status Transition History Timeline */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Status History Timeline</span>
                  </h3>
                  <div className="space-y-2 border-l-2 border-slate-200 pl-3">
                    {detailData.statusHistories.map((h) => (
                      <div key={h.id} className="text-xs text-slate-600">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{h.previousStatus} &rarr; {h.newStatus}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {h.reason && `${h.reason} • `}{formatDateTime12(h.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Universal Action Confirmation Dialog */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        options={confirmOptions}
      />
    </div>
  );
}
