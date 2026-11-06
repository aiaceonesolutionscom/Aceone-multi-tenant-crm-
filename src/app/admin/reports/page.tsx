"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Share2,
  Users,
  Download,
  Calendar,
  Layers,
  Inbox,
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

interface ReportData {
  clients: Array<{
    id: string;
    name: string;
    _count: { leads: number };
  }>;
}

export default function PlatformReportsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/clients")
      .then((res) => res.json())
      .then((json) => {
        setClients(json.clients || []);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const chartData = clients.map((c) => ({
    name: c.name.length > 15 ? c.name.slice(0, 15) + "..." : c.name,
    leads: c._count?.leads || 0,
  }));

  const COLORS = ["#2563EB", "#7C3AED", "#10B981", "#F59E0B", "#EC4899"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Platform Analytics & Reports</h1>
          <p className="text-sm text-slate-500">
            Aggregate lead acquisition performance and distribution across all client companies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Comparison Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Leads by Client Company</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" fontSize={11} stroke="#64748B" />
                <YAxis fontSize={11} stroke="#64748B" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E2E8F0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="leads" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Distribution Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Client Workspace Summary</h2>
          <div className="space-y-3">
            {clients.map((c, idx) => (
              <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  ></span>
                  <div>
                    <div className="font-semibold text-slate-900">{c.name}</div>
                    <div className="text-[11px] text-slate-500">
                      Channels: {(c as any).enabledChannels?.join(", ") || "WhatsApp, Google Sheets"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{c._count?.leads || 0} leads</div>
                  <div className="text-[11px] text-emerald-600 font-medium">Active</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
