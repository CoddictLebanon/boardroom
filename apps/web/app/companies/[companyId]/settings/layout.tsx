"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Building2, Users, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface CompanyMember {
  role: string;
  user: {
    email: string;
  };
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const { getToken } = useAuth();
  const { user } = useUser();
  const companyId = params.companyId as string;
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const checkOwnership = async () => {
      if (!user) return;
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const company = await res.json();
          const membership = company.members?.find(
            (m: CompanyMember) => m.user.email === user.primaryEmailAddress?.emailAddress
          );
          setIsOwner(membership?.role === "OWNER");
        }
      } catch (error) {
        console.error("Error checking ownership:", error);
      }
    };
    checkOwnership();
  }, [companyId, getToken, user]);

  const navItems = [
    {
      href: `/companies/${companyId}/settings`,
      label: "Company Profile",
      icon: Building2,
      exact: true,
    },
    {
      href: `/companies/${companyId}/settings/members`,
      label: "Members",
      icon: Users,
    },
    ...(isOwner
      ? [
          {
            href: `/companies/${companyId}/settings/permissions`,
            label: "Role Permissions",
            icon: Shield,
          },
        ]
      : []),
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your company and account settings
        </p>
      </div>

      {/* Content with sidebar */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-56 shrink-0">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
