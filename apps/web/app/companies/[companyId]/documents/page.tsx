"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import { FileText, FolderOpen, Upload, Download, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type DocumentType = "MEETING" | "FINANCIAL" | "GOVERNANCE" | "GENERAL";

interface Document {
  id: string;
  name: string;
  description: string | null;
  type: DocumentType;
  mimeType: string | null;
  size: number | null;
  storageKey: string;
  createdAt: string;
  uploader: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export default function DocumentsPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const companyId = params.companyId as string;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("GENERAL");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [companyId]);

  const resetForm = () => {
    setDocumentName("");
    setDocumentDescription("");
    setDocumentType("GENERAL");
    setDocumentFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      if (!documentName) {
        setDocumentName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!documentFile || !documentName.trim()) return;

    try {
      setIsUploading(true);
      const token = await getToken();

      const formData = new FormData();
      formData.append("file", documentFile);
      formData.append("name", documentName.trim());
      formData.append("type", documentType);
      if (documentDescription.trim()) {
        formData.append("description", documentDescription.trim());
      }

      const response = await fetch(`${API_URL}/companies/${companyId}/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload document");
      }

      resetForm();
      setDialogOpen(false);
      fetchDocuments(); // Refresh the list
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Failed to upload document. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/documents/${documentId}/download?companyId=${companyId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.open(data.url, "_blank");
        }
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document. Please try again.");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getDocumentIcon = (type: DocumentType) => {
    const colors: Record<DocumentType, { bg: string; text: string }> = {
      MEETING: { bg: "bg-blue-100", text: "text-blue-600" },
      FINANCIAL: { bg: "bg-green-100", text: "text-green-600" },
      GOVERNANCE: { bg: "bg-purple-100", text: "text-purple-600" },
      GENERAL: { bg: "bg-gray-100", text: "text-gray-600" },
    };
    return colors[type] || colors.GENERAL;
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    const labels: Record<DocumentType, string> = {
      MEETING: "Meeting",
      FINANCIAL: "Financial",
      GOVERNANCE: "Governance",
      GENERAL: "General",
    };
    return labels[type] || type;
  };

  // Count documents by type
  const documentCounts = {
    MEETING: documents.filter((d) => d.type === "MEETING").length,
    FINANCIAL: documents.filter((d) => d.type === "FINANCIAL").length,
    GOVERNANCE: documents.filter((d) => d.type === "GOVERNANCE").length,
    GENERAL: documents.filter((d) => d.type === "GENERAL").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Manage board documents and files
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Folders */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">Meetings</h3>
              <p className="text-sm text-muted-foreground">{documentCounts.MEETING} files</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <FolderOpen className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">Financials</h3>
              <p className="text-sm text-muted-foreground">{documentCounts.FINANCIAL} files</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <FolderOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium">Governance</h3>
              <p className="text-sm text-muted-foreground">{documentCounts.GOVERNANCE} files</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
              <FolderOpen className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium">General</h3>
              <p className="text-sm text-muted-foreground">{documentCounts.GENERAL} files</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Recent Documents</CardTitle>
              <CardDescription>Recently uploaded and modified files</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-blue-50 p-4">
                <FileText className="h-10 w-10 text-blue-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No documents yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload your first document to get started.
              </p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const iconStyle = getDocumentIcon(doc.type);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconStyle.bg}`}>
                        <FileText className={`h-5 w-5 ${iconStyle.text}`} />
                      </div>
                      <div>
                        <h4 className="font-medium">{doc.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatFileSize(doc.size)}</span>
                          <span>•</span>
                          <span>{format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
                          <span>•</span>
                          <span>
                            {doc.uploader.firstName} {doc.uploader.lastName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{getDocumentTypeLabel(doc.type)}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(doc.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Document Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document to your company library.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {documentFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {documentFile.name} ({(documentFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Document Name</Label>
              <Input
                id="name"
                placeholder="e.g., Q4 Financial Report"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Document Type</Label>
              <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                  <SelectItem value="FINANCIAL">Financial</SelectItem>
                  <SelectItem value="GOVERNANCE">Governance</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description..."
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading || !documentFile || !documentName.trim()}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
