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
import { Vote, Plus, Loader2, CheckCircle2, Clock, XCircle, ScrollText, MoreHorizontal, FileText, Trash2, Calendar } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { usePermission } from "@/lib/permissions";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type ResolutionStatus = "DRAFT" | "PROPOSED" | "PASSED" | "REJECTED" | "TABLED";
type ResolutionCategory = "FINANCIAL" | "GOVERNANCE" | "HR" | "OPERATIONS" | "STRATEGIC" | "OTHER";

interface Resolution {
  id: string;
  companyId: string;
  number: string;
  title: string;
  content: string;
  category: ResolutionCategory;
  status: ResolutionStatus;
  effectiveDate: string | null;
  createdAt: string;
  updatedAt: string;
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
  const { getToken } = useAuth();
  const params = useParams();
  const companyId = params.companyId as string;

  const canCreate = usePermission("resolutions.create");
  const canEdit = usePermission("resolutions.edit");
  const canDelete = usePermission("resolutions.delete");
  const canChangeStatus = usePermission("resolutions.change_status");

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
                  onClick={() => {
                    setSelectedResolution(resolution);
                    setViewDialogOpen(true);
                  }}
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
                    {(canChangeStatus || (canDelete && resolution.status === "DRAFT")) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
        <DialogContent className="max-w-2xl">
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
              <div className="py-4">
                <h4 className="font-medium mb-2">Resolution Content</h4>
                <div className="rounded-lg border bg-muted/50 p-4 whitespace-pre-wrap text-sm">
                  {selectedResolution.content}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
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
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
