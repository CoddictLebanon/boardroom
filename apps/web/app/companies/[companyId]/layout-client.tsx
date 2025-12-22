"use client";

import { SocketProvider } from "@/lib/socket";
import { PermissionProvider } from "@/lib/permissions";
import { SidebarProvider } from "@/lib/sidebar-context";

interface CompanyLayoutClientProps {
  companyId: string;
  children: React.ReactNode;
}

export function CompanyLayoutClient({ companyId, children }: CompanyLayoutClientProps) {
  return (
    <SocketProvider>
      <PermissionProvider companyId={companyId}>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </PermissionProvider>
    </SocketProvider>
  );
}
