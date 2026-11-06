"use client";

import { useState, createContext, useContext } from "react";
import { ClientSidebar } from "./ClientSidebar";
import { ClientHeader } from "./ClientHeader";

interface SidebarContextType {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  mobileOpen: false,
  setMobileOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

interface ClientLayoutShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    tenantName?: string | null;
  };
  tenantName: string;
  enabledChannels?: string[];
}

export function ClientLayoutShell({
  children,
  user,
  tenantName,
  enabledChannels = ["WHATSAPP", "GOOGLE_SHEETS"],
}: ClientLayoutShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider
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
        <ClientSidebar
          tenantName={tenantName}
          enabledChannels={enabledChannels}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden max-w-full">
          <ClientHeader user={user} />
          <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
