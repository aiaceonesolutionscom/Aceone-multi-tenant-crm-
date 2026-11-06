"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Inbox,
  BarChart3,
  Webhook,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
} from "lucide-react";

const platformNav = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Clients & Tenants", href: "/admin/clients", icon: Building2 },
  { name: "All Leads & Inquiries", href: "/admin/leads", icon: Inbox },
  { name: "Platform Reports", href: "/admin/reports", icon: BarChart3 },
  { name: "Webhook Logs", href: "/admin/webhooks", icon: Webhook },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

export function AdminSidebar({
  mobileOpen = false,
  setMobileOpen,
  collapsed = false,
  setCollapsed,
}: AdminSidebarProps) {
  const pathname = usePathname();

  // Close mobile drawer on route change
  useEffect(() => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  }, [pathname, setMobileOpen]);

  return (
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
          /* Collapsed State: CRM Logo with expand hover */
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
              <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-blue-600 rounded-xl">
                <ChevronRight className="w-5 h-5 text-white" />
              </span>
            </button>
          </div>
        ) : (
          /* Expanded State: Logo + Collapse Button */
          <>
            <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
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
                  Admin Master Platform
                </div>
              </div>
            </Link>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setCollapsed && setCollapsed(true)}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen && setMobileOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 lg:hidden rounded-lg hover:bg-slate-100 cursor-pointer"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Role Banner (Expanded Only) */}
      {!collapsed ? (
        <div className="px-3.5 py-3 border-b border-slate-200/80 bg-slate-50/50">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                <span>Super Admin</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Platform Root
              </span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-linear-to-br from-slate-900 to-blue-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-slate-900 truncate">
                  Master Platform Control
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  Global Tenant Management
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-2.5 flex justify-center border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200" title="Super Admin Mode">
            SA
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Platform Management
          </div>
        )}
        {platformNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={`flex items-center rounded-lg text-xs font-semibold transition-all ${
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"
              } ${
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-200 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? "text-blue-600" : "text-slate-400"
                }`}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-200 text-xs text-slate-500 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="text-slate-700 font-bold text-[11px]">AceOne Multi-Tenant</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">Platform Control Center &bull; v2.0</p>
        </div>
      )}
    </aside>
  );
}
