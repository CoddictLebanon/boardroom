# Company-Scoped Data Isolation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the app so users must select a company before seeing any data, with company ID in URLs for proper deep-linking.

**Architecture:** Move all dashboard pages under `/companies/[companyId]/` route. Create company picker at `/companies`. Remove localStorage-based company state, use URL params instead.

**Tech Stack:** Next.js 16, React, Clerk auth, TypeScript

---

## Task 1: Create Company Picker Page

**Files:**
- Create: `apps/web/app/companies/page.tsx`

**Step 1: Create the company picker page**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface Company {
  id: string;
  name: string;
  logo: string | null;
  role: string;
}

export default function CompanyPickerPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/companies`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();

          // Auto-redirect if only one company
          if (data.length === 1) {
            router.replace(`/companies/${data[0].id}/dashboard`);
            return;
          }

          setCompanies(data);
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, [getToken, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">No Companies Yet</h1>
          <p className="mt-2 text-muted-foreground">
            You don't have access to any companies yet.
            <br />
            Contact an administrator to receive an invitation.
          </p>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Select a Company</h1>
        <p className="mt-2 text-muted-foreground">Choose which company to continue with</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card
            key={company.id}
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => router.push(`/companies/${company.id}/dashboard`)}
          >
            <CardContent className="flex flex-col items-center gap-3 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                {company.logo ? (
                  <img src={company.logo} alt={company.name} className="h-12 w-12 rounded-full" />
                ) : (
                  <span className="text-2xl font-bold text-primary">
                    {company.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="text-center">
                <h3 className="font-semibold">{company.name}</h3>
                <p className="text-sm text-muted-foreground">{company.role}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <UserButton afterSignOutUrl="/sign-in" />
    </div>
  );
}
```

**Step 2: Verify the file was created**

Run: `ls -la apps/web/app/companies/page.tsx`
Expected: File exists

**Step 3: Commit**

```bash
git add apps/web/app/companies/page.tsx
git commit -m "feat: add company picker page"
```

---

## Task 2: Create Company-Scoped Layout

**Files:**
- Create: `apps/web/app/companies/[companyId]/layout.tsx`

**Step 1: Create the company layout**

```typescript
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";

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
  );
}
```

**Step 2: Verify the file was created**

Run: `ls -la apps/web/app/companies/[companyId]/layout.tsx`
Expected: File exists

**Step 3: Commit**

```bash
git add apps/web/app/companies/[companyId]/layout.tsx
git commit -m "feat: add company-scoped layout with access validation"
```

---

## Task 3: Update Sidebar to Accept companyId Prop

**Files:**
- Modify: `apps/web/components/sidebar.tsx`

**Step 1: Update sidebar to use companyId prop**

Replace the entire file with:

```typescript
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
```

**Step 2: Commit**

```bash
git add apps/web/components/sidebar.tsx
git commit -m "refactor: update sidebar to use companyId prop for routing"
```

---

## Task 4: Update Company Switcher to Navigate

**Files:**
- Modify: `apps/web/components/company-switcher.tsx`

**Step 1: Update company switcher to navigate instead of setState**

Replace the entire file with:

