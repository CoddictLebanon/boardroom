"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Briefcase, Loader2, Save, Mail } from "lucide-react";
import { SignatureUploader } from "@/components/signature-uploader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  phone: string | null;
  position: string | null;
  signatureUrl: string | null;
}

export default function ProfilePage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setPhone(data.phone || "");
          setPosition(data.position || "");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [getToken]);

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const timeoutId = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [success]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const token = await getToken();
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: phone || null,
          position: position || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedProfile = await res.json();
      setProfile(updatedProfile);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information, contact details, and signature
        </p>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-100 p-3 text-sm text-green-700">
          Profile updated successfully
        </div>
      )}

      {/* Personal Information (Read-only from Clerk) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                This information is managed by your authentication provider
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {clerkUser?.imageUrl && (
              <img
                src={clerkUser.imageUrl}
                alt="Profile"
                className="h-16 w-16 rounded-full"
              />
            )}
            <div>
              <p className="font-medium">
                {profile?.firstName} {profile?.lastName}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {profile?.email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Position */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-green-100 p-2">
              <Briefcase className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Contact & Position</CardTitle>
              <CardDescription>
                Your contact information and job title for official documents
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position / Job Title</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="position"
                  placeholder="e.g., Chief Executive Officer"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Signature */}
      <SignatureUploader
        currentSignatureUrl={profile?.signatureUrl}
        companyId={companyId}
        onUpdate={(url) => {
          if (profile) {
            setProfile({ ...profile, signatureUrl: url });
          }
        }}
      />
    </div>
  );
}
