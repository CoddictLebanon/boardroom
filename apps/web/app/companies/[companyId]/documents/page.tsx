"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  FolderOpen,
  FolderPlus,
  Upload,
  Download,
  Loader2,
  ChevronRight,
  Home,
  MoreHorizontal,
  Pencil,
  Trash2,
  Folder,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { usePermission } from "@/lib/permissions";

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
  folderId: string | null;
  createdAt: string;
  uploader: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface FolderType {
  id: string;
  name: string;
  parentId: string | null;
  parent: FolderType | null;
  children: FolderType[];
  _count: {
    documents: number;
  };
}

export default function DocumentsPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const companyId = params.companyId as string;

  const canUpload = usePermission("documents.upload");
  const canDelete = usePermission("documents.delete");

  // Data state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Upload dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("GENERAL");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Folder dialog state
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Edit folder dialog state
  const [editFolderDialogOpen, setEditFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [isUpdatingFolder, setIsUpdatingFolder] = useState(false);

  // Delete confirmation state
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  // Computed: current folder and breadcrumb path
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return folders.find((f) => f.id === currentFolderId) || null;
  }, [currentFolderId, folders]);

  const breadcrumbPath = useMemo(() => {
    const path: FolderType[] = [];
    let folder = currentFolder;
    while (folder) {
      path.unshift(folder);
      folder = folder.parentId ? folders.find((f) => f.id === folder!.parentId) || null : null;
    }
    return path;
  }, [currentFolder, folders]);

  // Computed: folders in current directory
  const currentFolders = useMemo(() => {
    return folders.filter((f) => f.parentId === currentFolderId);
  }, [folders, currentFolderId]);

  // Computed: documents in current directory
  const currentDocuments = useMemo(() => {
    return documents.filter((d) => d.folderId === currentFolderId);
  }, [documents, currentFolderId]);

  const fetchDocuments = async (showLoading = true) => {
    try {
      if (showLoading) setIsInitialLoading(true);
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
      if (showLoading) setIsInitialLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/folders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsInitialLoading(true);
      await Promise.all([fetchDocuments(false), fetchFolders()]);
      setIsInitialLoading(false);
    };
    loadData();
  }, [companyId]);

  const resetUploadForm = () => {
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
      if (currentFolderId) {
        formData.append("folderId", currentFolderId);
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

      const uploadedDoc = await response.json();
      setDocuments((prev) => [uploadedDoc, ...prev]);

      resetUploadForm();
      setDialogOpen(false);

      // Refresh both documents and folders to update counts
      fetchDocuments(false);
      fetchFolders();
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Failed to upload document. Please try again.");
      fetchDocuments(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;

    try {
      setIsCreatingFolder(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies/${companyId}/folders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: folderName.trim(),
          parentId: currentFolderId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create folder");
      }

      const newFolder = await response.json();
      setFolders((prev) => [...prev, newFolder]);

      setFolderName("");
      setFolderDialogOpen(false);
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Failed to create folder. Please try again.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUpdateFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) return;

    try {
      setIsUpdatingFolder(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies/${companyId}/folders/${editingFolder.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editFolderName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update folder");
      }

      const updatedFolder = await response.json();
      setFolders((prev) =>
        prev.map((f) => (f.id === updatedFolder.id ? { ...f, name: updatedFolder.name } : f))
      );

      setEditFolderDialogOpen(false);
      setEditingFolder(null);
      setEditFolderName("");
    } catch (error) {
      console.error("Error updating folder:", error);
      alert("Failed to update folder. Please try again.");
    } finally {
      setIsUpdatingFolder(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolderId) return;

    try {
      setIsDeletingFolder(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies/${companyId}/folders/${deletingFolderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete folder");
      }

      setFolders((prev) => prev.filter((f) => f.id !== deletingFolderId));
      setDeleteFolderConfirm(false);
      setDeletingFolderId(null);
    } catch (error) {
      console.error("Error deleting folder:", error);
      alert(error instanceof Error ? error.message : "Failed to delete folder. Please try again.");
    } finally {
      setIsDeletingFolder(false);
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/documents/${documentId}/download`, {
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

  const openEditFolder = (folder: FolderType) => {
    setEditingFolder(folder);
    setEditFolderName(folder.name);
    setEditFolderDialogOpen(true);
  };

  const openDeleteFolder = (folderId: string) => {
    setDeletingFolderId(folderId);
    setDeleteFolderConfirm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Manage board documents and files</p>
        </div>
        <div className="flex gap-2">
          {canUpload && (
            <>
              <Button variant="outline" onClick={() => setFolderDialogOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1 text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => setCurrentFolderId(null)}
        >
          <Home className="h-4 w-4" />
        </Button>
        {breadcrumbPath.map((folder, index) => (
          <div key={folder.id} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setCurrentFolderId(folder.id)}
            >
              {folder.name}
            </Button>
          </div>
        ))}
      </div>

      {isInitialLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Folders Grid */}
          {currentFolders.length > 0 && (
            <div className="grid gap-4 md:grid-cols-4">
              {currentFolders.map((folder) => (
                <Card
                  key={folder.id}
                  className="cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <CardContent className="flex items-center gap-4 pt-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                      <Folder className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{folder.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {folder._count?.documents || 0} files
                        {folder.children?.length > 0 && `, ${folder.children.length} folders`}
                      </p>
                    </div>
                    {canDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => openEditFolder(folder)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => openDeleteFolder(folder.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Documents List */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-100 p-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>
                    {currentFolder ? `Documents in ${currentFolder.name}` : "All Documents"}
                  </CardTitle>
                  <CardDescription>
                    {currentDocuments.length} document{currentDocuments.length !== 1 ? "s" : ""}
                    {!currentFolderId && " at root level"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {currentDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-blue-50 p-4">
                    <FileText className="h-10 w-10 text-blue-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No documents here</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {currentFolder
                      ? `Upload documents to ${currentFolder.name}`
                      : "Upload your first document or navigate to a folder."}
                  </p>
                  {canUpload && (
                    <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {currentDocuments.map((doc) => {
                    const iconStyle = getDocumentIcon(doc.type);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconStyle.bg}`}
                          >
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
                          <Button size="sm" variant="ghost" onClick={() => handleDownload(doc.id)}>
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
        </>
      )}

      {/* Upload Document Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetUploadForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document{currentFolder ? ` to ${currentFolder.name}` : ""}.
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

      {/* Create Folder Dialog */}
      <Dialog
        open={folderDialogOpen}
        onOpenChange={(open) => {
          setFolderDialogOpen(open);
          if (!open) setFolderName("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              Create a new folder{currentFolder ? ` inside ${currentFolder.name}` : " at root level"}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                placeholder="e.g., Board Meetings 2025"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && folderName.trim()) {
                    handleCreateFolder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)} disabled={isCreatingFolder}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={isCreatingFolder || !folderName.trim()}>
              {isCreatingFolder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog
        open={editFolderDialogOpen}
        onOpenChange={(open) => {
          setEditFolderDialogOpen(open);
          if (!open) {
            setEditingFolder(null);
            setEditFolderName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>Enter a new name for this folder.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editFolderName">Folder Name</Label>
              <Input
                id="editFolderName"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editFolderName.trim()) {
                    handleUpdateFolder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFolderDialogOpen(false)} disabled={isUpdatingFolder}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFolder} disabled={isUpdatingFolder || !editFolderName.trim()}>
              {isUpdatingFolder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <AlertDialog open={deleteFolderConfirm} onOpenChange={setDeleteFolderConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This folder will be permanently deleted. Make sure it's empty (no documents or subfolders) before
              deleting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingFolderId(null)} disabled={isDeletingFolder}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingFolder}
            >
              {isDeletingFolder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
