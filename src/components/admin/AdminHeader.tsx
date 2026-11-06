"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  Briefcase,
  Layers,
  ArrowRightLeft,
  Check,
  Menu,
} from "lucide-react";
import { useAdminSidebar } from "./AdminLayoutShell";

interface AdminHeaderProps {
  user: {
    name: string;
    email: string;
  };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter();
  const { mobileOpen, setMobileOpen, collapsed, setCollapsed } = useAdminSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Platform Title + Hamburger Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile-only Hamburger Menu (Hidden on desktop because sidebar has its own toggle) */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer shrink-0 lg:hidden"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 truncate">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="truncate">AceOne Platform Master Control</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs">
              SA
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {user.name}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                Super Admin
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
                onClick={handleLogout}
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
    </header>
  );
}
