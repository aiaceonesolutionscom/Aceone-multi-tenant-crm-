"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  QrCode,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ArrowRight,
  ShieldCheck,
  PowerOff,
} from "lucide-react";
import { formatFullDateTime12 } from "@/lib/date-utils";

interface WhatsAppStatusData {
  source: {
    id: string;
    name: string;
    secretKey: string;
    isActive: boolean;
    lastReceivedAt: string | null;
    connectedPhone: string | null;
    leadCount: number;
    isConnected: boolean;
  };
  liveQrCode?: string | null;
  webhookUrl: string;
  tenantName: string;
  assignedPhone?: string | null;
}

export default function WhatsAppConnectPage() {
  const [data, setData] = useState<WhatsAppStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/client/whatsapp");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load WhatsApp status");
        return;
      }
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Auto-poll status every 3.5s to detect mobile phone scan in real time
    const interval = setInterval(() => {
      loadStatus();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this WhatsApp session?")) return;
    setLinking(true);
    try {
      const res = await fetch("/api/client/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      if (res.ok) {
        await loadStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLinking(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 mt-10">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">WhatsApp CRM Hotline Disabled</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const isConnected = data?.source?.isConnected;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-xl font-bold text-slate-900">WhatsApp Business Hotline Hub</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Connect your mobile phone WhatsApp Business via QR scan to capture real-time customer inquiries into {data?.tenantName}&apos;s CRM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/leads?sourceType=WHATSAPP"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>View WhatsApp Leads ({data?.source.leadCount || 0})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Connection Overview Banner */}
      <div className={`p-5 rounded-2xl border ${isConnected ? "bg-emerald-50/60 border-emerald-200" : "bg-amber-50/60 border-amber-200"} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-xl ${isConnected ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}>
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {isConnected ? "WhatsApp Business Connected" : "WhatsApp Not Connected Yet"}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isConnected ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {isConnected ? "ACTIVE & LISTENING" : "READY TO SCAN"}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {isConnected
                ? `Customer inquiries sent to ${data?.source.connectedPhone || "your WhatsApp"} will land automatically into your CRM pipeline.`
                : "Point your phone camera at the QR code below to link your WhatsApp Business number in 30 seconds."}
            </p>
            {data?.source.lastReceivedAt && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Last inquiry received: {formatFullDateTime12(data.source.lastReceivedAt)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={handleDisconnect}
              disabled={linking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>Disconnect Session</span>
            </button>
          )}
          <button
            onClick={loadStatus}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs transition cursor-pointer"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Hotline Hub Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive QR Code Box or Connected Status (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Multi-Device Link</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Assigned Hotline:{" "}
                <strong className="font-mono text-emerald-700">
                  {data?.assignedPhone || data?.source.connectedPhone || "Pending"}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
            {/* Live WhatsApp Web QR Code Display */}
            <div className="p-4 bg-white rounded-xl shadow-md border border-slate-200 shrink-0 text-center">
              <div className="w-52 h-52 bg-white rounded-lg p-2 flex flex-col items-center justify-center relative overflow-hidden border border-slate-200">
                {isConnected ? (
                  <div className="flex flex-col items-center justify-center p-4 text-emerald-700 bg-emerald-50 w-full h-full rounded-md text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider">Device Linked</span>
                    <span className="text-xs font-mono font-bold text-slate-800 mt-1">
                      {data?.source.connectedPhone || data?.assignedPhone}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium mt-1">Live &amp; Synced</span>
                  </div>
                ) : data?.liveQrCode ? (
                  <img
                    src={data.liveQrCode}
                    alt="Scan Live WhatsApp Web QR"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-medium text-slate-600">Generating Live WhatsApp QR...</span>
                    <span className="text-[10px] text-slate-400">Keep screen open</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-2 block">
                {isConnected ? "Device Connected" : "Point Camera at QR"}
              </span>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-3 text-xs text-slate-600 flex-1">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                How to link your WhatsApp:
              </h4>
              <ol className="space-y-2.5 list-decimal list-inside text-xs leading-relaxed text-slate-700">
                <li>
                  Open <strong>WhatsApp</strong> on{" "}
                  <strong className="text-emerald-700 font-mono">
                    {data?.assignedPhone || "your registered phone"}
                  </strong>.
                </li>
                <li>Tap <strong>Menu (3 dots)</strong> or <strong>Settings &gt; Linked Devices</strong>.</li>
                <li>Tap <strong>&quot;Link a Device&quot;</strong> and point your camera at this QR code.</li>
                <li>Your phone will link directly and stay connected permanently.</li>
              </ol>

              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                Hotline number is managed by Super Admin. To update your number, contact support.
              </div>
            </div>
          </div>
        </div>

        {/* Right: Hotline Info & Security (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Hotline Credentials &amp; Status</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-Tenant Baileys gateway routing real-time customer inquiries into {data?.tenantName}&apos;s CRM.
            </p>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Assigned Number:</span>
              <span className="font-mono font-bold text-slate-900">
                {data?.assignedPhone || data?.source.connectedPhone || "None"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Connection State:</span>
              <span className={`font-semibold flex items-center gap-1.5 ${isConnected ? "text-emerald-700" : "text-amber-700"}`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
                <span>{isConnected ? "Active & Listening" : "Awaiting QR Scan"}</span>
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Captured Inquiries:</span>
              <span className="font-bold text-slate-900">{data?.source.leadCount || 0} leads</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Auto-Reconnect Engine:</span>
              <span className="text-emerald-700 font-semibold">Enabled (Survives Network Drops)</span>
            </div>
          </div>

          {/* ASVS Privacy Guarantee */}
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[11px] text-emerald-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Multi-Tenant Enterprise Isolation</span>
            </div>
            <p className="text-emerald-700 leading-relaxed">
              Customer messages sent to this hotline are isolated strictly to {data?.tenantName}. No external party or other tenant can access your chat inquiries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
