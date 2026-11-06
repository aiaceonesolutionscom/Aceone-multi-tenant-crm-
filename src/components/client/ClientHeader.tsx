"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, Building2, ChevronDown, Menu } from "lucide-react";
import { useSidebar } from "./ClientLayoutShell";
import { FollowUpNotificationBell } from "./FollowUpNotificationBell";
import { ConfirmModal, ConfirmDialogOptions } from "@/components/common/ConfirmModal";

interface ClientHeaderProps {
  user: {
    name: string;
    email: string;
    tenantName?: string | null;
  };
}

export function ClientHeader({ user }: ClientHeaderProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { setMobileOpen, setCollapsed } = useSidebar();

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
    } finally {
      setLoggingOut(false);
    }
  };

  const promptSignOut = () => {
    setDropdownOpen(false);
    setConfirmOptions({
      title: "Sign Out of Closify CRM?",
      message: "Are you sure you want to end your current session and sign out of Closify CRM?",
      variant: "danger",
      confirmText: "Yes, Sign Out",
      cancelText: "Stay Logged In",
      onConfirm: handleLogout,
    });
    setIsConfirmOpen(true);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg lg:hidden transition cursor-pointer shrink-0"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Client Company Workspace Badge (Replacing redundant Closify text) */}
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/90 shadow-2xs min-w-0">
          <div className="w-5 h-5 rounded bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <span
            className="text-xs font-bold text-slate-900 truncate tracking-tight"
            title={user.tenantName || "Client Workspace"}
          >
            {user.tenantName || "Client Workspace"}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 hidden sm:inline-block">
            Workspace
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Real-time Follow-up Notification Bell with Audio Alarm */}
        <FollowUpNotificationBell />

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {user.name}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                {user.tenantName || "Client Admin"}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">{user.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>
              <button
                onClick={promptSignOut}
                disabled={loggingOut}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        options={confirmOptions}
      />
    </header>
  );
}
