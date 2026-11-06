"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Plus,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { formatTime12, formatDate } from "@/lib/date-utils";
import { ConfirmModal, ConfirmDialogOptions } from "@/components/common/ConfirmModal";

interface FollowUpItem {
  id: string;
  scheduledAt: string;
  notes: string | null;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "OVERDUE";
  completedAt: string | null;
  lead: {
    id: string;
    leadNumber: number;
    fullName: string;
    phone: string | null;
    email: string | null;
    interestedService: string | null;
  };
}

interface LeadOption {
  id: string;
  leadNumber: number;
  fullName: string;
  phone: string | null;
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Universal Confirmation Dialog State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmDialogOptions | null>(null);

  const requestConfirm = (opts: ConfirmDialogOptions) => {
    setConfirmOptions(opts);
    setIsConfirmOpen(true);
  };

  const loadFollowUps = async () => {
    try {
      const res = await fetch(`/api/client/follow-ups?filter=${filter}`);
      const json = await res.json();
      setFollowUps(json.followUps || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, [filter]);

  const openScheduleModal = async () => {
    setIsModalOpen(true);
    try {
      const res = await fetch("/api/client/leads?limit=50");
      const json = await res.json();
      setLeadOptions(json.leads || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !scheduledAt) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/client/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLeadId,
          scheduledAt: new Date(scheduledAt).toISOString(),
          notes,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setSelectedLeadId("");
        setScheduledAt("");
        setNotes("");
        loadFollowUps();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const executeStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/client/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        loadFollowUps();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusUpdate = (id: string, status: string, leadName?: string) => {
    if (status === "COMPLETED") {
      requestConfirm({
        title: "Complete Follow-up?",
        message: `Are you sure you have completed this follow-up call/action with ${leadName || "the customer"}?`,
        variant: "success",
        confirmText: "Yes, Mark Completed",
        onConfirm: () => executeStatusUpdate(id, status),
      });
      return;
    }

    if (status === "CANCELLED") {
      requestConfirm({
        title: "Cancel Follow-up?",
        message: `Are you sure you want to cancel this scheduled follow-up with ${leadName || "the customer"}?`,
        variant: "danger",
        confirmText: "Yes, Cancel Follow-up",
        onConfirm: () => executeStatusUpdate(id, status),
      });
      return;
    }

    if (status === "PENDING") {
      requestConfirm({
        title: "Reopen Follow-up?",
        message: `Reopen this follow-up with ${leadName || "the customer"} back to Pending status?`,
        variant: "default",
        confirmText: "Yes, Reopen",
        onConfirm: () => executeStatusUpdate(id, status),
      });
      return;
    }

    executeStatusUpdate(id, status);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Follow-up Management</h1>
          <p className="text-sm text-slate-500">
            Schedule sales reminders, manage callbacks, and track customer contact history.
          </p>
        </div>

        <button
          onClick={openScheduleModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Follow-up</span>
        </button>
      </div>

      {/* Filter Tabs (Horizontal scroll on small screens with no scrollbar overflow) */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs overflow-x-auto no-scrollbar pb-0.5">
        {[
          { id: "all", name: "All Follow-ups" },
          { id: "today", name: "Today" },
          { id: "upcoming", name: "Upcoming" },
          { id: "overdue", name: "Overdue" },
          { id: "completed", name: "Completed" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`pb-3 px-3 font-semibold transition border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
              filter === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Follow-ups List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : followUps.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No follow-ups found under this tab.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {followUps.map((item) => (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0"
              >
                {/* Left: Icon & Lead Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    <CalendarClock className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {item.lead.fullName}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-blue-600 shrink-0">
                        #{item.lead.leadNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 mt-0.5 text-[11px] flex-wrap">
                      {item.lead.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{item.lead.phone}</span>
                        </span>
                      )}
                      {item.lead.interestedService && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="truncate max-w-[200px]">{item.lead.interestedService}</span>
                        </>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-slate-700 bg-slate-50 border border-slate-200/80 rounded-md px-2.5 py-1 mt-1.5 text-[11px] max-w-xl">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Date/Time + Action Buttons (Fully responsive, never cut off) */}
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right shrink-0">
                    <div className="font-semibold text-slate-900 flex items-center gap-1 sm:justify-end text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(item.scheduledAt)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {formatTime12(item.scheduledAt)}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(item.id, "COMPLETED", item.lead.fullName)}
                          title="Mark as Completed"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete</span>
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(item.id, "CANCELLED", item.lead.fullName)}
                          title="Cancel Follow-up"
                          className="inline-flex items-center gap-1 px-2 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-semibold shadow-2xs active:scale-95 transition cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>Cancel</span>
                        </button>
                      </>
                    )}

                    {item.status === "COMPLETED" && (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Completed</span>
                        </span>
                        <button
                          onClick={() => handleStatusUpdate(item.id, "PENDING", item.lead.fullName)}
                          title="Marked by mistake? Reopen back to Pending"
                          className="inline-flex items-center gap-1 px-2 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Reopen</span>
                        </button>
                      </>
                    )}

                    {item.status === "CANCELLED" && (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          <span>Cancelled</span>
                        </span>
                        <button
                          onClick={() => handleStatusUpdate(item.id, "PENDING", item.lead.fullName)}
                          title="Cancelled by accident? Reopen back to Pending"
                          className="inline-flex items-center gap-1 px-2 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Reopen</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Schedule Follow-Up */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Schedule Lead Follow-Up</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Customer *</label>
                <select
                  required
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="">-- Choose Lead --</option>
                  {leadOptions.map((l) => (
                    <option key={l.id} value={l.id}>
                      #{l.leadNumber} - {l.fullName} ({l.phone || "No phone"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Follow-up Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Inquire about preferred project layout & share price quote..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Follow-up</span>
                </button>
              </div>
            </form>
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
