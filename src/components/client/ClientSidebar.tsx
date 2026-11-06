"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  KanbanSquare,
  CalendarClock,
  BarChart3,
  Settings,
  FileSpreadsheet,
  MessageSquare,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ClientSidebarProps {
  tenantName: string;
  portfolioName?: string | null;
  enabledChannels?: string[];
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

export function ClientSidebar({
  tenantName,
  enabledChannels = ["WHATSAPP", "GOOGLE_SHEETS"],
  mobileOpen = false,
  setMobileOpen,
  collapsed = false,
  setCollapsed,
}: ClientSidebarProps) {
  const pathname = usePathname();

  // Close mobile drawer on route navigation
  useEffect(() => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  }, [pathname, setMobileOpen]);

  const isWhatsAppEnabled = enabledChannels.includes("WHATSAPP");
  const isSheetsEnabled = enabledChannels.includes("GOOGLE_SHEETS");

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", href: "/dashboard/leads", icon: Inbox },
    { name: "Pipeline", href: "/dashboard/pipeline", icon: KanbanSquare },
    { name: "Follow-ups", href: "/dashboard/follow-ups", icon: CalendarClock },
    ...(isWhatsAppEnabled
      ? [{ name: "WhatsApp Hotline", href: "/dashboard/whatsapp", icon: MessageSquare }]
      : []),
    ...(isSheetsEnabled
      ? [{ name: "Google Sheets & Forms", href: "/dashboard/sources", icon: FileSpreadsheet }]
      : []),
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <>
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen transition-all duration-300 ease-in-out
          fixed inset-y-0 left-0 lg:static
          ${mobileOpen ? "translate-x-0 shadow-2xl w-64 z-50" : "-translate-x-full lg:translate-x-0 z-20"}
          ${collapsed ? "lg:w-20" : "lg:w-64"}
        `}
      >
        {/* Brand Header */}
        <div
          className={`h-16 border-b border-slate-200 flex items-center ${
            collapsed ? "px-2 justify-center" : "px-3.5 justify-between gap-1"
          }`}
        >
          {collapsed ? (
            /* Collapsed State: Centered CRM Logo with Smooth Hover Expand Trigger */
            <div className="relative group flex items-center justify-center">
              <button
                onClick={() => setCollapsed && setCollapsed(false)}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shadow-xs hover:border-blue-400 hover:ring-2 hover:ring-blue-100 transition-all cursor-pointer relative overflow-hidden"
                title="Expand Sidebar"
              >
                <div className="relative w-8 h-8 group-hover:opacity-0 transition-opacity duration-200">
                  <Image
                    src="/closify-brand.png"
                    alt="Closify CRM"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                {/* Hover state: expand arrow */}
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-blue-600 rounded-xl">
                  <ChevronRight className="w-5 h-5 text-white" />
                </span>
              </button>
            </div>
          ) : (
            /* Expanded State: Closify CRM Logo on left, Collapse Toggle on right */
            <>
              <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-8 h-8 shrink-0">
                  <Image
                    src="/closify-brand.png"
                    alt="Closify CRM"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1.5 leading-tight">
                    <span>Closify</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      CRM
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">
                    by @aceone solutions
                  </div>
                </div>
              </Link>

              {/* Desktop Collapse Toggle */}
              <button
                onClick={() => setCollapsed && setCollapsed(true)}
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg hidden lg:flex items-center justify-center transition cursor-pointer shrink-0"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>

              {/* Close button for Mobile */}
              <button
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 lg:hidden rounded-lg hover:bg-slate-50 cursor-pointer"
                title="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Tenant Context Banner (Only when expanded) */}
        {!collapsed && (
          <div className="px-3.5 py-3 border-b border-slate-200/80 bg-slate-50/50">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Workspace</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Live
                </span>
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-linear-to-br from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  {tenantName ? tenantName.charAt(0).toUpperCase() : "A"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-slate-900 truncate tracking-tight" title={tenantName}>
                    {tenantName || "aceone solutions"}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">
                    Enterprise Dedicated CRM
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
