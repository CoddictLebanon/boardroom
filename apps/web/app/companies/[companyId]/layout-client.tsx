"use client";

import { SocketProvider } from "@/lib/socket";

interface CompanyLayoutClientProps {
  companyId: string;
  children: React.ReactNode;
}

export function CompanyLayoutClient({ companyId, children }: CompanyLayoutClientProps) {
  return <SocketProvider>{children}</SocketProvider>;
}
