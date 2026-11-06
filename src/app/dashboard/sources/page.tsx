"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Plus,
  Copy,
  Check,
  Share2,
  Code2,
  Trash2,
  CheckCircle2,
  X,
  Loader2,
  HelpCircle,
  Play,
  Layers,
  Sparkles,
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

export default function ClientSourcesPage() {
  const [sources, setSources] = useState<IngestionSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedScriptSource, setSelectedScriptSource] = useState<IngestionSourceItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<"GOOGLE_FORM" | "GOOGLE_SHEET" | "WHATSAPP">("GOOGLE_FORM");
  const [sheetUrl, setSheetUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const loadSources = async () => {
    try {
      const res = await fetch("/api/client/sources");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load sources");
        return;
      }
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
      const res = await fetch("/api/client/sources", {
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

  const handleDeleteSource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ingestion source?")) return;
    try {
      const res = await fetch(`/api/client/sources/${id}`, { method: "DELETE" });
      if (res.ok) loadSources();
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSimulateLead = async (source: IngestionSourceItem) => {
    setSimulatingId(source.id);
    try {
      const sampleRow = {
        "Full Name": "Test Lead " + Math.floor(Math.random() * 900 + 100),
        "WhatsApp Contact": "+92 300 " + Math.floor(Math.random() * 9000000 + 1000000),
        "Email Address": `inquiry_${Date.now()}@example.com`,
        "Service Required": "3 Bed Luxury Apartment",
        "Estimated Budget": "2.8 Crore",
        "Preferred City": "Karachi",
        "Custom Remark": "Submitted via 1-click test simulation",
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
        alert("✅ Test lead successfully captured! Open the Leads tab to view it.");
        loadSources();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulatingId(null);
    }
  };

  if (error) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 mt-10">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Google Sheets CRM Disabled</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Lead Sources & Ingestion Setup</h1>
          <p className="text-sm text-slate-500">
            Connect unlimited Google Forms, Google Sheets, or WhatsApp lines. Dynamic column matcher automatically detects your questions without code changes.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Google Sheet / Form</span>
        </button>
      </div>

      {/* Info Callout */}
      <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl text-xs text-purple-950 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Zero Code Maintenance Guarantee:</span>
          <p className="mt-0.5 text-purple-800">
            Whenever you add a new question to your Google Form or a new column to your Google Sheet, our Smart Column Matching Engine automatically detects it and captures the responses into CRM Custom Fields.
          </p>
        </div>
      </div>

      {/* Sources List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : sources.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No active ingestion sources found. Click "Connect New Google Sheet / Form" to get your copy-paste script.
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
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Key: {s.secretKey.slice(0, 8)}••••••••
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>{s.type.replace(/_/g, " ")}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {s.detectedHeaders.length === 0 ? (
                        <span className="text-slate-400 italic">Waiting for 1st submission</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {s.detectedHeaders.slice(0, 4).map((h, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[120px]">
                              {h}
                            </span>
                          ))}
                          {s.detectedHeaders.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800 font-semibold">
                              +{s.detectedHeaders.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {s._count.leads}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {s.lastReceivedAt
                        ? formatDateTime12(s.lastReceivedAt)
                        : "Never"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSimulateLead(s)}
                          disabled={simulatingId === s.id}
                          title="Send Test Lead"
                          className="px-2 py-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          {simulatingId === s.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          <span>Test</span>
                        </button>

                        <button
                          onClick={() => setSelectedScriptSource(s)}
                          className="px-2.5 py-1 text-[11px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <Code2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Apps Script</span>
                        </button>

                        <button
                          onClick={() => handleDeleteSource(s.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal: Create New Source */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Connect Ingestion Source</h2>
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
                  placeholder="e.g. Website Google Form or Sales WhatsApp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="GOOGLE_FORM">Google Form (Responses Sheet)</option>
                  <option value="GOOGLE_SHEET">Google Sheet (Direct Spreadsheet)</option>
                  <option value="WHATSAPP">WhatsApp Inbound Hotline</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Sheet URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
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
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate Script & Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Google Apps Script Viewer */}
      {selectedScriptSource && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Google Apps Script for: {selectedScriptSource.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Copy and paste this into your Google Sheet to start receiving leads automatically!
                </p>
              </div>
              <button
                onClick={() => setSelectedScriptSource(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 space-y-1">
                <span className="font-bold">How to install in 30 seconds:</span>
                <ol className="list-decimal list-inside pl-1 space-y-0.5 text-blue-800">
                  <li>Open your Google Sheet &gt; Click <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Delete any existing code and <strong>Paste</strong> the code below.</li>
                  <li>Click <strong>Triggers</strong> (alarm clock on left) &gt; <strong>Add Trigger</strong> &gt; Select Event type: <strong>On form submit</strong> (or On change) &gt; Save.</li>
                </ol>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-lg text-xs font-mono max-h-80 overflow-y-auto whitespace-pre-wrap">
                  {selectedScriptSource.appsScriptCode}
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedScriptSource.appsScriptCode);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2000);
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-xs flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? "Copied Script!" : "Copy Script"}</span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedScriptSource(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
