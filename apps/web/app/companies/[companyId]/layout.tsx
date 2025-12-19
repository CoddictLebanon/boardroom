import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { CompanyLayoutClient } from "./layout-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

async function validateCompanyAccess(companyId: string, token: string) {
  try {
    const response = await fetch(`${API_URL}/companies/${companyId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    redirect("/sign-in");
  }

  const hasAccess = await validateCompanyAccess(companyId, token);

  if (!hasAccess) {
    redirect("/companies");
  }

  return (
    <CompanyLayoutClient companyId={companyId}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar companyId={companyId} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b bg-white px-6">
            <div className="flex-1">
              <CommandPalette />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </CompanyLayoutClient>
  );
}
