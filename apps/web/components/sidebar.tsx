"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  FileText,
  Users,
  Vote,
  DollarSign,
  Settings,
  Target,
} from "lucide-react";
import { CompanySwitcher } from "./company-switcher";
import { UserButton } from "@clerk/nextjs";
import { usePermissions } from "@/lib/permissions";

interface SidebarProps {
  companyId: string;
}

export function Sidebar({ companyId }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/companies/${companyId}`;
  const { hasPermission } = usePermissions();

  // Navigation items with required permissions
  const allNavigation = [
    { name: "Dashboard", href: `${basePath}/dashboard`, icon: LayoutDashboard, permission: null },
    { name: "Meetings", href: `${basePath}/meetings`, icon: Calendar, permission: "meetings.view" },
    { name: "Action Items", href: `${basePath}/action-items`, icon: CheckSquare, permission: "action_items.view" },
    { name: "Resolutions", href: `${basePath}/resolutions`, icon: Vote, permission: "resolutions.view" },
    { name: "Documents", href: `${basePath}/documents`, icon: FileText, permission: "documents.view" },
    { name: "Financials", href: `${basePath}/financials`, icon: DollarSign, permission: "financials.view" },
    { name: "OKRs", href: `${basePath}/okrs`, icon: Target, permission: "okrs.view" },
    { name: "Board Members", href: `${basePath}/members`, icon: Users, permission: "members.view" },
  ];

  // Filter navigation based on permissions
  const navigation = allNavigation.filter(
    (item) => item.permission === null || hasPermission(item.permission)
  );

  const secondaryNavigation = [
    { name: "Settings", href: `${basePath}/settings`, icon: Settings },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-gray-50/40">
      {/* Logo / App Name */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href={`${basePath}/dashboard`} className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Calendar className="h-4 w-4" />
          </div>
          <span>Boardroom</span>
        </Link>
      </div>

      {/* Company Switcher */}
      <div className="p-4">
        <CompanySwitcher currentCompanyId={companyId} />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t p-3">
        <nav className="space-y-1">
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/sign-in" />
          <div className="flex-1 truncate">
            <p className="text-sm font-medium text-gray-700">Account</p>
          </div>
        </div>
      </div>
    </div>
  );
}
