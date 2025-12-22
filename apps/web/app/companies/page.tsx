"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useClerk, UserButton } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, LogOut } from "lucide-react";

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
  const { signOut } = useClerk();
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
        <Button
          variant="outline"
          onClick={() => signOut({ redirectUrl: '/sign-in' })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      {/* User menu in top-right corner */}
      <div className="absolute top-4 right-4">
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

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
    </div>
  );
}
