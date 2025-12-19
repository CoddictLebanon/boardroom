"use client";

import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { SocketProvider } from "@/lib/socket";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SocketProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="flex h-14 items-center gap-4 border-b bg-white px-6">
            <div className="flex-1">
              <CommandPalette />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </SocketProvider>
  );
}
