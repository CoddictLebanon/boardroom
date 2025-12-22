"use client";

import { SocketProvider } from "@/lib/socket";
import { PermissionProvider } from "@/lib/permissions";

interface CompanyLayoutClientProps {
  companyId: string;
  children: React.ReactNode;
}

export function CompanyLayoutClient({ companyId, children }: CompanyLayoutClientProps) {
  return (
    <SocketProvider>
      <PermissionProvider companyId={companyId}>
        {children}
      </PermissionProvider>
    </SocketProvider>
  );
}
