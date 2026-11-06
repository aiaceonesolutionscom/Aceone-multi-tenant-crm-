"use client";

import { useState } from "react";
import {
  Settings,
  Copy,
  Check,
  ShieldCheck,
  MessageSquare,
  Server,
  Lock,
  Globe,
  Database,
  Radio,
} from "lucide-react";

export default function PlatformSettingsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const appUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const whatsappWebhookUrl = `${appUrl}/api/webhooks/whatsapp`;
  const gatewayDaemonUrl = `http://localhost:3001`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Platform & Gateway Settings</h1>
        <p className="text-sm text-slate-500">
          Closify CRM multi-tenant core configuration, WhatsApp gateway status, and security parameters.
        </p>
      </div>

      {/* WhatsApp Multi-Device Gateway Daemon */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                WhatsApp Multi-Device Gateway Daemon
              </h2>
              <p className="text-xs text-slate-500">Baileys WebSocket background service for 24/7 hotline connectivity</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>PORT 3001 ACTIVE</span>
          </span>
        </div>

        <div className="space-y-4 text-xs">
          {/* Gateway Endpoint */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Gateway Daemon URL (Local Multi-Tenant Baileys Service)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={gatewayDaemonUrl}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
              />
              <button
                onClick={() => copyToClipboard(gatewayDaemonUrl, "gateway")}
                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 font-medium transition cursor-pointer"
              >
                {copied === "gateway" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied === "gateway" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Real-time Ingestion Webhook URL */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              CRM Inbound Webhook Endpoint
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={whatsappWebhookUrl}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
              />
              <button
                onClick={() => copyToClipboard(whatsappWebhookUrl, "webhook")}
                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 font-medium transition cursor-pointer"
              >
                {copied === "webhook" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied === "webhook" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Infrastructure info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Multi-Tenant Architecture Security</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800">Multi-Device Session Persistence</span>
            <p className="mt-1 text-slate-600">
              Each client’s WhatsApp credentials are encrypted and stored in isolated storage directories (`.wa_auth/`). Disconnections auto-recover without requiring new QR scans.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800">Strict Tenant Scoping</span>
            <p className="mt-1 text-slate-600">
              All backend client endpoints derive tenant identity exclusively from the validated session cookie, completely preventing horizontal privilege escalation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
