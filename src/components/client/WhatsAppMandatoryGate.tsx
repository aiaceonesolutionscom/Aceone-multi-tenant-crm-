"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Smartphone,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { ConfirmModal, ConfirmDialogOptions } from "@/components/common/ConfirmModal";

interface WhatsAppStatusData {
  source: {
    id: string;
    connectedPhone: string | null;
    isConnected: boolean;
  };
  liveQrCode?: string | null;
  assignedPhone?: string | null;
  tenantName: string;
}

interface WhatsAppMandatoryGateProps {
  enabledChannels?: string[];
  isInitiallyConnected?: boolean;
}

export function WhatsAppMandatoryGate({
  enabledChannels = ["WHATSAPP", "GOOGLE_SHEETS"],
  isInitiallyConnected = false,
}: WhatsAppMandatoryGateProps) {
  const isWhatsAppEnabled = enabledChannels.includes("WHATSAPP");
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // Confirmation dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmDialogOptions | null>(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  };

  const promptSignOut = () => {
    setConfirmOptions({
      title: "Exit to Login?",
      message: "Are you sure you want to sign out and return to the login screen?",
      variant: "danger",
      confirmText: "Yes, Sign Out",
      onConfirm: handleLogout,
    });
    setIsConfirmOpen(true);
  };

  const [data, setData] = useState<WhatsAppStatusData | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(isInitiallyConnected);
  const [isUnlocked, setIsUnlocked] = useState(isInitiallyConnected);
  const [justConnected, setJustConnected] = useState(false);
  const wasConnectedRef = useRef(isInitiallyConnected);

  const checkStatus = async () => {
    if (!isWhatsAppEnabled) return;
    try {
      const res = await fetch(`/api/client/whatsapp?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      setData(json);

      const currentlyConnected = Boolean(json.source?.isConnected);

      if (currentlyConnected) {
        if (!wasConnectedRef.current && !isInitiallyConnected) {
          wasConnectedRef.current = true;
          setJustConnected(true);
          // Automatically unlock and refresh to dashboard in 800ms
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 800);
        } else {
          setIsUnlocked(true);
        }
      } else {
        if (!isInitiallyConnected) {
          wasConnectedRef.current = false;
          setIsUnlocked(false);
          setJustConnected(false);
        }
      }
    } catch (_) {
      // Offline or initializing
    } finally {
      setInitialLoaded(true);
    }
  };

  useEffect(() => {
    // If WhatsApp is disabled or already initially connected, no QR polling needed
    if (!isWhatsAppEnabled || isInitiallyConnected) return;

    checkStatus();

    // Poll every 3.5s while waiting for user to scan QR code
    const interval = setInterval(() => {
      checkStatus();
    }, 3500);

    return () => clearInterval(interval);
  }, [isWhatsAppEnabled, isInitiallyConnected]);

  // If not enabled or already unlocked, don't show gate
  if (!isWhatsAppEnabled) return null;
  if (isUnlocked && !justConnected) return null;

  const isConnected = Boolean(data?.source?.isConnected) || justConnected;
  const assignedPhone = data?.assignedPhone || data?.source?.connectedPhone || "your mobile phone";

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-7 sm:p-8 border border-slate-200 text-center relative overflow-hidden">
        {/* Top Header with Sign Out Button */}
        <div className="flex items-center justify-between mb-5">
          <div className="w-20 hidden sm:block"></div> {/* Optical spacer */}
          <div className="flex items-center justify-center gap-2.5 mx-auto sm:mx-0">
            <Image
              src="/closify-brand.png"
              alt="Closify CRM Logo"
              width={36}
              height={36}
              className="w-9 h-9 object-contain drop-shadow-sm"
              priority
            />
            <div className="text-left">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg leading-tight block">
                Closify CRM
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">
                Enterprise Cloud
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={promptSignOut}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer"
            title="Log out and switch account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{loggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>

        {isConnected ? (
          /* Success Screen when user just finished scanning */
          <div className="py-8 space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                WhatsApp Hotline Linked!
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                {data?.source.connectedPhone || assignedPhone}
              </p>
            </div>
            <p className="text-xs text-emerald-700 font-semibold">
              Live multi-device listening active. Unlocking your CRM dashboard...
            </p>
            <div className="pt-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto" />
            </div>
          </div>
        ) : (
          /* Mandatory Pairing Screen */
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>ACTION REQUIRED: CONNECT WHATSAPP</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Connect Your WhatsApp Hotline
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                Before accessing your CRM dashboard, please link your registered WhatsApp Hotline number:
              </p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-900 font-mono font-bold text-sm rounded-lg border border-emerald-200">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>{assignedPhone}</span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="w-48 h-48 bg-white rounded-xl shadow-md p-2 border border-slate-200 flex items-center justify-center shrink-0">
                {data?.liveQrCode ? (
                  <img
                    src={data.liveQrCode}
                    alt="Scan Live WhatsApp Web QR"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-medium text-slate-700">
                      Generating Live WhatsApp QR...
                    </span>
                    <span className="text-[10px] text-slate-400">Keep screen open</span>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="text-left text-xs text-slate-700 space-y-2.5 flex-1">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  How to link:
                </h4>
                <ol className="space-y-2 list-decimal list-inside text-xs leading-relaxed">
                  <li>
                    Open <strong>WhatsApp</strong> on phone{" "}
                    <strong className="text-emerald-700 font-mono font-bold">
                      {assignedPhone}
                    </strong>.
                  </li>
                  <li>
                    Tap <strong>Menu (3 dots)</strong> or <strong>Settings</strong> &gt;{" "}
                    <strong>Linked Devices</strong>.
                  </li>
                  <li>
                    Tap <strong>&quot;Link a Device&quot;</strong> and point your camera at this QR code.
                  </li>
                </ol>
                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                  ⚡ Once linked, your device stays permanently connected.
                </div>
              </div>
            </div>

            {/* Security note & Switch Account Link */}
            <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 font-medium text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>256-Bit End-to-End Encrypted Session • Bank-Grade Enterprise Security</span>
              </div>
              <button
                type="button"
                onClick={promptSignOut}
                disabled={loggingOut}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 underline transition cursor-pointer shrink-0"
              >
                Log in with another account &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        options={confirmOptions}
      />
    </div>
  );
}
