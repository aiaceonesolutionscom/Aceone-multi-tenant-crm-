"use client";

import { useEffect, useState } from "react";
import {
  Webhook,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Code2,
  X,
  Play,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { formatDateTime12 } from "@/lib/date-utils";

interface WebhookLog {
  id: string;
  metaPageId: string | null;
  leadgenId: string | null;
  eventPayload: any;
  signatureValid: boolean;
  processed: boolean;
  errorMessage: string | null;
  receivedAt: string;
}

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulateResult, setSimulateResult] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/admin/webhooks");
      const json = await res.json();
      setLogs(json.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleSimulateWebhook = async () => {
    setSimulating(true);
    setSimulateResult(null);

    const testLeadgenId = "test_lead_" + Date.now();
    const mockPayload = {
      object: "page",
      entry: [
        {
          id: "page_1099887766",
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: "leadgen",
              value: {
                leadgen_id: testLeadgenId,
                page_id: "page_1099887766",
                form_id: "form_5544332211",
                ad_id: "ad_99001122",
                created_time: Math.floor(Date.now() / 1000),
                field_data: [
                  { name: "full_name", values: ["Shahbaz Ahmed (Test Lead)"] },
                  { name: "phone_number", values: ["+92 301 9988776"] },
                  { name: "email", values: ["shahbaz.test@gmail.com"] },
                  { name: "interested_service", values: ["500 Sq Yards Luxury Villa"] },
                ],
              },
            },
          ],
        },
      ],
    };

    try {
      const res = await fetch("/api/webhooks/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockPayload),
      });

      const json = await res.json();
      if (res.ok) {
        setSimulateResult(`Lead successfully ingested! ID: ${testLeadgenId}`);
        loadLogs();
      } else {
        setSimulateResult(`Failed: ${json.error}`);
      }
    } catch (e: unknown) {
      setSimulateResult(e instanceof Error ? e.message : "Simulation error");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Meta Webhook Event Logs</h1>
          <p className="text-sm text-slate-500">
            Real-time payload inspection, X-Hub-Signature-256 HMAC verification, and ingestion history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateWebhook}
            disabled={simulating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {simulating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Simulate Real Lead Webhook</span>
          </button>

          <button
            onClick={loadLogs}
            className="p-2 text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {simulateResult && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{simulateResult}</span>
        </div>
      )}

      {/* Webhook Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No webhook events recorded yet. Click "Simulate Real Lead Webhook" above to test the ingestion pipeline!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Meta Lead ID (leadgen_id)</th>
                  <th className="py-3 px-4">Page ID</th>
                  <th className="py-3 px-4">HMAC Signature</th>
                  <th className="py-3 px-4">Ingestion Outcome</th>
                  <th className="py-3 px-4">Received Time</th>
                  <th className="py-3 px-4 text-right">Raw Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {log.leadgenId || "N/A"}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600">
                      {log.metaPageId || "N/A"}
                    </td>

                    <td className="py-3 px-4">
                      {log.signatureValid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Valid (SHA-256)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Invalid Signature</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {log.processed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Successfully Processed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {log.errorMessage || "Failed"}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {formatDateTime12(log.receivedAt)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedPayload(log.eventPayload)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition font-medium"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>JSON</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: JSON Payload Viewer */}
      {selectedPayload && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Webhook Raw Event Payload</h2>
              <button
                onClick={() => setSelectedPayload(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <pre className="p-4 bg-slate-900 text-emerald-400 rounded-lg text-xs font-mono max-h-96 overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(selectedPayload, null, 2)}
              </pre>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
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
