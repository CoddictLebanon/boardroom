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
} from "lucide-react";
import { CompanySwitcher } from "./company-switcher";
import { UserButton } from "@clerk/nextjs";

interface SidebarProps {
  companyId: string;
}

export function Sidebar({ companyId }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/companies/${companyId}`;

  const navigation = [
    { name: "Dashboard", href: `${basePath}/dashboard`, icon: LayoutDashboard },
    { name: "Meetings", href: `${basePath}/meetings`, icon: Calendar },
    { name: "Action Items", href: `${basePath}/action-items`, icon: CheckSquare },
    { name: "Resolutions", href: `${basePath}/resolutions`, icon: Vote },
    { name: "Documents", href: `${basePath}/documents`, icon: FileText },
    { name: "Financials", href: `${basePath}/financials`, icon: DollarSign },
    { name: "Board Members", href: `${basePath}/members`, icon: Users },
  ];

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
