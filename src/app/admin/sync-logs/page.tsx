"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { formatFullDateTime12 } from "@/lib/date-utils";

interface SyncLog {
  id: string;
  portfolioId: string | null;
  syncType: string;
  status: string;
  details: any;
  durationMs: number | null;
  createdAt: string;
}

export default function SyncLogsPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/admin/sync-logs");
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Integration Synchronization Logs</h1>
          <p className="text-sm text-slate-500">
            Audit history of portfolio asset discovery, permission validations, and lead sync runs.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="p-2 text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No synchronization jobs logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Sync Operation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Executed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {log.syncType}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.status === "SUCCESS" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>{log.status}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {log.durationMs ? `${log.durationMs}ms` : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {formatFullDateTime12(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