```typescript
"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface Company {
  id: string;
  name: string;
  logo: string | null;
}

interface CompanySwitcherProps {
  currentCompanyId: string;
}

export function CompanySwitcher({ currentCompanyId }: CompanySwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { getToken } = useAuth();

  const [open, setOpen] = React.useState(false);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/companies`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setCompanies(data);
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, [getToken]);

  const currentCompany = companies.find((c) => c.id === currentCompanyId);

  const handleCompanySwitch = (companyId: string) => {
    if (companyId === currentCompanyId) {
      setOpen(false);
      return;
    }

    // Replace the current companyId in the path with the new one
    const newPath = pathname.replace(
      `/companies/${currentCompanyId}`,
      `/companies/${companyId}`
    );

    router.push(newPath);
    setOpen(false);
  };

  if (isLoading) {
    return (
      <Button variant="outline" className="w-full justify-start" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {currentCompany?.name || "Select company"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search company..." />
          <CommandList>
            <CommandEmpty>No company found.</CommandEmpty>
            <CommandGroup>
              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.name}
                  onSelect={() => handleCompanySwitch(company.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentCompanyId === company.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {company.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/company-switcher.tsx
git commit -m "refactor: update company switcher to navigate instead of setState"
```

---

## Task 5: Move Dashboard Pages to Company-Scoped Routes

**Files:**
- Create: `apps/web/app/companies/[companyId]/dashboard/page.tsx`
- Create: `apps/web/app/companies/[companyId]/meetings/page.tsx`
- Create: `apps/web/app/companies/[companyId]/meetings/[id]/page.tsx`
- Create: `apps/web/app/companies/[companyId]/meetings/new/page.tsx`
- Create: `apps/web/app/companies/[companyId]/action-items/page.tsx`
- Create: `apps/web/app/companies/[companyId]/documents/page.tsx`
- Create: `apps/web/app/companies/[companyId]/resolutions/page.tsx`
- Create: `apps/web/app/companies/[companyId]/financials/page.tsx`
- Create: `apps/web/app/companies/[companyId]/members/page.tsx`
- Create: `apps/web/app/companies/[companyId]/settings/page.tsx`

**Step 1: Create directory structure**

```bash
mkdir -p apps/web/app/companies/[companyId]/dashboard
mkdir -p apps/web/app/companies/[companyId]/meetings/[id]
mkdir -p apps/web/app/companies/[companyId]/meetings/new
mkdir -p apps/web/app/companies/[companyId]/action-items
mkdir -p apps/web/app/companies/[companyId]/documents
mkdir -p apps/web/app/companies/[companyId]/resolutions
mkdir -p apps/web/app/companies/[companyId]/financials
mkdir -p apps/web/app/companies/[companyId]/members
mkdir -p apps/web/app/companies/[companyId]/settings
```

**Step 2: Copy existing pages to new locations**

```bash
cp "apps/web/app/(dashboard)/dashboard/page.tsx" "apps/web/app/companies/[companyId]/dashboard/page.tsx"
cp "apps/web/app/(dashboard)/meetings/page.tsx" "apps/web/app/companies/[companyId]/meetings/page.tsx"
cp "apps/web/app/(dashboard)/meetings/[id]/page.tsx" "apps/web/app/companies/[companyId]/meetings/[id]/page.tsx"
cp "apps/web/app/(dashboard)/meetings/new/page.tsx" "apps/web/app/companies/[companyId]/meetings/new/page.tsx"
cp "apps/web/app/(dashboard)/action-items/page.tsx" "apps/web/app/companies/[companyId]/action-items/page.tsx"
cp "apps/web/app/(dashboard)/documents/page.tsx" "apps/web/app/companies/[companyId]/documents/page.tsx"
cp "apps/web/app/(dashboard)/resolutions/page.tsx" "apps/web/app/companies/[companyId]/resolutions/page.tsx"
cp "apps/web/app/(dashboard)/financials/page.tsx" "apps/web/app/companies/[companyId]/financials/page.tsx"
cp "apps/web/app/(dashboard)/members/page.tsx" "apps/web/app/companies/[companyId]/members/page.tsx"
cp "apps/web/app/(dashboard)/settings/page.tsx" "apps/web/app/companies/[companyId]/settings/page.tsx"
```

**Step 3: Commit the copy**

```bash
git add apps/web/app/companies/
git commit -m "feat: copy dashboard pages to company-scoped routes"
```

---

## Task 6: Update Copied Pages to Use URL Params

**Files:**
- Modify: All pages under `apps/web/app/companies/[companyId]/`

**Step 1: Update dashboard page**

In `apps/web/app/companies/[companyId]/dashboard/page.tsx`, replace `useCurrentCompany` usage:

Find and replace:
- Remove: `import { useCurrentCompany } from "@/lib/hooks/use-current-company";`
- Remove: `const { currentCompany } = useCurrentCompany();`
- Add: `"use client";` at top if not present
- Add: `import { useParams } from "next/navigation";`
- Add: `const { companyId } = useParams<{ companyId: string }>();`
- Replace any `currentCompany.id` with `companyId`
- Replace any `currentCompany?.name` with company name from fetched data

**Step 2: Update meetings page**

In `apps/web/app/companies/[companyId]/meetings/page.tsx`:
- Replace `useCurrentCompany` with `useParams`
- Update API calls to use `companyId` from params

**Step 3: Update meeting detail page**

In `apps/web/app/companies/[companyId]/meetings/[id]/page.tsx`:
- Replace `useCurrentCompany` with `useParams`
- Params will have both `companyId` and `id`

**Step 4: Update all other pages similarly**

Each page needs:
1. Remove `useCurrentCompany` import and usage
2. Add `useParams` import
3. Get `companyId` from `useParams<{ companyId: string }>()`
4. Use `companyId` in API calls

**Step 5: Commit**

```bash
git add apps/web/app/companies/
git commit -m "refactor: update all pages to use companyId from URL params"
```

---

## Task 7: Update Root Page and Middleware

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/middleware.ts`

**Step 1: Update root page to redirect to /companies**

Replace `apps/web/app/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/companies");
  } else {
    redirect("/sign-in");
  }
}
```

**Step 2: Update middleware**

Replace `apps/web/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

**Step 3: Commit**

```bash
git add apps/web/app/page.tsx apps/web/middleware.ts
git commit -m "feat: update root page to redirect to company picker"
```

---

## Task 8: Delete Old Dashboard Routes and Hooks

**Files:**
- Delete: `apps/web/app/(dashboard)/` directory
- Delete: `apps/web/lib/hooks/use-current-company.ts`

**Step 1: Delete old dashboard directory**

```bash
rm -rf "apps/web/app/(dashboard)"
```

**Step 2: Delete use-current-company hook**

```bash
rm apps/web/lib/hooks/use-current-company.ts
```

**Step 3: Update hooks index to remove export**

In `apps/web/lib/hooks/index.ts`, remove the line:
```typescript
export * from './use-current-company';
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old dashboard routes and unused hooks"
```

---

## Task 9: Build and Verify

**Step 1: Run build**

```bash
cd apps/web && npm run build
```

Expected: Build succeeds with no TypeScript errors

**Step 2: If build fails, fix any remaining issues**

Common issues:
- Missing imports
- References to deleted hooks
- Link hrefs not updated

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete company-scoped data isolation"
```

---

## Summary of Changes

| Change | Before | After |
|--------|--------|-------|
| Dashboard URL | `/dashboard` | `/companies/[id]/dashboard` |
| Company selection | localStorage state | URL params |
| Company switching | setState | Navigation |
| Root URL | Redirect to sign-in | Redirect to /companies |
| Company picker | None | `/companies` page |
| Access validation | Client-side | Server-side in layout |
