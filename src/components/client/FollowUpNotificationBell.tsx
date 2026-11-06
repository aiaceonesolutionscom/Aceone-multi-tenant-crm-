"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  Clock,
  Phone,
  MessageCircle,
  Volume2,
  VolumeX,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { formatTime12, formatDate } from "@/lib/date-utils";
import { getTelLink, getWhatsAppChatLink } from "@/lib/phone-utils";
import { playFollowUpChime } from "@/lib/alarm-sound";

interface NotificationFollowUp {
  id: string;
  scheduledAt: string;
  notes: string | null;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  lead: {
    id: string;
    leadNumber: number;
    fullName: string;
    phone: string | null;
    email: string | null;
    status: string;
  };
}

export function FollowUpNotificationBell() {
  const [followUps, setFollowUps] = useState<NotificationFollowUp[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasNewAlarm, setHasNewAlarm] = useState(false);
  const [browserNotificationAllowed, setBrowserNotificationAllowed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Check browser notification permission & load sound preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crm_alarm_sound");
      if (saved !== null) {
        setSoundEnabled(saved === "true");
      }
    } catch (_) {}

    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserNotificationAllowed(Notification.permission === "granted");
    }
  }, []);

  const requestDesktopNotification = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setBrowserNotificationAllowed(perm === "granted");
        if (perm === "granted") {
          new Notification("Closify CRM: Alerts Enabled", {
            body: "You will now receive desktop reminders when follow-up meetings are due!",
            icon: "/logo.png",
          });
        }
      } catch (_) {}
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem("crm_alarm_sound", String(next));
    } catch (_) {}
    if (next) {
      playFollowUpChime();
    }
  };

  const fetchFollowUps = async () => {
    try {
      const res = await fetch("/api/client/follow-ups?filter=notifications");
      if (!res.ok) return;
      const json = await res.json();
      const list: NotificationFollowUp[] = json.followUps || [];
      setFollowUps(list);

      // Check if any follow-up is due right now (or within the last 30 minutes)
      const now = Date.now();
      let shouldRing = false;

      for (const f of list) {
        const schedTime = new Date(f.scheduledAt).getTime();
        // If scheduled within the last 30 mins or coming up in next 2 minutes
        const diffMins = (now - schedTime) / (1000 * 60);

        if (diffMins >= -2 && diffMins <= 30 && !notifiedIdsRef.current.has(f.id)) {
          notifiedIdsRef.current.add(f.id);
          shouldRing = true;

          // Trigger native Web Desktop Notification
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`⏰ Follow-up Due: ${f.lead?.fullName || "Customer"}`, {
                body: `Scheduled callback with ${f.lead?.fullName} (${f.lead?.phone || "No phone"}) is due now! Notes: ${f.notes || "No notes"}`,
                icon: "/logo.png",
                tag: `followup-${f.id}`,
              });
            } catch (_) {}
          }
        }
      }

      if (shouldRing) {
        setHasNewAlarm(true);
        if (soundEnabled) {
          playFollowUpChime();
        }
      }
    } catch (_) {}
  };

  // Poll every 15 seconds
  useEffect(() => {
    fetchFollowUps();
    const interval = setInterval(fetchFollowUps, 15000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleOpenDropdown = () => {
    setIsOpen((prev) => !prev);
    setHasNewAlarm(false);
  };

  const pendingCount = followUps.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpenDropdown}
        className={`relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer ${
          hasNewAlarm ? "animate-bounce text-amber-600 bg-amber-50" : ""
        }`}
        title={pendingCount > 0 ? `${pendingCount} follow-ups scheduled for today` : "No pending follow-ups"}
      >
        <Bell className={`w-5 h-5 ${pendingCount > 0 ? "text-slate-800" : "text-slate-500"}`} />

        {/* Counter Badge */}
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
            {pendingCount > 9 ? "9+" : pendingCount}
            {hasNewAlarm && (
              <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-75"></span>
            )}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Follow-up Alerts</h4>
                <p className="text-[10px] text-slate-500">Scheduled for today & pending</p>
              </div>
            </div>

            {/* Sound Mute/Unmute Toggle Button */}
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                soundEnabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
              }`}
              title={soundEnabled ? "Sound enabled (Click to Mute)" : "Sound muted (Click to Enable)"}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px]">Chime On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px]">Muted</span>
                </>
              )}
            </button>
          </div>

          {/* Desktop Push Notification Banner */}
          {!browserNotificationAllowed && (
            <div className="mx-3 my-2 p-2 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Bell className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] text-blue-900 font-medium truncate">Desktop meeting alerts off</span>
              </div>
              <button
                type="button"
                onClick={requestDesktopNotification}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold shadow-2xs transition shrink-0 cursor-pointer"
              >
                Turn On
              </button>
            </div>
          )}

          {/* List of Follow-ups */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {followUps.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold text-slate-800">All clear for today!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No pending follow-ups scheduled right now.</p>
              </div>
            ) : (
              followUps.map((f) => {
                const schedDate = new Date(f.scheduledAt);
                const isOverdue = Date.now() > schedDate.getTime();
                const telUrl = getTelLink(f.lead?.phone);
                const waChatUrl = getWhatsAppChatLink(f.lead?.phone);

                return (
                  <div key={f.id} className="p-3.5 hover:bg-slate-50/80 transition space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-blue-600">
                            #{f.lead?.leadNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {f.lead?.fullName || "Lead"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {f.lead?.phone || "No phone"}
                        </div>
                      </div>

                      {/* Time Badge */}
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isOverdue
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{formatTime12(f.scheduledAt)}</span>
                      </span>
                    </div>

                    {/* Note Snippet */}
                    {f.notes && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-md p-1.5 line-clamp-2">
                        {f.notes}
                      </p>
                    )}

                    {/* Quick Call & WA Actions */}
                    <div className="flex items-center justify-between pt-1">
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
                        onClick={() => setIsOpen(false)}
                        className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-0.5"
                      >
                        <span>Open Lead</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">Total: {followUps.length} due today</span>
            <Link
              href="/dashboard/follow-ups"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Follow-ups Manager</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
