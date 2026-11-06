"use client";

import { useEffect, useState } from "react";
import {
  FolderGit2,
  RefreshCw,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Layers,
  FileSpreadsheet,
  Link as LinkIcon,
  X,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

interface Portfolio {
  id: string;
  name: string;
  metaBusinessId: string;
  status: string;
  lastSyncedAt: string | null;
  assignment: {
    id: string;
    tenantId: string;
    tenant: {
      id: string;
      name: string;
      companyEmail: string;
      status: string;
    };
  } | null;
  _count: {
    adAccounts: number;
    pages: number;
  };
  adAccounts: Array<{
    id: string;
    name: string;
    metaAccountId: string;
    currency: string | null;
    accountStatus: number | null;
  }>;
  pages: Array<{
    id: string;
    name: string;
    metaPageId: string;
    leadAccessStatus: string;
    subscribedToWebhook: boolean;
  }>;
}

interface ClientOption {
  id: string;
  name: string;
  companyEmail: string;
  portfolioAssignment: { businessPortfolioId: string } | null;
}

export default function PortfolioManagementPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Assignment Modal
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [targetTenantId, setTargetTenantId] = useState("");
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [detailsModalPortfolio, setDetailsModalPortfolio] = useState<Portfolio | null>(null);

  const loadData = async () => {
    try {
      const [resPortfolios, resClients] = await Promise.all([
        fetch("/api/admin/portfolios"),
        fetch("/api/admin/clients"),
      ]);
      const dataPortfolios = await resPortfolios.json();
      const dataClients = await resClients.json();

      setPortfolios(dataPortfolios.portfolios || []);
      setClients(dataClients.clients || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAssignModal = (p: Portfolio) => {
    setSelectedPortfolio(p);
    setTargetTenantId(p.assignment?.tenantId || "");
    setConflictWarning(null);
  };

  const handleSaveAssignment = async (confirmReassignment: boolean = false) => {
    if (!selectedPortfolio) return;
    setActionLoading(true);
    setConflictWarning(null);

    try {
      const res = await fetch("/api/admin/portfolios/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: targetTenantId,
          businessPortfolioId: selectedPortfolio.id,
          confirmReassignment,
        }),
      });

      const json = await res.json();

      if (res.status === 409 && json.conflict) {
        setConflictWarning(json.message);
        return;
      }

      if (!res.ok) {
        throw new Error(json.error || "Failed to update assignment");
      }

      setSelectedPortfolio(null);
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error saving assignment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnassign = async (tenantId: string) => {
    if (!confirm("Are you sure you want to detach this portfolio from the client?")) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/portfolios/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          businessPortfolioId: null,
        }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncAssets = async (portfolioId: string) => {
    setSyncingId(portfolioId);
    try {
      const res = await fetch("/api/admin/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_portfolio_assets",
          portfolioId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || "Assets synchronized!");
        loadData();
      } else {
        alert(json.error || "Sync failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Business Portfolio Management</h1>
          <p className="text-sm text-slate-500">
            Map discovered Meta Business Portfolios to client tenants. Every tenant accesses strictly their assigned portfolio.
          </p>
        </div>
      </div>

      {/* Info Callout */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Strict 1-to-1 Portfolio Assignment Model:</span>
          <p className="mt-0.5 text-blue-800">
            A single Business Portfolio can only be assigned to one client at a time. The system actively prevents overlapping tenant assignments to guarantee complete data isolation between corporate clients.
          </p>
        </div>
      </div>

      {/* Portfolios Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : portfolios.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No Business Portfolios found in the central Meta account. Go to Meta Integration to discover portfolios.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Portfolio Name</th>
                  <th className="py-3.5 px-4">Meta Business ID</th>
                  <th className="py-3.5 px-4">Accessible Assets</th>
                  <th className="py-3.5 px-4">Assigned CRM Client</th>
                  <th className="py-3.5 px-4">Health Status</th>
                  <th className="py-3.5 px-4">Last Sync</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolios.map((portfolio) => {
                  const isAssigned = Boolean(portfolio.assignment);
                  const isSyncing = syncingId === portfolio.id;

                  return (
                    <tr key={portfolio.id} className="hover:bg-slate-50/80 transition">
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <FolderGit2 className="w-4 h-4 text-purple-600" />
                          <span>{portfolio.name}</span>
                        </div>
                      </td>

                      {/* Business ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {portfolio.metaBusinessId}
                      </td>

                      {/* Assets Count */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                            <Layers className="w-3.5 h-3.5 text-blue-500" />
                            {portfolio._count.adAccounts} Ad Accounts
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                            <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                            {portfolio._count.pages} Pages
                          </span>
                        </div>
                      </td>

                      {/* Assigned Client */}
                      <td className="py-3.5 px-4">
                        {isAssigned ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Building2 className="w-3 h-3" />
                              {portfolio.assignment?.tenant.name}
                            </span>
                            <button
                              onClick={() => handleUnassign(portfolio.assignment!.tenantId)}
                              title="Unassign Portfolio"
                              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Available (Unassigned)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      </td>

                      {/* Last Sync */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {portfolio.lastSyncedAt
                          ? new Date(portfolio.lastSyncedAt).toLocaleDateString()
                          : "Never"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDetailsModalPortfolio(portfolio)}
                            title="View Assets"
                            className="px-2.5 py-1 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition font-medium cursor-pointer"
                          >
                            Assets
                          </button>
                          <button
                            onClick={() => handleSyncAssets(portfolio.id)}
                            disabled={isSyncing}
                            title="Refresh Assets"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
                          </button>
                          <button
                            onClick={() => handleOpenAssignModal(portfolio)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition shadow-xs cursor-pointer"
                          >
                            {isAssigned ? "Change" : "Assign"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Assign Portfolio to Client */}
      {selectedPortfolio && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Assign Portfolio to Client
              </h2>
              <button
                onClick={() => setSelectedPortfolio(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs border border-slate-200">
              <div className="font-semibold text-slate-800">{selectedPortfolio.name}</div>
              <div className="text-slate-500 text-[11px] font-mono mt-0.5">
                Meta Business ID: {selectedPortfolio.metaBusinessId}
              </div>
            </div>

            {conflictWarning && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Assignment Conflict:</span>
                  <p className="mt-0.5">{conflictWarning}</p>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-3 text-xs">
              <label className="block font-semibold text-slate-700">
                Select Client Company
              </label>
              <select
                value={targetTenantId}
                onChange={(e) => {
                  setTargetTenantId(e.target.value);
                  setConflictWarning(null);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              >
                <option value="">-- Select Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.companyEmail})
                  </option>
                ))}
              </select>

              <p className="text-[11px] text-slate-400">
                Confirming assignment will grant this client tenant private access to all lead ads, forms, and campaigns under this portfolio.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedPortfolio(null)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs"
              >
                Cancel
              </button>
              {conflictWarning ? (
                <button
                  type="button"
                  onClick={() => handleSaveAssignment(true)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1"
                >
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Confirm Reassignment</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSaveAssignment(false)}
                  disabled={!targetTenantId || actionLoading}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1"
                >
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Save Assignment</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Assets Inspector */}
      {detailsModalPortfolio && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {detailsModalPortfolio.name} Assets
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Meta Business ID: {detailsModalPortfolio.metaBusinessId}
                </p>
              </div>
              <button
                onClick={() => setDetailsModalPortfolio(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-5 text-xs">
              {/* Ad Accounts */}
              <div>
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Ad Accounts ({detailsModalPortfolio.adAccounts.length})</span>
                </h3>
                {detailsModalPortfolio.adAccounts.length === 0 ? (
                  <p className="text-slate-400 italic">No ad accounts discovered.</p>
                ) : (
                  <div className="space-y-2">
                    {detailsModalPortfolio.adAccounts.map((acc) => (
                      <div key={acc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{acc.name}</div>
                          <div className="text-slate-500 text-[11px] font-mono">{acc.metaAccountId}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {acc.currency || "USD"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pages & Webhooks */}
              <div>
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-indigo-600" />
                  <span>Facebook Pages ({detailsModalPortfolio.pages.length})</span>
                </h3>
                {detailsModalPortfolio.pages.length === 0 ? (
                  <p className="text-slate-400 italic">No pages discovered.</p>
                ) : (
                  <div className="space-y-2">
                    {detailsModalPortfolio.pages.map((pg) => (
                      <div key={pg.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{pg.name}</div>
                          <div className="text-slate-500 text-[11px] font-mono">Page ID: {pg.metaPageId}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Lead Access: {pg.leadAccessStatus}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            pg.subscribedToWebhook
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {pg.subscribedToWebhook ? "Webhook Subscribed" : "Webhook Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
