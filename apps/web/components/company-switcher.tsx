"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronsUpDown, PlusCircle, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface Company {
  id: string;
  name: string;
  logo: string | null;
  members?: Array<{
    userId: string;
    role: string;
  }>;
}

interface CompanySwitcherProps {
  currentCompanyId: string;
}

export function CompanySwitcher({ currentCompanyId }: CompanySwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { getToken, userId } = useAuth();

  const [open, setOpen] = React.useState(false);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newCompanyName, setNewCompanyName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const fetchCompanies = React.useCallback(async () => {
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
  }, [getToken]);

  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const currentCompany = companies.find((c) => c.id === currentCompanyId);

  // Check if user is an owner of any company
  const isOwner = React.useMemo(() => {
    return companies.some((company) =>
      company.members?.some((member) =>
        member.userId === userId && member.role === "OWNER"
      )
    );
  }, [companies, userId]);

  // Allow creation if user is owner OR if no companies exist (bootstrap)
  const canCreateCompany = isOwner || companies.length === 0;

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

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;

    try {
      setIsCreating(true);
      setCreateError(null);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCompanyName.trim() }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          setCreateError("Only owners can create new companies. Please contact an administrator.");
          return;
        }
        throw new Error("Failed to create company");
      }

      const newCompany = await response.json();

      // Navigate to new company's dashboard
      router.push(`/companies/${newCompany.id}/dashboard`);

      // Close dialog and reset
      setCreateDialogOpen(false);
      setNewCompanyName("");
      setCreateError(null);
    } catch (error) {
      console.error("Error creating company:", error);
      setCreateError("Failed to create company. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2 truncate">
              {currentCompany ? (
                <>
                  <Avatar className="h-5 w-5">
                    {currentCompany.logo && (
                      <AvatarImage src={currentCompany.logo} alt={currentCompany.name} />
                    )}
                    <AvatarFallback className="text-xs">
                      {getInitials(currentCompany.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{currentCompany.name}</span>
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  <span>Select company...</span>
                </>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[240px]" align="start">
          <DropdownMenuLabel>Your Companies</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {companies.length === 0 ? (
            <DropdownMenuItem disabled>No companies found</DropdownMenuItem>
          ) : (
            companies.map((company) => (
              <DropdownMenuItem
                key={company.id}
                onSelect={() => handleCompanySwitch(company.id)}
                className="cursor-pointer"
              >
                <Avatar className="mr-2 h-5 w-5">
                  {company.logo && <AvatarImage src={company.logo} alt={company.name} />}
                  <AvatarFallback className="text-xs">
                    {getInitials(company.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">{company.name}</span>
                {currentCompanyId === company.id && (
                  <Check className="ml-2 h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))
          )}
          {canCreateCompany && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => {
                  setOpen(false);
                  setCreateDialogOpen(true);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Company
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Company Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setCreateError(null);
          setNewCompanyName("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>
              Enter a name for your new company. You can add more details later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                placeholder="e.g., Acme Corporation"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateCompany();
                  }
                }}
              />
            </div>
            {createError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {createError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCompany} disabled={isCreating || !newCompanyName.trim()}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
