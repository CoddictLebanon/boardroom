"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Vote, Plus, Loader2, CheckCircle2, Clock, XCircle, ScrollText, MoreHorizontal, FileText, Trash2, Calendar, PenTool, Users, AlertCircle, Download, Copy } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { ResolutionPDF } from "@/components/resolution-pdf";
import type { CompanyForPDF, ResolutionSignatureForPDF } from "@/lib/types";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { usePermission } from "@/lib/permissions";
import { SignerSelector } from "@/components/signer-selector";
import { SigningStatus } from "@/components/signing-status";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type ResolutionStatus = "DRAFT" | "PROPOSED" | "PASSED" | "REJECTED" | "TABLED";
type ResolutionCategory = "FINANCIAL" | "GOVERNANCE" | "HR" | "OPERATIONS" | "STRATEGIC" | "OTHER";

interface Signature {
  id: string;
  userId: string;
  status: "PENDING" | "SIGNED" | "DECLINED";
  signedAt: string | null;
  order: number;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl?: string | null;
    signatureUrl?: string | null;
  };
}

interface Resolution {
  id: string;
  companyId: string;
  number: string;
  title: string;
  content: string;
  category: ResolutionCategory;
  status: ResolutionStatus;
  effectiveDate: string | null;
  includeStamp?: boolean;
  createdAt: string;
  updatedAt: string;
  signatures?: Signature[];
}

interface CompanyMember {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl?: string | null;
  };
  title?: string | null;
}

const statusColors: Record<ResolutionStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PROPOSED: "bg-blue-100 text-blue-800",
  PASSED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  TABLED: "bg-amber-100 text-amber-800",
};

const categoryLabels: Record<ResolutionCategory, string> = {
  FINANCIAL: "Financial",
  GOVERNANCE: "Governance",
  HR: "HR",
  OPERATIONS: "Operations",
  STRATEGIC: "Strategic",
  OTHER: "Other",
};

