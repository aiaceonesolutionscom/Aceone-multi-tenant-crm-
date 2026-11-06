"use client";

import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Plus,
  Copy,
  Check,
  Code2,
  Trash2,
  X,
  Loader2,
  Play,
  Sparkles,
  Building2,
} from "lucide-react";
import { formatDateTime12 } from "@/lib/date-utils";

interface IngestionSourceItem {
  id: string;
  name: string;
  type: "GOOGLE_FORM" | "GOOGLE_SHEET" | "WHATSAPP" | "CUSTOM_WEBHOOK";
  secretKey: string;
  sheetUrl: string | null;
  detectedHeaders: string[];
  isActive: boolean;
  lastReceivedAt: string | null;
  webhookUrl: string;
  appsScriptCode: string;
  _count: { leads: number };
}

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<IngestionSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedScriptSource, setSelectedScriptSource] = useState<IngestionSourceItem | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<"GOOGLE_FORM" | "GOOGLE_SHEET" | "WHATSAPP">("GOOGLE_FORM");
  const [sheetUrl, setSheetUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const loadSources = async () => {
    try {
      const res = await fetch("/api/admin/sources");
      const json = await res.json();
      setSources(json.sources || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, sheetUrl }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setName("");
        setSheetUrl("");
        loadSources();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateLead = async (source: IngestionSourceItem) => {
    setSimulatingId(source.id);
    try {
      const sampleRow = {
        "Client Full Name": "Corporate Client " + Math.floor(Math.random() * 900 + 100),
        "WhatsApp Contact": "+92 321 " + Math.floor(Math.random() * 9000000 + 1000000),
        "Corporate Email": `agency_lead_${Date.now()}@corporate.pk`,
        "Service Required": "Meta Ads & WhatsApp CRM Integration",
        "Estimated Ad Budget": "$2,500/month",
        "Company Name": "Apex Retail Group",
        "Inquiry Message": "Need complete CRM setup for our sales team.",
      };

      const res = await fetch("/api/webhooks/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secretKey: source.secretKey,
          row: sampleRow,
        }),
      });

      if (res.ok) {
        alert("✅ AceOne Agency test lead successfully captured! Open AceOne Agency CRM to view it.");
        loadSources();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulatingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">
              AceOne Internal Agency
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Agency Lead Sources (Google Forms & WhatsApp)
          </h1>
          <p className="text-sm text-slate-500">
            Connect AceOne's website contact forms, Google Sheets, or sales WhatsApp line. Leads flow directly into AceOne Agency CRM.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Agency Lead Source</span>
        </button>
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
          </div>
        ) : sources.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No agency lead sources found. Click "New Agency Lead Source" to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Source Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Auto-Detected Columns</th>
                  <th className="py-3 px-4">Leads Captured</th>
                  <th className="py-3 px-4">Last Ingestion</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sources.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{s.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Key: {s.secretKey.slice(0, 8)}••••••••
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>{s.type.replace(/_/g, " ")}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {s.detectedHeaders.length === 0 ? (
                        <span className="text-slate-400 italic">Waiting for submissions</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {s.detectedHeaders.slice(0, 4).map((h, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                              {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                        {s._count.leads} Leads
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {s.lastReceivedAt ? formatDateTime12(s.lastReceivedAt) : "Never"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSimulateLead(s)}
                          disabled={simulatingId === s.id}
                          className="px-2 py-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Simulate Lead</span>
                        </button>

                        <button
                          onClick={() => setSelectedScriptSource(s)}
                          className="px-2.5 py-1 text-[11px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <Code2 className="w-3.5 h-3.5 text-purple-600" />
                          <span>Get Apps Script</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Source */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Add Agency Lead Source</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSource} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AceOne Landing Page Form"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                >
                  <option value="GOOGLE_FORM">Google Form (Responses)</option>
                  <option value="GOOGLE_SHEET">Google Sheet (Direct Rows)</option>
                  <option value="WHATSAPP">WhatsApp Business Line</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Source</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Apps Script */}
      {selectedScriptSource && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Google Apps Script: {selectedScriptSource.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Copy and paste into AceOne's Google Sheet (`Extensions &gt; Apps Script`).
                </p>
              </div>
              <button onClick={() => setSelectedScriptSource(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 relative">
              <pre className="p-4 bg-slate-900 text-emerald-400 rounded-lg text-xs font-mono max-h-80 overflow-y-auto whitespace-pre-wrap">
                {selectedScriptSource.appsScriptCode}
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedScriptSource.appsScriptCode);
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 2000);
                }}
                className="absolute top-3 right-3 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded shadow-xs flex items-center gap-1.5 cursor-pointer text-xs"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? "Copied!" : "Copy Apps Script"}</span>
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedScriptSource(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
