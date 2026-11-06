"use client";

import { useEffect, useState } from "react";
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderGit2,
  ExternalLink,
  ShieldCheck,
  Key,
  Layers,
  AlertCircle,
  Loader2,
  Lock,
} from "lucide-react";

interface ConnectionData {
  connection: {
    id: string;
    appId: string;
    metaUserId: string;
    metaUserName: string | null;
    tokenExpiresAt: string | null;
    scopes: string[];
    status: string;
    lastVerifiedAt: string | null;
    portfoliosCount: number;
  } | null;
  portfolios: Array<{
    id: string;
    name: string;
    metaBusinessId: string;
    status: string;
    assignment: { tenant: { name: string } } | null;
  }>;
}

export default function MetaIntegrationPage() {
  const [data, setData] = useState<ConnectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/meta");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnectOAuth = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_oauth_url" }),
      });
      const json = await res.json();
      if (res.ok && json.oauthUrl) {
        window.location.href = json.oauthUrl;
      } else {
        throw new Error(json.error || "Failed to generate Meta OAuth URL");
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error initiating Meta OAuth");
      setActionLoading(false);
    }
  };

  const handleDiscoverPortfolios = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/admin/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discover_portfolios" }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to discover portfolios");
      }
      setActionSuccess(json.message);
      loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error discovering portfolios");
    } finally {
      setActionLoading(false);
    }
  };

  const conn = data?.connection;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Central Meta Integration</h1>
        <p className="text-sm text-slate-500">
          Connect AceOne's centralized Meta account to discover and manage multiple Business Portfolios across tenants.
        </p>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Central Meta Developer App
                </h2>
                {conn ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected & Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Single master connection model powering multiple client tenants.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conn && (
              <button
                onClick={handleDiscoverPortfolios}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin text-blue-600" : ""}`} />
                <span>Scan Portfolios</span>
              </button>
            )}
            <button
              onClick={handleConnectOAuth}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{conn ? "Reconnect Meta Account" : "Connect Meta Account"}</span>
            </button>
          </div>
        </div>

        {/* Connection Details Grid */}
        {conn && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 font-medium">Authorized Account</span>
              <div className="mt-1 font-bold text-slate-900 text-sm">
                {conn.metaUserName || "Agency Central Account"}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                ID: {conn.metaUserId}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 font-medium">Token Security & Expiry</span>
              <div className="mt-1 font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>AES-256-GCM Encrypted</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {conn.tokenExpiresAt
                  ? `Valid until ${new Date(conn.tokenExpiresAt).toLocaleDateString()}`
                  : "60-day auto-refreshing token"}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 font-medium">Discovered Portfolios</span>
              <div className="mt-1 font-bold text-slate-900 text-sm">
                {conn.portfoliosCount} Business Portfolios
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Accessible via Meta Graph API v21.0
              </div>
            </div>
          </div>
        )}

        {/* Granted Meta Permissions */}
        {conn && conn.scopes && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Verified Meta Graph API Scopes
            </h3>
            <div className="flex flex-wrap gap-2">
              {conn.scopes.map((scope) => (
                <span
                  key={scope}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-blue-50 text-blue-800 border border-blue-200"
                >
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  <span>{scope}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Discovered Portfolios Preview */}
      {data?.portfolios && data.portfolios.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Business Portfolios in Central Meta Account ({data.portfolios.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {data.portfolios.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <FolderGit2 className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900">{p.name}</span>
                    <span className="text-slate-400 text-[11px] ml-2 font-mono">
                      {p.metaBusinessId}
                    </span>
                  </div>
                </div>
                <div>
                  {p.assignment ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Assigned to {p.assignment.tenant.name}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Unassigned
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