export default function ResolutionsPage() {
  const { getToken, userId } = useAuth();
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  const canCreate = usePermission("resolutions.create");
  const canEdit = usePermission("resolutions.edit");
  const canDelete = usePermission("resolutions.delete");
  const canChangeStatus = usePermission("resolutions.change_status");
  const canSign = usePermission("resolutions.sign");
  const canManageSigners = usePermission("resolutions.manage_signers");
  const canDownloadPdf = usePermission("resolutions.download_pdf");

  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<ResolutionCategory>("GOVERNANCE");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Signature management state
  const [signerDialogOpen, setSignerDialogOpen] = useState(false);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [selectedSigners, setSelectedSigners] = useState<string[]>([]);
  const [includeStamp, setIncludeStamp] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSavingSigners, setIsSavingSigners] = useState(false);
  const [isSigningResolution, setIsSigningResolution] = useState(false);
  const [userSignatureUrl, setUserSignatureUrl] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<CompanyForPDF | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const fetchResolutions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsInitialLoading(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/resolutions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResolutions(data);
      }
    } catch (error) {
      console.error("Error fetching resolutions:", error);
    } finally {
      if (showLoading) setIsInitialLoading(false);
    }
  }, [companyId, getToken]);

  useEffect(() => {
    fetchResolutions();
  }, [fetchResolutions]);

  // Fetch user signature URL on mount
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

  const fetchMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const company = await res.json();
        setMembers(company.members || []);
        // Store company data for PDF generation
        setCompanyData({
          name: company.name,
          logo: company.logo || undefined,
          address: company.address || undefined,
          city: company.city || undefined,
          country: company.country || undefined,
          registrationNo: company.registrationNo || undefined,
          phone: company.phone || undefined,
          website: company.website || undefined,
          stampUrl: company.stampUrl || undefined,
        });
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const fetchCompanyData = async (): Promise<CompanyForPDF | null> => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const company = await res.json();
        const data: CompanyForPDF = {
          name: company.name,
          logo: company.logo || undefined,
          address: company.address || undefined,
          city: company.city || undefined,
          country: company.country || undefined,
          registrationNo: company.registrationNo || undefined,
          phone: company.phone || undefined,
          website: company.website || undefined,
          stampUrl: company.stampUrl || undefined,
        };
        setCompanyData(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
    }
    return null;
  };

  const fetchResolutionDetails = async (resolutionId: string): Promise<Resolution | null> => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/companies/${companyId}/resolutions/${resolutionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (error) {
      console.error("Error fetching resolution details:", error);
    }
    return null;
  };

  const handleOpenResolution = async (resolution: Resolution) => {
    // Fetch full resolution details including signatures
    const details = await fetchResolutionDetails(resolution.id);
    setSelectedResolution(details || resolution);
    setViewDialogOpen(true);
  };

  const handleOpenSignerDialog = async () => {
    // Capture current value to avoid stale state after async operations
    const resolution = selectedResolution;
    if (!resolution) return;

    await fetchMembers();
    // Pre-populate selected signers from current resolution signatures
    if (resolution.signatures) {
      setSelectedSigners(resolution.signatures.map(s => s.user.id));
    } else {
      setSelectedSigners([]);
    }
    setIncludeStamp(resolution.includeStamp || false);
    setSignerDialogOpen(true);
  };

  const handleSaveSigners = async () => {
    if (!selectedResolution) return;

    try {
      setIsSavingSigners(true);
      const token = await getToken();

      // First, remove any signers that are no longer selected
      const currentSignerIds = selectedResolution.signatures?.map(s => s.user.id) || [];
      const signersToRemove = currentSignerIds.filter(id => !selectedSigners.includes(id));

      for (const signerUserId of signersToRemove) {
        const response = await fetch(`${API_URL}/companies/${companyId}/resolutions/${selectedResolution.id}/signers/${signerUserId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("Failed to remove signer");
        }
      }

      // Add new signers or update includeStamp setting
      // Note: The backend's addSigners method handles empty signers array correctly
      // since it uses createMany with skipDuplicates, so we can safely call this
      // even when only includeStamp has changed
      const signersToAdd = selectedSigners.filter(id => !currentSignerIds.includes(id));
      if (signersToAdd.length > 0 || includeStamp !== selectedResolution.includeStamp) {
        const response = await fetch(`${API_URL}/companies/${companyId}/resolutions/${selectedResolution.id}/signers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            signers: signersToAdd.map((userId, index) => ({ userId, order: currentSignerIds.length + index })),
            includeStamp,
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to add signers");
        }
      }

      // Refresh resolution details
      const updatedResolution = await fetchResolutionDetails(selectedResolution.id);
      if (updatedResolution) {
        setSelectedResolution(updatedResolution);
      }

      setSignerDialogOpen(false);
    } catch (error) {
      console.error("Error saving signers:", error);
      alert("Failed to save signers. Please try again.");
    } finally {
      setIsSavingSigners(false);
    }
  };

  const handleSignResolution = async () => {
    if (!selectedResolution) return;

    if (!userSignatureUrl) {
      alert("Please upload your signature in Settings before signing resolutions.");
      router.push(`/companies/${companyId}/settings`);
      return;
    }

    try {
      setIsSigningResolution(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies/${companyId}/resolutions/${selectedResolution.id}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to sign resolution");
      }

      // Refresh resolution details
      const updatedResolution = await fetchResolutionDetails(selectedResolution.id);
      if (updatedResolution) {
        setSelectedResolution(updatedResolution);
      }
    } catch (error) {
      console.error("Error signing resolution:", error);
      alert(error instanceof Error ? error.message : "Failed to sign resolution. Please try again.");
    } finally {
      setIsSigningResolution(false);
    }
  };

  // Check if current user is a pending signer
  const isCurrentUserPendingSigner = selectedResolution?.signatures?.some(
    s => s.user.id === userId && s.status === "PENDING"
  );

  const downloadPDF = async () => {
    if (!selectedResolution) return;

    try {
      setIsGeneratingPDF(true);

      // Check for pending signatures and warn user
      const pendingCount = selectedResolution.signatures?.filter(
        s => s.status === "PENDING"
      ).length || 0;

      if (pendingCount > 0) {
        const proceed = confirm(
          `${pendingCount} signature(s) still pending. Only signed signatures will appear in the PDF. Continue?`
        );
        if (!proceed) {
          setIsGeneratingPDF(false);
          return;
        }
      }

      // Ensure we have company data
      let company = companyData;
      if (!company) {
        company = await fetchCompanyData();
        if (!company) {
          throw new Error("Failed to fetch company data");
        }
      }

      // Ensure members are loaded for title mapping
      let currentMembers = members;
      if (currentMembers.length === 0) {
        await fetchMembers();
        // fetchMembers updates state, but we need the value now
        // Re-fetch company data which includes members
        const token = await getToken();
        const res = await fetch(`${API_URL}/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const companyResponse = await res.json();
          currentMembers = companyResponse.members || [];
        }
      }

      // Map signatures to the format expected by ResolutionPDF
      const signatures: ResolutionSignatureForPDF[] = selectedResolution.signatures
        ?.filter(sig => sig.status === "SIGNED")
        .map(sig => {
          const member = currentMembers.find(m => m.user.id === sig.userId);
          return {
            user: {
              firstName: sig.user.firstName || "",
              lastName: sig.user.lastName || "",
              signatureUrl: sig.user.signatureUrl || undefined,
            },
            signedAt: sig.signedAt || undefined,
            title: member?.title || undefined,
          };
        }) || [];

      const blob = await pdf(
        <ResolutionPDF
          resolution={{
            number: selectedResolution.number,
            title: selectedResolution.title,
            content: selectedResolution.content,
            category: selectedResolution.category,
            effectiveDate: selectedResolution.effectiveDate,
            createdAt: selectedResolution.createdAt,
          }}
          company={company}
          signatures={signatures}
          includeStamp={selectedResolution.includeStamp}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedResolution.number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("GOVERNANCE");
    setEffectiveDate("");
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies/${companyId}/resolutions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          effectiveDate: effectiveDate || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create resolution");
      }

      // Optimistic update - add to list immediately
      const createdResolution = await response.json();
      setResolutions((prev) => [createdResolution, ...prev]);

      resetForm();
      setDialogOpen(false);

      // Background refresh
      fetchResolutions(false);
    } catch (error) {
      console.error("Error creating resolution:", error);
      alert(error instanceof Error ? error.message : "Failed to create resolution. Please try again.");
      fetchResolutions(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (resolutionId: string, newStatus: ResolutionStatus) => {
    // Optimistic update
    setResolutions((prev) =>
      prev.map((r) => (r.id === resolutionId ? { ...r, status: newStatus } : r))
    );

    // Update selected resolution if viewing
    if (selectedResolution?.id === resolutionId) {
      setSelectedResolution((prev) => prev ? { ...prev, status: newStatus } : null);
    }

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/resolutions/${resolutionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update resolution");
      }

      // Background refresh
      fetchResolutions(false);
    } catch (error) {
      console.error("Error updating resolution:", error);
      alert("Failed to update resolution status. Please try again.");
      fetchResolutions(false);
    }
  };

  const handleDelete = async (resolutionId: string) => {
    if (!confirm("Are you sure you want to delete this resolution?")) return;

    // Optimistic update - remove from list immediately
    setResolutions((prev) => prev.filter((r) => r.id !== resolutionId));

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/resolutions/${resolutionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete resolution");
      }

      // Background refresh
      fetchResolutions(false);
    } catch (error) {
      console.error("Error deleting resolution:", error);
      alert("Failed to delete resolution. Please try again.");
      fetchResolutions(false);
    }
  };

  const handleDuplicate = async (resolutionId: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        `${API_URL}/companies/${companyId}/resolutions/${resolutionId}/duplicate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to duplicate resolution");
      }

      const newResolution = await response.json();
      router.push(`/companies/${companyId}/resolutions/${newResolution.id}`);
    } catch (error) {
      console.error("Error duplicating resolution:", error);
      alert("Failed to duplicate resolution. Please try again.");
    }
  };

  // Calculate stats
  const totalCount = resolutions.length;
  const passedCount = resolutions.filter((r) => r.status === "PASSED").length;
  const pendingCount = resolutions.filter((r) => r.status === "DRAFT" || r.status === "PROPOSED").length;
  const rejectedCount = resolutions.filter((r) => r.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resolutions</h1>
          <p className="text-muted-foreground">
            Board resolutions and their status
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Resolution
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resolutions</CardTitle>
            <div className="rounded-full bg-purple-100 p-2">
              <ScrollText className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount || "-"}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <div className="rounded-full bg-emerald-100 p-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passedCount || "-"}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="rounded-full bg-amber-100 p-2">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount || "-"}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <div className="rounded-full bg-red-100 p-2">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount || "-"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Resolutions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-100 p-2">
              <Vote className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>All Resolutions</CardTitle>
              <CardDescription>Complete resolution register</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isInitialLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : resolutions.length > 0 ? (
            <div className="space-y-3">
              {resolutions.map((resolution) => (
                <div
                  key={resolution.id}
                  className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleOpenResolution(resolution)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="rounded-lg bg-purple-100 p-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground">{resolution.number}</span>
                        <p className="font-medium truncate">{resolution.title}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[resolution.category]}
                        </Badge>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(resolution.createdAt), "MMM d, yyyy")}</span>
                        {resolution.effectiveDate && (
                          <>
                            <span>•</span>
                            <span>Effective: {format(new Date(resolution.effectiveDate), "MMM d, yyyy")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColors[resolution.status]}>
                      {resolution.status}
                    </Badge>
                    {(canCreate || canChangeStatus || (canDelete && resolution.status === "DRAFT")) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canCreate && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(resolution.id);
                            }}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                          )}
                          {canChangeStatus && resolution.status === "DRAFT" && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(resolution.id, "PROPOSED");
                            }}>
                              <Clock className="mr-2 h-4 w-4" />
                              Propose
                            </DropdownMenuItem>
                          )}
                          {canChangeStatus && (resolution.status === "DRAFT" || resolution.status === "PROPOSED") && (
                            <>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(resolution.id, "PASSED");
                              }}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                Mark as Passed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(resolution.id, "REJECTED");
                              }}>
                                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                Mark as Rejected
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(resolution.id, "TABLED");
                              }}>
                                <Clock className="mr-2 h-4 w-4 text-amber-600" />
                                Table for Later
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDelete && resolution.status === "DRAFT" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(resolution.id);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-purple-50 p-4">
                <Vote className="h-10 w-10 text-purple-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No resolutions yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first board resolution to get started.
              </p>
              {canCreate && (
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Resolution
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Resolution Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Resolution</DialogTitle>
            <DialogDescription>
              Create a new board resolution. It will start as a Draft.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Approve 2025 Budget"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Resolution Content</Label>
              <Textarea
                id="content"
                placeholder="BE IT RESOLVED that the Board of Directors hereby approves..."
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ResolutionCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FINANCIAL">Financial</SelectItem>
                    <SelectItem value="GOVERNANCE">Governance</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="OPERATIONS">Operations</SelectItem>
                    <SelectItem value="STRATEGIC">Strategic</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="effective-date">Effective Date (optional)</Label>
                <Input
                  id="effective-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim() || !content.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Resolution Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedResolution && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-muted-foreground">{selectedResolution.number}</span>
                  <Badge className={statusColors[selectedResolution.status]}>
                    {selectedResolution.status}
                  </Badge>
                </div>
                <DialogTitle className="text-xl">{selectedResolution.title}</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="outline">{categoryLabels[selectedResolution.category]}</Badge>
                    <span>Created: {format(new Date(selectedResolution.createdAt), "MMMM d, yyyy")}</span>
                    {selectedResolution.effectiveDate && (
                      <span>Effective: {format(new Date(selectedResolution.effectiveDate), "MMMM d, yyyy")}</span>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Resolution Content</h4>
                  <div className="rounded-lg border bg-muted/50 p-4 whitespace-pre-wrap text-sm">
                    {selectedResolution.content}
                  </div>
                </div>

                {/* Signatures Section */}
                {selectedResolution.signatures && selectedResolution.signatures.length > 0 && (
                  <div>
                    <Separator className="my-4" />
                    <SigningStatus signatures={selectedResolution.signatures} />
                    {selectedResolution.includeStamp && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Company stamp will be included on the signed document
                      </p>
                    )}
                  </div>
                )}

                {/* User needs to upload signature message */}
                {isCurrentUserPendingSigner && !userSignatureUrl && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Signature Required</p>
                        <p className="text-sm text-amber-700">
                          You need to upload your signature before you can sign this resolution.{" "}
                          <button
                            onClick={() => router.push(`/companies/${companyId}/settings`)}
                            className="underline hover:no-underline"
                          >
                            Go to Settings
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                    Close
                  </Button>

                  {/* Manage Signers Button - only for users with manage_signers permission and non-passed resolutions */}
                  {canManageSigners && selectedResolution.status !== "PASSED" && (
                    <Button variant="outline" onClick={handleOpenSignerDialog}>
                      <Users className="mr-2 h-4 w-4" />
                      Manage Signers
                    </Button>
                  )}

                  {/* Download PDF Button */}
                  {canDownloadPdf && (
                    <Button
                      variant="outline"
                      onClick={downloadPDF}
                      disabled={isGeneratingPDF}
                    >
                      {isGeneratingPDF ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download PDF
                    </Button>
                  )}
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  {/* Sign Resolution Button - only for users with sign permission who are pending signers */}
                  {canSign && isCurrentUserPendingSigner && (
                    <Button
                      onClick={handleSignResolution}
                      disabled={isSigningResolution || !userSignatureUrl}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isSigningResolution ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PenTool className="mr-2 h-4 w-4" />
                      )}
                      Sign Resolution
                    </Button>
                  )}

                  {canChangeStatus && (selectedResolution.status === "DRAFT" || selectedResolution.status === "PROPOSED") && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleUpdateStatus(selectedResolution.id, "PASSED");
                          setViewDialogOpen(false);
                        }}
                        className="border-green-500 text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Pass
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleUpdateStatus(selectedResolution.id, "REJECTED");
                          setViewDialogOpen(false);
                        }}
                        className="border-red-500 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Signers Dialog */}
      <Dialog open={signerDialogOpen} onOpenChange={setSignerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Signers</DialogTitle>
            <DialogDescription>
              Select the members who need to sign this resolution.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <SignerSelector
                  members={members}
                  selectedSigners={selectedSigners}
                  onChange={setSelectedSigners}
                />

                <Separator />

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-stamp"
                    checked={includeStamp}
                    onCheckedChange={(checked) => setIncludeStamp(checked === true)}
                  />
                  <label
                    htmlFor="include-stamp"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Include company stamp on signed document
                  </label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignerDialogOpen(false)} disabled={isSavingSigners}>
              Cancel
            </Button>
            <Button onClick={handleSaveSigners} disabled={isSavingSigners || isLoadingMembers}>
              {isSavingSigners && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Signers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
