"use client";

import { useState, createContext, useContext } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

interface AdminSidebarContextType {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextType>({
  mobileOpen: false,
  setMobileOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
});

export const useAdminSidebar = () => useContext(AdminSidebarContext);

interface AdminLayoutShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
  };
}

export function AdminLayoutShell({ children, user }: AdminLayoutShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AdminSidebarContext.Provider
      value={{
        mobileOpen,
        setMobileOpen,
        collapsed,
        setCollapsed,
      }}
    >
      <div className="min-h-screen flex bg-slate-50 text-slate-900 antialiased">
        {/* Mobile Backdrop Overlay */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          />
        )}

        {/* Sidebar */}
        <AdminSidebar
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden max-w-full">
          <AdminHeader user={user} />
          <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </AdminSidebarContext.Provider>
  );
}
