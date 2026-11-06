"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FolderGit2,
  Inbox,
  Calendar,
  Share2,
  ShieldCheck,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Clock,
} from "lucide-react";
import { formatTime12, formatDateTime12 } from "@/lib/date-utils";

interface OverviewData {
  metrics: {
    totalClients: number;
    activeClients: number;
    inactiveClients: number;
    totalSources?: number;
    totalLeads: number;
    leadsToday: number;
    failedSyncCount?: number;
  };
  recentLeads: Array<{
    id: string;
    leadNumber: number;
    fullName: string;
    phone: string | null;
    platform: string;
    status: string;
    createdAt: string;
    tenant: { name: string };
    metaForm?: { name: string } | null;
  }>;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    tenant?: { name: string } | null;
  }>;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/admin/overview");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  const metrics = data?.metrics;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            AceOne Central Platform Command
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-tenant monitoring, WhatsApp gateway, and Google Sheets/Forms integration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Clients</span>
          </Link>
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition"
          >
            <Inbox className="w-3.5 h-3.5 text-slate-500" />
            <span>All Inbound Leads</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clients */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Client Companies
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.totalClients || 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              {metrics?.activeClients || 0} active
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Inactive: {metrics?.inactiveClients || 0}</span>
            <Link href="/admin/clients" className="text-blue-600 hover:underline">
              View all
            </Link>
          </div>
        </div>

        {/* Ingestion Sources & Channels */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active CRM Channels
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.totalSources || 0}
            </span>
            <span className="text-xs text-sky-600 font-medium">Hotlines &amp; Sheets</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>WhatsApp &amp; Sheets</span>
            <Link href="/admin/sources" className="text-blue-600 hover:underline">
              Inspect
            </Link>
          </div>
        </div>

        {/* Total Leads Collected */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Inbound Leads
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.totalLeads || 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" />+{metrics?.leadsToday || 0} today
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Across all tenants</span>
            <Link href="/admin/leads" className="text-blue-600 hover:underline">
              Inspect
            </Link>
          </div>
        </div>

        {/* Gateway Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              WhatsApp Gateway
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm font-bold text-slate-900 truncate">
              Baileys Engine Active
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-emerald-700 font-medium">Multi-Tenant Gateway</span>
            <Link href="/admin/clients" className="text-blue-600 hover:underline">
              Tenants
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Leads across tenants + Platform Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Ingested Leads (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Customer Inquiries</h2>
              <p className="text-xs text-slate-500">Real-time inquiries routed directly to tenants</p>
            </div>
            <Link
              href="/admin/leads"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {data?.recentLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No leads received yet.
              </div>
            ) : (
              data?.recentLeads.map((lead) => (
                <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                      #{lead.leadNumber}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{lead.fullName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{lead.phone || "No phone"}</span>
                        <span>•</span>
                        <span className="capitalize">{lead.platform}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {lead.tenant.name}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatTime12(lead.createdAt)}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        lead.status === "NEW"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : lead.status === "CONTACTED"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : lead.status === "CONVERTED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Platform Audit & Health (1 Col) */}
        <div className="space-y-6">
          {/* Quick Health Status Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4">System Integration Health</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800">Page Lead Access</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  Verified
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                <div className="flex items-center gap-2.5">
                  <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800">Lead Webhooks</span>
                </div>
                <span className="text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                  Subscribed
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800">Sync Failures</span>
                </div>
                <span className="text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {metrics?.failedSyncCount || 0} Errors
                </span>
              </div>
            </div>

            <Link
              href="/admin/health"
              className="mt-4 block text-center text-xs font-semibold text-blue-600 hover:text-blue-700 py-1.5"
            >
              Run Diagnostic Checks →
            </Link>
          </div>

          {/* Recent Administrative Logs */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Recent Platform Actions</h2>
            <div className="space-y-2.5">
              {data?.recentAuditLogs.map((log) => (
                <div key={log.id} className="text-xs text-slate-600 flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">{log.action}</span>
                    {log.tenant && (
                      <span className="text-slate-500"> on {log.tenant.name}</span>
                    )}
                    <div className="text-[11px] text-slate-400">
                      {formatDateTime12(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
