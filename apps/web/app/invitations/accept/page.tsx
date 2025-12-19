"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type AcceptState = "loading" | "success" | "error" | "not-found" | "expired" | "already-member";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const token = searchParams.get("token");

  const [state, setState] = useState<AcceptState>("loading");
  const [companyName, setCompanyName] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      // Redirect to sign-in, then back here
      const returnUrl = encodeURIComponent(`/invitations/accept?token=${token}`);
      router.push(`/sign-in?redirect_url=${returnUrl}`);
      return;
    }

    if (!token) {
      setState("not-found");
      return;
    }

    acceptInvitation();
  }, [isLoaded, isSignedIn, token]);

  const acceptInvitation = async () => {
    try {
      const authToken = await getToken();

      const response = await fetch(`${API_URL}/invitations/${token}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCompanyName(data.company.name);
        setCompanyId(data.company.id);
        setState("success");
      } else {
        const error = await response.json();
        const message = error.message || "Failed to accept invitation";

        if (message.includes("not found")) {
          setState("not-found");
        } else if (message.includes("expired")) {
          setState("expired");
        } else if (message.includes("already a member")) {
          setState("already-member");
        } else {
          setErrorMessage(message);
          setState("error");
        }
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      setErrorMessage("An unexpected error occurred");
      setState("error");
    }
  };

  const goToCompany = () => {
    router.push(`/companies/${companyId}/dashboard`);
  };

  const goToCompanies = () => {
    router.push("/companies");
  };

  if (!isLoaded || (isLoaded && !isSignedIn)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {state === "loading" && (
          <>
            <CardHeader className="text-center">
              <CardTitle>Accepting Invitation</CardTitle>
              <CardDescription>Please wait...</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </CardContent>
          </>
        )}

        {state === "success" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle>Welcome to {companyName}!</CardTitle>
              <CardDescription>
                You have successfully joined the company.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={goToCompany}>Go to Dashboard</Button>
            </CardContent>
          </>
        )}

        {state === "not-found" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <CardTitle>Invitation Not Found</CardTitle>
              <CardDescription>
                This invitation link is invalid or has been revoked.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="outline" onClick={goToCompanies}>
                Go to Companies
              </Button>
            </CardContent>
          </>
        )}

        {state === "expired" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <AlertCircle className="h-10 w-10 text-yellow-600" />
              </div>
              <CardTitle>Invitation Expired</CardTitle>
              <CardDescription>
                This invitation has expired. Please ask the company admin to send a new invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="outline" onClick={goToCompanies}>
                Go to Companies
              </Button>
            </CardContent>
          </>
        )}

        {state === "already-member" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <CheckCircle className="h-10 w-10 text-blue-600" />
              </div>
              <CardTitle>Already a Member</CardTitle>
              <CardDescription>
                You are already a member of this company.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={goToCompanies}>Go to Companies</Button>
            </CardContent>
          </>
        )}

        {state === "error" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <CardTitle>Something Went Wrong</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="outline" onClick={goToCompanies}>
                Go to Companies
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
