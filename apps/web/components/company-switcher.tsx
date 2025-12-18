"use client";

import * as React from "react";
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
import { useCompanies, Company } from "@/lib/hooks/use-companies";
import { useCurrentCompany } from "@/lib/hooks/use-current-company";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export function CompanySwitcher() {
  const { companies, isLoading, refetch } = useCompanies();
  const { currentCompany, setCurrentCompany } = useCurrentCompany();
  const { getToken } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newCompanyName, setNewCompanyName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;

    try {
      setIsCreating(true);
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
        throw new Error("Failed to create company");
      }

      const newCompany = await response.json();

      // Set as current company
      setCurrentCompany({
        id: newCompany.id,
        name: newCompany.name,
        logo: newCompany.logo,
      });

      // Refetch companies list
      await refetch();

      // Close dialog and reset
      setCreateDialogOpen(false);
      setNewCompanyName("");
    } catch (error) {
      console.error("Error creating company:", error);
      alert("Failed to create company. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Auto-select first company if none selected, or clear stale selection
  React.useEffect(() => {
    if (!isLoading) {
      if (companies.length > 0) {
        // Check if current company is still valid (exists in fetched companies)
        const isCurrentValid = currentCompany && companies.some(c => c.id === currentCompany.id);

        if (!isCurrentValid) {
          // Select first company if no valid selection
          setCurrentCompany({
            id: companies[0].id,
            name: companies[0].name,
            logo: companies[0].logo,
          });
        }
      } else if (currentCompany) {
        // No companies available but we have a stale selection - clear it
        setCurrentCompany(null);
      }
    }
  }, [companies, currentCompany, setCurrentCompany, isLoading]);

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
        <Building2 className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    );
  }

  return (
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
              onSelect={() => {
                setCurrentCompany({
                  id: company.id,
                  name: company.name,
                  logo: company.logo,
                });
                setOpen(false);
              }}
              className="cursor-pointer"
            >
              <Avatar className="mr-2 h-5 w-5">
                {company.logo && <AvatarImage src={company.logo} alt={company.name} />}
                <AvatarFallback className="text-xs">
                  {getInitials(company.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">{company.name}</span>
              {currentCompany?.id === company.id && (
                <Check className="ml-2 h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))
        )}
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
      </DropdownMenuContent>

      {/* Create Company Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
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
    </DropdownMenu>
  );
}
