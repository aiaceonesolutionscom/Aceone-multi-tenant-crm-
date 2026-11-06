"use client";

import { useEffect, useState } from "react";
import {
  Inbox,
  Search,
  Filter,
  Building2,
  Calendar,
  Share2,
  ArrowUpRight,
  Eye,
  X,
  FileSpreadsheet,
  MessageSquare,
} from "lucide-react";
import { formatDateTime12 } from "@/lib/date-utils";

interface Lead {
  id: string;
  leadNumber: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  interestedService: string | null;
  platform: string;
  status: string;
  createdAt: string;
  submittedAt: string;
  tenant: { id: string; name: string };
  campaign?: { name: string } | null;
  ad?: { name: string } | null;
  metaForm?: { name: string } | null;
}

interface ClientOption {
  id: string;
  name: string;
}

export default function AdminLeadsOverviewPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const loadData = async () => {
    try {
      const url = selectedTenantId
        ? `/api/admin/leads?tenantId=${selectedTenantId}`
        : "/api/admin/leads";
      const [resLeads, resClients] = await Promise.all([
        fetch(url),
        fetch("/api/admin/clients"),
      ]);
      const dataLeads = await resLeads.json();
      const dataClients = await resClients.json();

      setLeads(dataLeads.leads || []);
      setClients(dataClients.clients || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTenantId]);

  const filteredLeads = leads.filter(
    (l) =>
      l.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone && l.phone.includes(search)) ||
      (l.email && l.email.toLowerCase().includes(search.toLowerCase())) ||
      String(l.leadNumber).includes(search)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Platform Leads Overview</h1>
        <p className="text-sm text-slate-500">
          Super Admin aggregate view of all inbound inquiries captured across all client companies.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone, lead #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          >
            <option value="">All Client Companies</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Total Leads: <strong className="text-slate-900">{filteredLeads.length}</strong>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No leads found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Lead #</th>
                  <th className="py-3 px-4">Client Company</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Interested Service</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Captured</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      #{lead.leadNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {lead.tenant.name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {lead.fullName}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{lead.phone || "—"}</div>
                      <div className="text-[11px] text-slate-400">{lead.email || "—"}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {lead.interestedService || "—"}
                    </td>

                    <td className="py-3.5 px-4 capitalize">
                      {lead.platform === "whatsapp" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </span>
                      ) : lead.platform === "google_sheets" || lead.platform === "google_forms" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <FileSpreadsheet className="w-3 h-3 text-purple-600" />
                          <span>Google Sheet</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Share2 className="w-3 h-3 text-blue-600" />
                          <span>{lead.platform}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
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
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {formatDateTime12(lead.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Lead Inspector */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Lead #{selectedLead.leadNumber} Details
              </h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Client Tenant</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedLead.tenant.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Customer Name</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedLead.fullName}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Phone</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedLead.phone || "—"}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Email</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedLead.email || "—"}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Interested Service</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedLead.interestedService || "—"}</div>
                </div>
              </div>

              {selectedLead.campaign && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Campaign & Form</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedLead.campaign.name}</div>
                  {selectedLead.metaForm && (
                    <div className="text-slate-500 text-[11px] mt-0.5">Form: {selectedLead.metaForm.name}</div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
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
