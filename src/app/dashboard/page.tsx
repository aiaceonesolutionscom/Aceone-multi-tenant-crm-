"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  UserCheck,
  TrendingUp,
  Share2,
  CalendarClock,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  RefreshCw,
  Bell,
  MessageCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatTime12, formatDate } from "@/lib/date-utils";
import { getTelLink, getWhatsAppChatLink } from "@/lib/phone-utils";

interface DashboardData {
  metrics: {
    totalLeads: number;
    newLeads: number;
    contactedLeads: number;
    interestedLeads: number;
    convertedLeads: number;
    lostLeads: number;
    conversionRate: string;
    whatsappLeads?: number;
    sheetsLeads?: number;
    otherLeads?: number;
    facebookLeads?: number;
    instagramLeads?: number;
  };
  dailyActivity?: Array<{
    day: string;
    date: string;
    inquiries: number;
  }>;
  hotline?: {
    phone: string | null;
    name: string;
    lastReceivedAt: string | null;
    isActive: boolean;
  };
  portfolio?: {
    name: string;
    metaBusinessId: string;
    status: string;
  } | null;
  recentLeads: Array<{
    id: string;
    leadNumber: number;
    fullName: string;
    phone: string | null;
    platform: string;
    status: string;
    createdAt: string;
    campaign?: { name: string } | null;
    metaForm?: { name: string } | null;
  }>;
  pendingFollowUps: Array<{
    id: string;
    scheduledAt: string;
    notes: string | null;
    lead: {
      id: string;
      leadNumber: number;
      fullName: string;
      phone: string | null;
    };
  }>;
}

