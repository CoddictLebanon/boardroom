"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Globe, Calendar, Bell, Link2, CreditCard, Shield, ChevronRight, Users, MapPin, Phone, Stamp, Loader2, Upload, X, Lock } from "lucide-react";
import { SignatureUploader } from "@/components/signature-uploader";
import { useParams, useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { usePermission } from "@/lib/permissions";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface CompanyProfile {
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  registrationNo?: string;
  phone?: string;
  companyEmail?: string;
  website?: string;
  stampUrl?: string;
}

interface CompanyMember {
  role: string;
  user: {
    email: string;
  };
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const companyId = params.companyId as string;
  const [isOwner, setIsOwner] = useState(false);
  const canEditSettings = usePermission("company.edit_settings");

  // Company profile state
  const [profile, setProfile] = useState<CompanyProfile>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Stamp upload state
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);

  // User signature state
  const [userSignatureUrl, setUserSignatureUrl] = useState<string | null>(null);

  // Cleanup blob URL when component unmounts or stampPreview changes
  useEffect(() => {
    return () => {
      if (stampPreview && stampPreview.startsWith('blob:')) {
        URL.revokeObjectURL(stampPreview);
      }
    };
  }, [stampPreview]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (profileSuccess) {
      const timeoutId = setTimeout(() => setProfileSuccess(false), 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [profileSuccess]);

  // Fetch user's signature URL
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const userData = await res.json();
          setUserSignatureUrl(userData.signatureUrl || null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, [getToken]);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!user) return;
      try {
        setIsLoadingProfile(true);
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

          // Set profile data from company
          setProfile({
            address: company.address || "",
            city: company.city || "",
            country: company.country || "",
            postalCode: company.postalCode || "",
            registrationNo: company.registrationNo || "",
            phone: company.phone || "",
            companyEmail: company.companyEmail || "",
            website: company.website || "",
            stampUrl: company.stampUrl || "",
          });

          if (company.stampUrl) {
            setStampPreview(company.stampUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching company data:", error);
        setProfileError("Failed to load company data");
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchCompanyData();
  }, [companyId, getToken, user]);

  const handleProfileChange = (field: keyof CompanyProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setProfileSuccess(false);
    setProfileError(null);
  };

  const handleStampFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setProfileError("Please upload an image file for the stamp");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setProfileError("Stamp image must be less than 5MB");
        return;
      }
      // Revoke old blob URL before creating new one to prevent memory leak
      if (stampPreview && stampPreview.startsWith('blob:')) {
        URL.revokeObjectURL(stampPreview);
      }
      setStampFile(file);
      setStampPreview(URL.createObjectURL(file));
      setProfileError(null);
    }
  };

  const clearStamp = () => {
    // Revoke blob URL to prevent memory leak
    if (stampPreview && stampPreview.startsWith('blob:')) {
      URL.revokeObjectURL(stampPreview);
    }
    setStampFile(null);
    setStampPreview(null);
    setProfile((prev) => ({ ...prev, stampUrl: "" }));
  };

  const uploadStamp = async (): Promise<string | null> => {
    if (!stampFile) return profile.stampUrl || null;

    try {
      setIsUploadingStamp(true);
      const token = await getToken();

      const formData = new FormData();
      formData.append("file", stampFile);
      formData.append("name", `company-stamp-${Date.now()}`);
      formData.append("type", "GOVERNANCE");

      const response = await fetch(`${API_URL}/companies/${companyId}/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload stamp");
      }

      const doc = await response.json();
      // Get the download URL for the stamp
      const downloadRes = await fetch(`${API_URL}/companies/${companyId}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (downloadRes.ok) {
        const { url } = await downloadRes.json();
        return url;
      }

      return doc.storageKey;
    } catch (error) {
      console.error("Error uploading stamp:", error);
      throw error;
    } finally {
      setIsUploadingStamp(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      setProfileError(null);
      setProfileSuccess(false);

      const token = await getToken();

      // Upload stamp if a new file was selected
      let stampUrl = profile.stampUrl;
      if (stampFile) {
        stampUrl = await uploadStamp() || undefined;
      }

      const payload = {
        address: profile.address || undefined,
        city: profile.city || undefined,
        country: profile.country || undefined,
        postalCode: profile.postalCode || undefined,
        registrationNo: profile.registrationNo || undefined,
        phone: profile.phone || undefined,
        companyEmail: profile.companyEmail || undefined,
        website: profile.website || undefined,
        stampUrl: stampUrl || undefined,
      };

      const response = await fetch(`${API_URL}/companies/${companyId}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save profile");
      }

      const updated = await response.json();
      setProfile({
        address: updated.address || "",
        city: updated.city || "",
        country: updated.country || "",
        postalCode: updated.postalCode || "",
        registrationNo: updated.registrationNo || "",
        phone: updated.phone || "",
        companyEmail: updated.companyEmail || "",
        website: updated.website || "",
        stampUrl: updated.stampUrl || "",
      });

      if (updated.stampUrl) {
        setStampPreview(updated.stampUrl);
      }

      setStampFile(null);
      setProfileSuccess(true);
    } catch (error) {
      console.error("Error saving profile:", error);
      setProfileError(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
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

      {/* Personal Settings - User Signature */}
      <SignatureUploader
        currentSignatureUrl={userSignatureUrl}
        companyId={companyId}
        onUpdate={(url) => setUserSignatureUrl(url)}
      />

      {/* Members */}
      <Card
        className="cursor-pointer transition-colors hover:bg-muted/50"
        onClick={() => router.push(`/companies/${companyId}/settings/members`)}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Members</CardTitle>
                <CardDescription>Manage company members and invitations</CardDescription>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
      </Card>

      {/* Role Permissions - Owner Only */}
      {isOwner && (
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => router.push(`/companies/${companyId}/settings/permissions`)}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-100 p-2">
                  <Shield className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle>Role Permissions</CardTitle>
                  <CardDescription>Configure what each role can do in your company</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Company Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>Update your company information for use in official documents and resolutions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !canEditSettings && !isOwner ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <Lock className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">View Only</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You do not have permission to edit company profile settings.
              </p>
            </div>
          ) : (
            <>
              {/* Error/Success messages */}
              {profileError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="rounded-md bg-green-100 p-3 text-sm text-green-700">
                  Company profile saved successfully
                </div>
              )}

              {/* Address Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Address Information
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Business Street, Suite 100"
                      value={profile.address || ""}
                      onChange={(e) => handleProfileChange("address", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Dubai"
                      value={profile.city || ""}
                      onChange={(e) => handleProfileChange("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="United Arab Emirates"
                      value={profile.country || ""}
                      onChange={(e) => handleProfileChange("country", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      placeholder="00000"
                      value={profile.postalCode || ""}
                      onChange={(e) => handleProfileChange("postalCode", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNo">Registration Number</Label>
                    <Input
                      id="registrationNo"
                      placeholder="Company registration number"
                      value={profile.registrationNo || ""}
                      onChange={(e) => handleProfileChange("registrationNo", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+971 4 123 4567"
                      value={profile.phone || ""}
                      onChange={(e) => handleProfileChange("phone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Company Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      placeholder="info@company.com"
                      value={profile.companyEmail || ""}
                      onChange={(e) => handleProfileChange("companyEmail", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://www.company.com"
                      value={profile.website || ""}
                      onChange={(e) => handleProfileChange("website", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Company Stamp Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Stamp className="h-4 w-4" />
                  Company Stamp
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload your company stamp image for use in official resolutions and documents
                </p>
                <div className="flex items-start gap-4">
                  {stampPreview ? (
                    <div className="relative">
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                        <img
                          src={stampPreview}
                          alt="Company stamp preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -right-2 -top-2 h-6 w-6"
                        onClick={clearStamp}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                      <Stamp className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="stamp" className="cursor-pointer">
                      <div className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted">
                        <Upload className="h-4 w-4" />
                        {stampPreview ? "Change Stamp" : "Upload Stamp"}
                      </div>
                    </Label>
                    <Input
                      id="stamp"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleStampFileChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, or GIF. Max 5MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button onClick={handleSaveProfile} disabled={isSavingProfile || isUploadingStamp}>
                  {(isSavingProfile || isUploadingStamp) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Company Profile
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-2">
              <Globe className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Regional Settings</CardTitle>
              <CardDescription>Configure timezone and fiscal year</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select defaultValue="Asia/Dubai">
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                  <SelectItem value="America/New_York">New York (EST)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                  <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscalYear">Fiscal Year Start</Label>
              <Select defaultValue="1">
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-100 p-2">
              <Link2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect external services</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Google Calendar</h4>
                <p className="text-sm text-muted-foreground">
                  Sync meetings with Google Calendar
                </p>
              </div>
            </div>
            <Button variant="outline">Connect</Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Xero</h4>
                <p className="text-sm text-muted-foreground">
                  Import financial data from Xero
                </p>
              </div>
            </div>
            <Button variant="outline">Connect</Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-100 p-2">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure email notification preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Meeting Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Receive reminders before scheduled meetings
                </p>
              </div>
              <Select defaultValue="1day">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1day">1 day before</SelectItem>
                  <SelectItem value="3days">3 days before</SelectItem>
                  <SelectItem value="1week">1 week before</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Action Item Due Dates</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when action items are due
                </p>
              </div>
              <Select defaultValue="1day">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1day">1 day before</SelectItem>
                  <SelectItem value="3days">3 days before</SelectItem>
                  <SelectItem value="1week">1 week before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button>Save Preferences</Button>
        </CardContent>
      </Card>
    </div>
  );
}
