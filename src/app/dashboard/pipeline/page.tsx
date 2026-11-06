"use client";

import { useEffect, useState } from "react";
import {
  KanbanSquare,
  Search,
  Share2,
  Clock,
  Phone,
  RefreshCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { ConfirmModal, ConfirmDialogOptions } from "@/components/common/ConfirmModal";

interface PipelineLead {
  id: string;
  leadNumber: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  interestedService: string | null;
  platform: string;
  status: "NEW" | "CONTACTED" | "INTERESTED" | "CONVERTED" | "LOST";
  createdAt: string;
  campaign?: { name: string } | null;
}

const STAGES: Array<{ id: "NEW" | "CONTACTED" | "INTERESTED" | "CONVERTED" | "LOST"; name: string; color: string; bg: string }> = [
  { id: "NEW", name: "New Leads", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  { id: "CONTACTED", name: "Contacted", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  { id: "INTERESTED", name: "Interested", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  { id: "CONVERTED", name: "Converted / Won", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  { id: "LOST", name: "Lost", color: "text-slate-700", bg: "bg-slate-100 border-slate-200" },
];

export default function PipelinePage() {
  const [columns, setColumns] = useState<Record<string, PipelineLead[]>>({
    NEW: [],
    CONTACTED: [],
    INTERESTED: [],
    CONVERTED: [],
    LOST: [],
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [activeMobileStage, setActiveMobileStage] = useState<string>("NEW");

  // Kanban Stage Pagination State
  const [stagePages, setStagePages] = useState<Record<string, number>>({
    NEW: 1,
    CONTACTED: 1,
    INTERESTED: 1,
    CONVERTED: 1,
    LOST: 1,
  });
  const [cardsPerPage, setCardsPerPage] = useState<number>(5);

  // Universal Confirmation Dialog State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmDialogOptions | null>(null);

  const requestConfirm = (opts: ConfirmDialogOptions) => {
    setConfirmOptions(opts);
    setIsConfirmOpen(true);
  };

  const loadPipeline = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch("/api/client/pipeline");
      const json = await res.json();
      setColumns(json.columns || {});
    } catch (e) {
      console.error(e);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
    const interval = setInterval(() => {
      // Don't auto-poll if user is currently dragging a card or modal is open
      if (!draggingLeadId && !isConfirmOpen) {
        loadPipeline(true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [draggingLeadId, isConfirmOpen]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
    setDraggingLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const executeTransition = async (leadId: string, targetStage: string) => {
    // Optimistically update columns
    let movedLead: PipelineLead | null = null;
    const newCols: Record<string, PipelineLead[]> = {};

    for (const [colKey, items] of Object.entries(columns)) {
      newCols[colKey] = items.filter((item) => {
        if (item.id === leadId) {
          movedLead = { ...item, status: targetStage as any };
          return false;
        }
        return true;
      });
    }

    if (movedLead) {
      newCols[targetStage] = [movedLead, ...(newCols[targetStage] || [])];
      setColumns(newCols);
    }

    // Call API in background without blocking or re-fetching columns
    try {
      const res = await fetch("/api/client/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, newStatus: targetStage }),
      });
      if (!res.ok) {
        throw new Error("Failed to update status on server");
      }
    } catch (err) {
      console.error("Pipeline transition error:", err);
      // Revert on error
      loadPipeline();
    }
  };

  const findLeadById = (leadId: string): PipelineLead | null => {
    for (const items of Object.values(columns)) {
      const match = items.find((l) => l.id === leadId);
      if (match) return match;
    }
    return null;
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain") || draggingLeadId;
    setDraggingLeadId(null);
    if (!leadId) return;

    const lead = findLeadById(leadId);
    if (!lead || lead.status === targetStage) return;

    if (targetStage === "LOST") {
      requestConfirm({
        title: "Mark Lead as Lost?",
        message: `Are you sure you want to mark #${lead.leadNumber} (${lead.fullName}) as Lost? This lead will be moved to the Lost stage.`,
        variant: "danger",
        confirmText: "Yes, Mark Lost",
        onConfirm: async () => {
          await executeTransition(leadId, targetStage);
        },
      });
      return;
    }

    if (targetStage === "CONVERTED") {
      requestConfirm({
        title: "Convert Deal / Won?",
        message: `Are you sure you want to mark #${lead.leadNumber} (${lead.fullName}) as Converted / Won? Great job closing this deal!`,
        variant: "success",
        confirmText: "Yes, Mark Converted",
        onConfirm: async () => {
          await executeTransition(leadId, targetStage);
        },
      });
      return;
    }

    await executeTransition(leadId, targetStage);
  };

  const handleSelectStatus = async (leadId: string, targetStage: string) => {
    const lead = findLeadById(leadId);
    if (!lead || lead.status === targetStage) return;

    if (targetStage === "LOST") {
      requestConfirm({
        title: "Mark Lead as Lost?",
        message: `Are you sure you want to mark #${lead.leadNumber} (${lead.fullName}) as Lost? This lead will be moved to the Lost stage.`,
        variant: "danger",
        confirmText: "Yes, Mark Lost",
        onConfirm: async () => {
          await executeTransition(leadId, targetStage);
        },
      });
      return;
    }

    if (targetStage === "CONVERTED") {
      requestConfirm({
        title: "Convert Deal / Won?",
        message: `Are you sure you want to mark #${lead.leadNumber} (${lead.fullName}) as Converted / Won? Great job closing this deal!`,
        variant: "success",
        confirmText: "Yes, Mark Converted",
        onConfirm: async () => {
          await executeTransition(leadId, targetStage);
        },
      });
      return;
    }

    await executeTransition(leadId, targetStage);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales Pipeline Kanban</h1>
          <p className="text-xs text-slate-500">
            Drag and drop customer cards between lifecycle stages or update statuses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
            <span className="text-[11px] font-medium text-slate-500">Per page:</span>
            <select
              value={cardsPerPage}
              onChange={(e) => {
                setCardsPerPage(Number(e.target.value));
                setStagePages({ NEW: 1, CONTACTED: 1, INTERESTED: 1, CONVERTED: 1, LOST: 1 });
              }}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value={5}>5 cards</option>
              <option value={8}>8 cards</option>
              <option value={15}>15 cards</option>
              <option value={50}>All (50)</option>
            </select>
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative w-full sm:w-60"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter cards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </form>

          <button
            onClick={() => loadPipeline(false)}
            className="p-1.5 text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs cursor-pointer shrink-0"
            title="Refresh Pipeline"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Stage Selector Tabs (md:hidden) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
        {STAGES.map((s) => {
          const count = (columns[s.id] || []).length;
          const isActive = activeMobileStage === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveMobileStage(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              <span>{s.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Board Container - ZERO HORIZONTAL SCROLL FIT */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2.5 min-h-0 pb-2">
          {STAGES.map((stage) => {
            const allStageItems = (columns[stage.id] || []).filter(
              (item) =>
                item.fullName.toLowerCase().includes(search.toLowerCase()) ||
                (item.phone && item.phone.includes(search)) ||
                (item.interestedService && item.interestedService.toLowerCase().includes(search.toLowerCase()))
            );

            const totalStageCount = allStageItems.length;
            const totalPages = Math.max(1, Math.ceil(totalStageCount / cardsPerPage));
            const currentPage = Math.min(stagePages[stage.id] || 1, totalPages);
            const startIndex = (currentPage - 1) * cardsPerPage;
            const items = allStageItems.slice(startIndex, startIndex + cardsPerPage);

            // Hide inactive columns on mobile, show all 5 on desktop (md:flex)
            const isVisibleOnMobile = activeMobileStage === stage.id;

            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className={`bg-slate-100/70 border border-slate-200/80 rounded-xl flex-col min-w-0 max-h-full ${
                  isVisibleOnMobile ? "flex" : "hidden md:flex"
                }`}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-xl shrink-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-xs text-slate-900 truncate">{stage.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${stage.bg} ${stage.color}`}>
                    {totalStageCount}
                  </span>
                </div>

                {/* Cards Column */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[11px] text-slate-400">
                      Drop lead here
                    </div>
                  ) : (
                    items.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className={`bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:shadow-md transition cursor-grab active:cursor-grabbing text-xs space-y-1.5 ${
                          draggingLeadId === lead.id ? "opacity-40" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-600 text-[11px]">
                            #{lead.leadNumber}
                          </span>
                          <span className="capitalize text-[10px] text-slate-400 flex items-center gap-1">
                            <Share2 className="w-3 h-3 text-blue-500" />
                            {lead.platform}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 truncate">{lead.fullName}</div>

                        {lead.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono truncate">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{lead.phone}</span>
                          </div>
                        )}

                        {lead.interestedService && (
                          <div className="p-1 bg-slate-50 rounded text-[11px] text-slate-700 truncate border border-slate-100">
                            {lead.interestedService}
                          </div>
                        )}

                        {/* Accessible stage switcher */}
                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                          <select
                            value={lead.status}
                            onChange={(e) => handleSelectStatus(lead.id, e.target.value)}
                            className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-semibold focus:outline-none cursor-pointer"
                          >
                            <option value="NEW">New</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="INTERESTED">Interested</option>
                            <option value="CONVERTED">Converted</option>
                            <option value="LOST">Lost</option>
                          </select>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {formatDate(lead.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Column Pagination Footer */}
                <div className="px-2.5 py-1.5 border-t border-slate-200 bg-white rounded-b-xl flex items-center justify-between text-[11px] text-slate-500 shrink-0">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setStagePages((prev) => ({
                        ...prev,
                        [stage.id]: Math.max(1, currentPage - 1),
                      }))
                    }
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <span className="font-semibold text-slate-700 text-[10px]">
                    {totalStageCount === 0 ? "0 / 0" : `${currentPage} of ${totalPages} (${totalStageCount})`}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setStagePages((prev) => ({
                        ...prev,
                        [stage.id]: Math.min(totalPages, currentPage + 1),
                      }))
                    }
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                </div>
              </div>
            );
          })}
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
