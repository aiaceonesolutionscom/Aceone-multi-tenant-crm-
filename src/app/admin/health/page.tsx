"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Info,
  ShieldCheck,
  Building2,
  Layers,
  Share2,
} from "lucide-react";

interface HealthCheckItem {
  id: string;
  name: string;
  type: "BUSINESS_PORTFOLIO" | "AD_ACCOUNT" | "FACEBOOK_PAGE" | "META_TOKEN" | "WEBHOOK";
  portfolioName?: string;
  status: "VERIFIED" | "WARNING" | "ERROR" | "EXPIRED";
  details: string;
  actionRequired?: string;
  lastChecked: string;
}

export default function AssetPermissionsHealthPage() {
  const [checks, setChecks] = useState<HealthCheckItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/meta/health");
      const json = await res.json();
      setChecks(json.checks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const totalChecks = checks.length;
  const verifiedCount = checks.filter((c) => c.status === "VERIFIED").length;
  const warningCount = checks.filter((c) => c.status === "WARNING").length;
  const errorCount = checks.filter((c) => c.status === "ERROR" || c.status === "EXPIRED").length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Asset Permissions & Diagnostic Health
          </h1>
          <p className="text-sm text-slate-500">
            Continuous verification of Page-level Lead Access, Ad Account permissions, and webhook health.
          </p>
        </div>
        <button
          onClick={loadHealth}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          <span>Run Permission Health Check</span>
        </button>
      </div>

      {/* Summary Score Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{verifiedCount} / {totalChecks}</div>
            <div className="text-xs text-slate-500 font-medium">Assets Verified & Active</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{warningCount}</div>
            <div className="text-xs text-slate-500 font-medium">Action Needed / Pending Setup</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{errorCount}</div>
            <div className="text-xs text-slate-500 font-medium">Critical Errors / Expired</div>
          </div>
        </div>
      </div>

      {/* Diagnostics Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-800">
          Integration Health Report
        </div>

        {checks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No diagnostic records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Asset / Diagnostic Check</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Details & Diagnostic Findings</th>
                  <th className="py-3 px-4">Required Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checks.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    {/* Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{item.name}</div>
                      {item.portfolioName && (
                        <div className="text-[11px] text-purple-700 font-normal">
                          Portfolio: {item.portfolioName}
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700">
                        {item.type}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {item.status === "VERIFIED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      ) : item.status === "WARNING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Attention</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>{item.status}</span>
                        </span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                      {item.details}
                    </td>

                    {/* Action Required */}
                    <td className="py-3.5 px-4 text-slate-800">
                      {item.actionRequired ? (
                        <div className="p-2 bg-amber-50/60 border border-amber-200/80 rounded-md text-[11px] text-amber-900">
                          {item.actionRequired}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None (Fully Operational)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Page Lead Access Instructions */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Meta Business Suite: How to configure Page-level Lead Access</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Meta restricts CRM access to customer leads unless the CRM app is explicitly granted <strong>Lead Access</strong> on the target Page. If any Facebook Page shows <em>Missing Permission</em> or <em>UNKNOWN</em>:
        </p>
        <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-2">
          <li>Open <strong>Meta Business Suite</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Integrations</strong> &rarr; <strong>Lead Access</strong>.</li>
          <li>Select the relevant Facebook Page and click <strong>CRMs</strong>.</li>
          <li>Locate <strong>AceOne Solutions CRM App</strong> and ensure the toggle is set to <strong>Allowed</strong>.</li>
          <li>Return to this page and click <strong>Run Permission Health Check</strong> to verify green status.</li>
        </ol>
      </div>
    </div>
  );
}
