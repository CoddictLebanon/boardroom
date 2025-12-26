"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  FileText,
  Vote,
  DollarSign,
  Settings,
  Target,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CompanySwitcher } from "./company-switcher";
import { UserButton } from "@clerk/nextjs";
import { usePermissions } from "@/lib/permissions";
import { useSidebar } from "@/lib/sidebar-context";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  companyId: string;
}

export function Sidebar({ companyId }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/companies/${companyId}`;
  const { hasPermission } = usePermissions();
  const { isCollapsed, toggle } = useSidebar();

  // Navigation items with required permissions
  const allNavigation = [
    { name: "Dashboard", href: `${basePath}/dashboard`, icon: LayoutDashboard, permission: null },
    { name: "Meetings", href: `${basePath}/meetings`, icon: Calendar, permission: "meetings.view" },
    { name: "Action Items", href: `${basePath}/action-items`, icon: CheckSquare, permission: "action_items.view" },
    { name: "Resolutions", href: `${basePath}/resolutions`, icon: Vote, permission: "resolutions.view" },
    { name: "Documents", href: `${basePath}/documents`, icon: FileText, permission: "documents.view" },
    { name: "Financials", href: `${basePath}/financials`, icon: DollarSign, permission: "financials.view" },
    { name: "OKRs", href: `${basePath}/okrs`, icon: Target, permission: "okrs.view" },
    { name: "Team", href: `${basePath}/team`, icon: Users, permission: "team.view" },
  ];

  // Filter navigation based on permissions
  const navigation = allNavigation.filter(
    (item) => item.permission === null || hasPermission(item.permission)
  );

  const secondaryNavigation = [
    { name: "Settings", href: `${basePath}/settings`, icon: Settings },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "relative flex h-full flex-col border-r bg-gray-50/40 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Collapse Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="absolute -right-3 top-16 z-10 h-6 w-6 rounded-full border bg-white shadow-sm hover:bg-gray-100"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        {/* Logo / App Name */}
        <div className="flex h-14 items-center border-b px-4">
          <Link
            href={`${basePath}/dashboard`}
            className={cn(
              "flex items-center gap-2 font-semibold",
              isCollapsed && "justify-center"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Calendar className="h-4 w-4" />
            </div>
            {!isCollapsed && <span>Boardroom</span>}
          </Link>
        </div>

        {/* Company Switcher */}
        {!isCollapsed && (
          <div className="p-4">
            <CompanySwitcher currentCompanyId={companyId} />
          </div>
        )}

        {/* Main Navigation */}
        <nav className={cn("flex-1 space-y-1", isCollapsed ? "px-2 pt-4" : "px-3")}>
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const linkContent = (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors",
                  isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className={cn("border-t", isCollapsed ? "p-2" : "p-3")}>
          <nav className="space-y-1">
            {secondaryNavigation.map((item) => {
              const isActive = pathname === item.href;
              const linkContent = (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-colors",
                    isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>
        </div>

        {/* User Section */}
        <div className={cn("border-t", isCollapsed ? "p-2" : "p-4")}>
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
            <UserButton afterSignOutUrl="/sign-in" />
            {!isCollapsed && (
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-gray-700">Account</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
