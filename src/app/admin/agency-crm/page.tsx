"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Share2,
  FileSpreadsheet,
  Phone,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Plus,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Send,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/date-utils";

interface AgencyCRMData {
  internalTenant: { id: string; name: string };
  metrics: {
    totalLeads: number;
    newLeads: number;
    contactedLeads: number;
    interestedLeads: number;
    convertedLeads: number;
    lostLeads: number;
    whatsappLeads: number;
    googleFormLeads: number;
    conversionRate: string;
  };
  recentLeads: Array<{
    id: string;
    leadNumber: number;
    fullName: string;
    phone: string | null;
    email: string | null;
    interestedService: string | null;
    platform: string;
    status: string;
    customFields: any;
    createdAt: string;
    ingestionSource?: { name: string; type: string } | null;
  }>;
  sources: Array<{
    id: string;
    name: string;
    type: string;
    _count: { leads: number };
  }>;
}

export default function AceOneAgencyCRMPage() {
  const [data, setData] = useState<AgencyCRMData | null>(null);
  const [loading, setLoading] = useState(true);

  // Inquiries Filtering
  const [channelFilter, setChannelFilter] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");

  // Quick WhatsApp Inquiry Simulator
  const [waPhone, setWaPhone] = useState("+92 300 ");
  const [waName, setWaName] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waSubmitting, setWaSubmitting] = useState(false);
  const [waSuccess, setWaSuccess] = useState<string | null>(null);

  const loadAgencyData = async () => {
    try {
      const res = await fetch("/api/admin/agency-crm");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgencyData();
  }, []);

  const handleSimulateWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waPhone.trim() || !waMessage.trim()) return;

    setWaSubmitting(true);
    setWaSuccess(null);
    try {
      const res = await fetch("/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: waPhone.trim(),
          name: waName.trim() || "Website Visitor",
          message: waMessage.trim(),
        }),
      });

      if (res.ok) {
        setWaSuccess("WhatsApp customer inquiry captured instantly into AceOne CRM!");
        setWaName("");
        setWaMessage("");
        loadAgencyData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWaSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
      </div>
    );
  }

  const m = data?.metrics;

  const filteredLeads = (data?.recentLeads || []).filter((lead) => {
    if (channelFilter === "whatsapp" && lead.platform !== "whatsapp") return false;
    if (
      channelFilter === "google_sheets" &&
      lead.platform !== "google_forms" &&
      lead.platform !== "google_sheets"
    )
      return false;
    if (selectedSourceId && lead.ingestionSource?.name !== selectedSourceId) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">
              AceOne Internal Workspace
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            AceOne Agency Sales CRM
          </h1>
          <p className="text-sm text-slate-500">
            Dedicated workspace for AceOne Solutions: track inbound WhatsApp hotline inquiries, website Google Forms, and client acquisition pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg border border-slate-200 cursor-not-allowed select-none"
            title="Google Sheets & Forms integration is scheduled for a future release."
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            <span>Google Sheets (Coming Soon)</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Agency Inquiries</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{m?.totalLeads || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Total inquiries</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-600 uppercase">New Inbound</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{m?.newLeads || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pending callback</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 uppercase">In Discussion</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{m?.contactedLeads || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Proposal sent</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-600 uppercase">High Intent</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">{m?.interestedLeads || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Ready for contract</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase">Converted Clients</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{m?.convertedLeads || 0}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">{m?.conversionRate}% closed</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase">WhatsApp Leads</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{m?.whatsappLeads || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Via WhatsApp line</div>
        </div>
      </div>

      {/* Main Grid: Recent Inquiries + WhatsApp Quick Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Inbound Leads (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">AceOne Inbound Leads & Inquiries</h2>
              <p className="text-xs text-slate-500">Live inquiries from WhatsApp & Google Forms</p>
            </div>

            {/* Inquiries Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value);
                  setSelectedSourceId("");
                }}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-900 bg-slate-50 font-medium focus:ring-2 focus:ring-purple-600"
              >
                <option value="">All Channels</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="google_sheets">📊 Google Forms & Sheets</option>
              </select>

              {channelFilter === "google_sheets" && (
                <select
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  className="px-2.5 py-1 text-xs border-2 border-emerald-500 rounded-lg text-slate-900 bg-emerald-50/70 font-semibold focus:ring-2 focus:ring-emerald-600 max-w-[180px] truncate"
                >
                  <option value="">📁 All Google Forms</option>
                  {(data?.sources || [])
                    .filter((s) => s.type === "GOOGLE_FORM" || s.type === "GOOGLE_SHEET")
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </select>
              )}

              <button onClick={loadAgencyData} className="p-1.5 text-slate-500 hover:bg-slate-50 rounded border border-slate-200">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredLeads.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                No inquiries received matching this filter.
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      #{lead.leadNumber}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>{lead.fullName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                          lead.platform === "whatsapp"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {lead.platform.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-slate-500 mt-0.5 flex items-center gap-2 text-[11px]">
                        <span>{lead.phone || "No phone"}</span>
                        {lead.phone && (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200"
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        <span>•</span>
                        <span className="text-slate-700 font-medium">{lead.interestedService || "General Inquiry"}</span>
                      </div>

                      {/* Dynamic Custom Fields Pill */}
                      {lead.customFields && Object.keys(lead.customFields).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {Object.entries(lead.customFields).map(([k, v]) => (
                            <span key={k} className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                              <strong>{k}:</strong> {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      lead.status === "NEW"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : lead.status === "CONTACTED"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : lead.status === "INTERESTED"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                      {lead.status}
                    </span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline-block">
                      {formatDate(lead.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: WhatsApp Inbound Simulator & Active Sources */}
        <div className="space-y-6">
          {/* Quick WhatsApp Inquiry Simulator */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Simulate WhatsApp Inquiry</h2>
            </div>
            <p className="text-[11px] text-slate-500">
              Test how customer messages from WhatsApp land directly into AceOne CRM.
            </p>

            {waSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                {waSuccess}
              </div>
            )}

            <form onSubmit={handleSimulateWhatsApp} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Customer Phone</label>
                <input
                  type="text"
                  required
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Sender Name</label>
                <input
                  type="text"
                  placeholder="e.g. Usman Tariq"
                  value={waName}
                  onChange={(e) => setWaName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Inquiry Message</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Hi AceOne, I need Meta Lead Ads & CRM for our real estate business."
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={waSubmitting}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {waSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send WhatsApp Inquiry</span>
              </button>
            </form>
          </div>

          {/* Connected Agency Sources */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3">AceOne Lead Channels</h2>
            <div className="space-y-2 text-xs">
              {data?.sources.map((s) => (
                <div key={s.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                    <span className="font-semibold text-slate-800">{s.name}</span>
                  </div>
                  <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[11px]">
                    {s._count.leads} Leads
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/admin/sources"
              className="mt-3 block text-center text-xs font-semibold text-purple-600 hover:underline"
            >
              Manage Agency Sources →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
