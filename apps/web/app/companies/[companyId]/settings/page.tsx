"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, MapPin, Phone, Loader2, Upload, X, Lock, ImageIcon, Stamp } from "lucide-react";
import { useParams } from "next/navigation";
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
  logo?: string;
}

interface CompanyMember {
  role: string;
  user: {
    email: string;
  };
}

export default function CompanyProfilePage() {
  const params = useParams();
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

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (stampPreview && stampPreview.startsWith('blob:')) {
        URL.revokeObjectURL(stampPreview);
      }
    };
  }, [stampPreview]);

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  // Auto-clear success message
  useEffect(() => {
    if (profileSuccess) {
      const timeoutId = setTimeout(() => setProfileSuccess(false), 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [profileSuccess]);

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
            logo: company.logo || "",
          });

          if (company.stampUrl) setStampPreview(company.stampUrl);
          if (company.logo) setLogoPreview(company.logo);
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
      if (!file.type.startsWith("image/")) {
        setProfileError("Please upload an image file for the stamp");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setProfileError("Stamp image must be less than 5MB");
        return;
      }
      if (stampPreview && stampPreview.startsWith('blob:')) {
        URL.revokeObjectURL(stampPreview);
      }
      setStampFile(file);
      setStampPreview(URL.createObjectURL(file));
      setProfileError(null);
    }
  };

  const clearStamp = () => {
    if (stampPreview && stampPreview.startsWith('blob:')) {
      URL.revokeObjectURL(stampPreview);
    }
    setStampFile(null);
    setStampPreview(null);
    setProfile((prev) => ({ ...prev, stampUrl: "" }));
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setProfileError("Please upload an image file for the logo");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setProfileError("Logo image must be less than 5MB");
        return;
      }
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setProfileError(null);
    }
  };

  const clearLogo = () => {
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(null);
    setLogoPreview(null);
    setProfile((prev) => ({ ...prev, logo: "" }));
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
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload stamp");

      const doc = await response.json();
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

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return profile.logo || null;

    try {
      setIsUploadingLogo(true);
      const token = await getToken();

      const formData = new FormData();
      formData.append("file", logoFile);
      formData.append("name", `company-logo-${Date.now()}`);
      formData.append("type", "GOVERNANCE");

      const response = await fetch(`${API_URL}/companies/${companyId}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload logo");

      const doc = await response.json();
      const downloadRes = await fetch(`${API_URL}/companies/${companyId}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (downloadRes.ok) {
        const { url } = await downloadRes.json();
        return url;
      }
      return doc.storageKey;
    } catch (error) {
      console.error("Error uploading logo:", error);
      throw error;
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      setProfileError(null);
      setProfileSuccess(false);

      const token = await getToken();

      let stampUrl = profile.stampUrl;
      if (stampFile) {
        stampUrl = await uploadStamp() || undefined;
      }

      let logo = profile.logo;
      if (logoFile) {
        logo = await uploadLogo() || undefined;
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
        logo: logo || undefined,
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
        logo: updated.logo || "",
      });

      if (updated.stampUrl) setStampPreview(updated.stampUrl);
      if (updated.logo) setLogoPreview(updated.logo);

      setStampFile(null);
      setLogoFile(null);
      setProfileSuccess(true);
    } catch (error) {
      console.error("Error saving profile:", error);
      setProfileError(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canEditSettings && !isOwner) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">View Only</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to edit company profile settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Company Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>Basic company information and registration</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-2">
              <Phone className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How people can reach your company</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-100 p-2">
              <ImageIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Visual assets for documents and resolutions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Company Logo */}
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h4 className="font-medium">Company Logo</h4>
                <p className="text-sm text-muted-foreground">
                  Used in official documents and PDF exports
                </p>
              </div>
              <div className="flex items-start gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border bg-white">
                      <img
                        src={logoPreview}
                        alt="Company logo preview"
                        className="h-full w-full object-contain p-2"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6"
                      onClick={clearLogo}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-20 w-32 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Label htmlFor="logo" className="cursor-pointer">
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                      <Upload className="h-4 w-4" />
                      {logoPreview ? "Change" : "Upload"}
                    </div>
                  </Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoFileChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, SVG. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Company Stamp */}
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h4 className="font-medium">Company Stamp</h4>
                <p className="text-sm text-muted-foreground">
                  Used in official resolutions and documents
                </p>
              </div>
              <div className="flex items-start gap-4">
                {stampPreview ? (
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-muted">
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
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                    <Stamp className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Label htmlFor="stamp" className="cursor-pointer">
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                      <Upload className="h-4 w-4" />
                      {stampPreview ? "Change" : "Upload"}
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
                    PNG, JPG, GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveProfile}
          disabled={isSavingProfile || isUploadingStamp || isUploadingLogo}
          size="lg"
        >
          {(isSavingProfile || isUploadingStamp || isUploadingLogo) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