export default function ClientDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [todayFollowUps, setTodayFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [rightChartView, setRightChartView] = useState<"funnel" | "trend">("funnel");

  const loadDashboard = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [dashRes, followUpRes] = await Promise.all([
        fetch(`/api/client/dashboard?range=${range}`),
        fetch(`/api/client/follow-ups?filter=today`),
      ]);
      if (dashRes.ok) {
        const json = await dashRes.json();
        setData(json);
      }
      if (followUpRes.ok) {
        const fJson = await followUpRes.json();
        setTodayFollowUps(fJson.followUps || []);
      }
    } catch (e) {
      // Suppress transient network aborts
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => {
      loadDashboard(true); // Real-time background sync
    }, 4000);
    return () => clearInterval(interval);
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  const m = data?.metrics;
  const total = m?.totalLeads || 0;

  const stageData = [
    { name: "New", label: "New Leads", count: m?.newLeads || 0, bg: "bg-blue-600", color: "#2563EB" },
    { name: "Contacted", label: "In Contact", count: m?.contactedLeads || 0, bg: "bg-amber-500", color: "#F59E0B" },
    { name: "Interested", label: "Interested", count: m?.interestedLeads || 0, bg: "bg-purple-600", color: "#9333EA" },
    { name: "Won", label: "Converted / Won", count: m?.convertedLeads || 0, bg: "bg-emerald-600", color: "#10B981" },
    { name: "Lost", label: "Lost / Not Qualified", count: m?.lostLeads || 0, bg: "bg-slate-400", color: "#94A3B8" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
              Closify CRM
            </span>
            <span className="text-[11px] text-slate-400 font-medium">by @aceone solutions</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Sales & Customer Inquiries Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time customer inquiries from your active WhatsApp hotline
          </p>
        </div>

        <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200 text-xs w-full sm:w-auto">
          <button
            onClick={() => setRange("today")}
            className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer text-center whitespace-nowrap justify-center flex items-center ${
              range === "today"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setRange("7d")}
            className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer text-center whitespace-nowrap justify-center flex items-center ${
              range === "7d"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setRange("30d")}
            className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer text-center whitespace-nowrap justify-center flex items-center ${
              range === "30d"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Leads
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m?.totalLeads || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Captured leads</div>
        </div>

        {/* New */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
            New
          </span>
          <div className="text-2xl font-bold text-blue-600 mt-2">{m?.newLeads || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pending action</div>
        </div>

        {/* Contacted */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
            Contacted
          </span>
          <div className="text-2xl font-bold text-amber-600 mt-2">{m?.contactedLeads || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">In discussion</div>
        </div>

        {/* Interested */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">
            Interested
          </span>
          <div className="text-2xl font-bold text-purple-600 mt-2">{m?.interestedLeads || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">High intent</div>
        </div>

        {/* Converted */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            Converted / Won
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{m?.convertedLeads || 0}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            {m?.conversionRate}% rate
          </div>
        </div>

        {/* Lost */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Lost
          </span>
          <div className="text-2xl font-bold text-slate-400 mt-2">{m?.lostLeads || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Not qualified</div>
        </div>
      </div>

      {/* Today's Scheduled Follow-ups Highlight Section */}
      {todayFollowUps.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/60 to-white rounded-2xl border-2 border-amber-300 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Action Required: {todayFollowUps.length} Follow-up{todayFollowUps.length > 1 ? "s" : ""} Scheduled for Today</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                    TODAY
                  </span>
                </h2>
                <p className="text-xs text-slate-600">
                  Customers awaiting scheduled callback or discussion today.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/follow-ups"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs transition shrink-0"
            >
              <span>Manage Follow-ups</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayFollowUps.map((f: any) => {
              const telUrl = getTelLink(f.lead?.phone);
              const waChatUrl = getWhatsAppChatLink(f.lead?.phone);
              const schedDate = new Date(f.scheduledAt);
              const isOverdue = Date.now() > schedDate.getTime();

              return (
                <div
                  key={f.id}
                  className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-2 hover:border-amber-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        #{f.lead?.leadNumber}
                      </span>
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {f.lead?.fullName}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        isOverdue
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{formatTime12(f.scheduledAt)}</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono">
                    {f.lead?.phone || "No phone"}
                  </div>

                  {f.notes && (
                    <p className="text-[11px] text-slate-700 bg-slate-50 border border-slate-100 rounded-md p-1.5 line-clamp-2">
                      {f.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {telUrl && (
                        <a
                          href={telUrl}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-semibold border border-blue-200 transition"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                      )}
                      {waChatUrl && (
                        <a
                          href={waChatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-300 transition"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/leads?search=${encodeURIComponent(f.lead?.phone || f.lead?.fullName || "")}`}
                      className="text-[10px] font-semibold text-blue-600 hover:underline"
                    >
                      Open Lead &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content: Recent Leads + Platform Source & Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Leads Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Customer Inquiries</h2>
              <p className="text-xs text-slate-500">Live incoming customer inquiries from your WhatsApp hotline</p>
            </div>
            <Link
              href="/dashboard/leads"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All Leads</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.recentLeads.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                No inquiries captured yet. Customer inquiries sent to your WhatsApp hotline will appear here in real time!
              </div>
            ) : (
              data?.recentLeads.map((lead) => (
                <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      #{lead.leadNumber}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{lead.fullName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{lead.phone || "No phone"}</span>
                        <span>•</span>
                        <span className="capitalize">{lead.platform}</span>
                        {lead.campaign && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[140px] text-slate-400">
                              {lead.campaign.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        lead.status === "NEW"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : lead.status === "CONTACTED"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : lead.status === "INTERESTED"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : lead.status === "CONVERTED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
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

        {/* Right: Sources & Follow-ups */}
        <div className="space-y-6">
          {/* Pipeline Funnel & 7-Day Inbound Trend */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-slate-900 truncate">
                  {rightChartView === "funnel" ? "Pipeline Conversion Funnel" : "7-Day Inbound Activity"}
                </h2>
                <p className="text-[11px] text-slate-400 truncate">
                  {rightChartView === "funnel"
                    ? "Customer distribution across sales stages"
                    : "Daily incoming WhatsApp inquiry volume"}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs shrink-0 whitespace-nowrap border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setRightChartView("funnel")}
                  className={`h-7 px-3 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer inline-flex items-center justify-center ${
                    rightChartView === "funnel"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Funnel
                </button>
                <button
                  type="button"
                  onClick={() => setRightChartView("trend")}
                  className={`h-7 px-3 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer inline-flex items-center justify-center ${
                    rightChartView === "trend"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  7-Day Trend
                </button>
              </div>
            </div>

            {rightChartView === "funnel" ? (
              <div className="space-y-3 my-2">
                {stageData.map((s) => {
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  return (
                    <div key={s.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${s.bg}`}></span>
                          {s.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{s.count}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`${s.bg} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-44 w-full flex items-center justify-center my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.dailyActivity || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md shadow-lg">
                              <div className="font-semibold">{item.date} ({item.day})</div>
                              <div className="text-emerald-400 font-bold">{item.inquiries} inquiries</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="inquiries" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Active Hotline Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-slate-800">WhatsApp Business Hotline</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                {data?.hotline?.phone || "+92 303 2994774"}
              </span>
            </div>
          </div>

          {/* Pending Follow-ups Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Upcoming Follow-ups</h2>
              <Link href="/dashboard/follow-ups" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>

            {data?.pendingFollowUps.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No scheduled follow-ups pending.</p>
            ) : (
              <div className="space-y-2.5">
                {data?.pendingFollowUps.map((f) => (
                  <div key={f.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>{f.lead.fullName}</span>
                      <span className="text-blue-600 text-[11px]">
                        {formatTime12(f.scheduledAt)}
                      </span>
                    </div>
                    {f.notes && (
                      <p className="text-slate-500 text-[11px] mt-1 line-clamp-1">{f.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
