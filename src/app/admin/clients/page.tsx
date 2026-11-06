"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  Key,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
  MessageSquare,
  FileSpreadsheet,
} from "lucide-react";

interface ClientUser {
  id: string;
  name: string;
  email: string;
  username: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

interface Client {
  id: string;
  name: string;
  companyEmail: string;
  contactPerson: string;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  timezone: string;
  createdAt: string;
  enabledChannels?: string[];
  users: ClientUser[];
  _count: {
    leads: number;
    followUps: number;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Client Form state
  const [editFormData, setEditFormData] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "SUSPENDED",
    enabledChannels: ["WHATSAPP"],
  });

  // New Client Form state
  const [formData, setFormData] = useState({
    name: "",
    companyEmail: "",
    contactPerson: "",
    phone: "",
    username: "",
    loginEmail: "",
    password: "",
    status: "ACTIVE",
    timezone: "Asia/Karachi",
    enabledChannels: ["WHATSAPP"],
  });

  const loadData = async () => {
    try {
      const resClients = await fetch("/api/admin/clients");
      const dataClients = await resClients.json();
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formData.enabledChannels.length === 0) {
      setFormError("Please select at least one CRM channel for this client.");
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create client");
      }

      setIsCreateOpen(false);
      setFormData({
        name: "",
        companyEmail: "",
        contactPerson: "",
        phone: "",
        username: "",
        loginEmail: "",
        password: "",
        status: "ACTIVE",
        timezone: "Asia/Karachi",
        enabledChannels: ["WHATSAPP", "GOOGLE_SHEETS"],
      });
      loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error creating client");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditOpen = (client: Client) => {
    setEditingClient(client);
    setEditFormData({
      name: client.name,
      contactPerson: client.contactPerson,
      phone: client.phone || "",
      status: client.status,
      enabledChannels: client.enabledChannels || ["WHATSAPP", "GOOGLE_SHEETS"],
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    if (editFormData.enabledChannels.length === 0) {
      setFormError("Please select at least one CRM channel for this client.");
      return;
    }

    setFormError(null);
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/clients/${editingClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update client");
      }

      setIsEditOpen(false);
      setEditingClient(null);
      loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error updating client");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (client: Client) => {
    const nextStatus = client.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${selectedClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        setIsResetPassOpen(false);
        setNewPassword("");
        setSelectedClient(null);
        alert("Password reset successfully!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (
      !confirm(
        `Are you sure you want to delete "${client.name}"? This will permanently remove all associated leads, follow-ups, and user accounts.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      c.companyEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clients & Tenants</h1>
          <p className="text-sm text-slate-500">
            Create client companies, manage credentials, and deploy WhatsApp &amp; Google Forms CRM workspaces.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Client Company</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, person, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 w-full sm:w-auto justify-end">
          <span>Total: <strong className="text-slate-900">{clients.length}</strong></span>
          <span>•</span>
          <span>Active: <strong className="text-emerald-600">{clients.filter((c) => c.status === "ACTIVE").length}</strong></span>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No client companies found. Click "New Client Company" to create one.
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (Hidden on Tablet/Desktop: md:hidden) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredClients.map((client) => {
                const adminUser = client.users[0];

                return (
                  <div key={`mobile-${client.id}`} className="p-4 hover:bg-slate-50/70 transition space-y-3">
                    {/* Header: Company Name + Status Button */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-slate-900 truncate">
                          {client.name}
                        </h3>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{client.companyEmail}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleStatus(client)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition shrink-0 ${
                          client.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {client.status === "ACTIVE" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Contact Person & Admin Account */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/70">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Contact</span>
                        <div className="font-medium text-slate-900 truncate mt-0.5">{client.contactPerson}</div>
                        {client.phone && <div className="text-[11px] text-slate-500 font-mono">{client.phone}</div>}
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Admin Account</span>
                        <div className="font-medium text-slate-900 truncate mt-0.5">{adminUser?.username || "N/A"}</div>
                        <div className="text-[11px] text-slate-500 truncate">{adminUser?.email || "No email"}</div>
                      </div>
                    </div>

                    {/* Enabled Channels + Leads Count */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap gap-1">
                        {(client.enabledChannels || ["WHATSAPP", "GOOGLE_SHEETS"]).includes("WHATSAPP") && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </span>
                        )}
                        {(client.enabledChannels || ["WHATSAPP", "GOOGLE_SHEETS"]).includes("GOOGLE_SHEETS") && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            <FileSpreadsheet className="w-3 h-3 text-sky-600" />
                            <span>Sheets</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                        <span>Leads:</span>
                        <span className="px-2 py-0.2 rounded-full font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {client._count.leads}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Bar */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        title="Edit Client"
                        onClick={() => handleEditOpen(client)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        title="Reset Password"
                        onClick={() => {
                          setSelectedClient(client);
                          setIsResetPassOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Reset Password</span>
                      </button>
                      <button
                        title="Delete Client"
                        onClick={() => handleDeleteClient(client)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Desktop High-Density Table View (Hidden on Mobile: hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Company Name</th>
                    <th className="py-3.5 px-4">Contact Person</th>
                    <th className="py-3.5 px-4">Enabled Channels</th>
                    <th className="py-3.5 px-4">Admin Account</th>
                    <th className="py-3.5 px-4">Leads</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((client) => {
                    const adminUser = client.users[0];

                    return (
                      <tr key={client.id} className="hover:bg-slate-50/80 transition">
                        {/* Company Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{client.name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{client.companyEmail}</span>
                          </div>
                        </td>

                        {/* Contact Person */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">{client.contactPerson}</div>
                          {client.phone && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Enabled CRM Channels */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(client.enabledChannels || ["WHATSAPP", "GOOGLE_SHEETS"]).includes("WHATSAPP") && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <MessageSquare className="w-3 h-3 text-emerald-600" />
                                <span>WhatsApp</span>
                              </span>
                            )}
                            {(client.enabledChannels || ["WHATSAPP", "GOOGLE_SHEETS"]).includes("GOOGLE_SHEETS") && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                <FileSpreadsheet className="w-3 h-3 text-sky-600" />
                                <span>Google Sheets</span>
                              </span>
                            )}
                            {(!client.enabledChannels || client.enabledChannels.length === 0) && (
                              <span className="text-[11px] text-slate-400 italic">None</span>
                            )}
                          </div>
                        </td>

                        {/* Admin User */}
                        <td className="py-3.5 px-4">
                          {adminUser ? (
                            <div>
                              <span className="font-medium text-slate-800">{adminUser.username}</span>
                              <div className="text-[11px] text-slate-400">{adminUser.email}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No user</span>
                          )}
                        </td>

                        {/* Lead Count */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-800">
                            {client._count.leads}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleStatus(client)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition ${
                              client.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {client.status === "ACTIVE" ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-slate-400" />
                                <span>Inactive</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title="Edit Client & Hotline Number"
                              onClick={() => handleEditOpen(client)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              title="Reset Password"
                              onClick={() => {
                                setSelectedClient(client);
                                setIsResetPassOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              title="Delete Client"
                              onClick={() => handleDeleteClient(client)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: Create Client */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Create New Client Company</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Acme Realty Ltd"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.companyEmail}
                    onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                    placeholder="company@example.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+92 300 0000000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Client Admin Credentials Header */}
              <div className="pt-3 border-t border-slate-100">
                <span className="font-bold text-slate-900 block mb-2">
                  Primary Client Admin Account
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="acme_admin"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Login Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.loginEmail}
                      onChange={(e) => setFormData({ ...formData, loginEmail: e.target.value })}
                      placeholder="admin@acme.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* CRM Channels Selection */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Client CRM Channels Package *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      const has = formData.enabledChannels.includes("WHATSAPP");
                      const updated = has
                        ? formData.enabledChannels.filter((c) => c !== "WHATSAPP")
                        : [...formData.enabledChannels, "WHATSAPP"];
                      setFormData({ ...formData, enabledChannels: updated });
                    }}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition select-none ${
                      formData.enabledChannels.includes("WHATSAPP")
                        ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-500 shadow-xs"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.enabledChannels.includes("WHATSAPP")}
                      onChange={() => {}}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 pointer-events-none"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-900">WhatsApp CRM Hotline</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Direct QR scan linking, instant inbound inquiries &amp; chat notes.
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex items-start gap-3 p-3.5 rounded-xl border bg-slate-50/70 border-slate-200 opacity-60 cursor-not-allowed select-none relative"
                    title="Google Sheets & Forms integration is scheduled for a future update."
                  >
                    <input
                      type="checkbox"
                      disabled
                      checked={false}
                      onChange={() => {}}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-400 cursor-not-allowed"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="block text-xs font-bold text-slate-700">Google Sheets &amp; Forms</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-800 rounded">
                          Coming Soon
                        </span>
                      </div>
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        Automated Google Sheet sync &amp; webhooks (Future Release).
                      </span>
                    </div>
                  </div>
                </div>
                {formData.enabledChannels.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-rose-600 font-medium">
                    Please select at least one channel for this client.
                  </p>
                )}
              </div>

              {/* Form buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Client</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Client */}
      {isEditOpen && editingClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Edit Client: {editingClient.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update company profile, assigned WhatsApp Hotline number, and enabled CRM channels.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingClient(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.contactPerson}
                    onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    WhatsApp Hotline Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="e.g. 03032994774 or +923032994774"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              {/* Channels selection */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-700 mb-2">
                  Client CRM Channels Package *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      const has = editFormData.enabledChannels.includes("WHATSAPP");
                      const updated = has
                        ? editFormData.enabledChannels.filter((c) => c !== "WHATSAPP")
                        : [...editFormData.enabledChannels, "WHATSAPP"];
                      setEditFormData({ ...editFormData, enabledChannels: updated });
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
                      editFormData.enabledChannels.includes("WHATSAPP")
                        ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-500 shadow-xs"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editFormData.enabledChannels.includes("WHATSAPP")}
                      onChange={() => {}}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 pointer-events-none"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-900">WhatsApp CRM</span>
                      <span className="block text-[10px] text-slate-500">Live hotline QR gateway</span>
                    </div>
                  </div>

                  <div
                    className="flex items-start gap-3 p-3 rounded-xl border bg-slate-50/70 border-slate-200 opacity-60 cursor-not-allowed select-none relative"
                    title="Google Sheets CRM is scheduled for a future update."
                  >
                    <input
                      type="checkbox"
                      disabled
                      checked={false}
                      onChange={() => {}}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-400 cursor-not-allowed"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="block text-xs font-bold text-slate-700">Google Sheets CRM</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-800 rounded">
                          Coming Soon
                        </span>
                      </div>
                      <span className="block text-[10px] text-slate-400">Sheet sync &amp; webhooks (Future Release)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingClient(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Client Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {isResetPassOpen && selectedClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Reset Password for {selectedClient.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Set a new secure password for client admin ({selectedClient.users[0]?.username}).
            </p>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetPassOpen(false);
                    setSelectedClient(null);
                  }}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1"
                >
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Save Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
