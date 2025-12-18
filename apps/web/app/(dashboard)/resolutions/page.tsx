"use client";

import { useState } from "react";
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
import { Vote, Plus, FileText, Loader2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useCurrentCompany } from "@/lib/hooks/use-current-company";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type ResolutionCategory = "FINANCIAL" | "GOVERNANCE" | "HR" | "OPERATIONS" | "STRATEGIC" | "OTHER";

export default function ResolutionsPage() {
  const { getToken } = useAuth();
  const { currentCompany } = useCurrentCompany();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<ResolutionCategory>("GOVERNANCE");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("GOVERNANCE");
    setEffectiveDate("");
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !currentCompany) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies/${currentCompany.id}/resolutions`, {
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
        throw new Error("Failed to create resolution");
      }

      resetForm();
      setDialogOpen(false);
      // TODO: Refresh resolutions list
    } catch (error) {
      console.error("Error creating resolution:", error);
      alert("Failed to create resolution. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Resolution
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Resolutions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">20</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">1</div>
          </CardContent>
        </Card>
      </div>

      {/* Resolutions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Resolutions</CardTitle>
          <CardDescription>Complete resolution register</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <Vote className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium">RES-2024-024: Approve 2025 Budget</h4>
                  <p className="text-sm text-muted-foreground">
                    Category: Financial | Passed: Dec 15, 2024
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Passed</Badge>
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                  <Vote className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium">RES-2024-025: Board Committee Structure</h4>
                  <p className="text-sm text-muted-foreground">
                    Category: Governance | Proposed: Dec 10, 2024
                  </p>
                </div>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800">Proposed</Badge>
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-medium">RES-2024-026: Executive Compensation</h4>
                  <p className="text-sm text-muted-foreground">
                    Category: HR | Draft
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Draft</Badge>
            </div>
          </div>
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
              Create a new board resolution.
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
                placeholder="BE IT RESOLVED that..."
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
    </div>
  );
}
