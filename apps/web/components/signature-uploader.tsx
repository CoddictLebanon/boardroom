"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Loader2, X, PenTool } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface SignatureUploaderProps {
  currentSignatureUrl?: string | null;
  companyId: string;
  onUpdate?: (url: string | null) => void;
}

export function SignatureUploader({ currentSignatureUrl, companyId, onUpdate }: SignatureUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { getToken } = useAuth();

  // Initialize preview with current signature URL
  useEffect(() => {
    if (currentSignatureUrl) {
      setPreview(currentSignatureUrl);
    }
  }, [currentSignatureUrl]);

  // Cleanup blob URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timeoutId = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [success]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, or GIF)');
      return;
    }

    // Validate file size (max 2MB for signatures)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    // Revoke old blob URL before creating new one to prevent memory leak
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    setSignatureFile(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
    setSuccess(false);
  };

  const clearSignature = () => {
    // Revoke blob URL to prevent memory leak
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setSignatureFile(null);
    setPreview(null);
    setError(null);
  };

  const uploadSignatureFile = async (): Promise<string | null> => {
    if (!signatureFile) return preview;

    try {
      setIsUploading(true);
      const token = await getToken();

      const formData = new FormData();
      formData.append("file", signatureFile);
      formData.append("name", `user-signature-${Date.now()}`);
      formData.append("type", "GOVERNANCE");

      const response = await fetch(`${API_URL}/companies/${companyId}/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload signature file");
      }

      const doc = await response.json();

      // Get the download URL for the signature
      const downloadRes = await fetch(`${API_URL}/companies/${companyId}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (downloadRes.ok) {
        const { url } = await downloadRes.json();
        return url;
      }

      return doc.storageKey;
    } catch (err) {
      console.error("Error uploading signature:", err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      const token = await getToken();

      // Upload file if a new one was selected
      let signatureUrl = preview;
      if (signatureFile) {
        signatureUrl = await uploadSignatureFile();
      }

      // Update user signature via API
      const response = await fetch(`${API_URL}/users/me/signature`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ signatureUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to update signature');
      }

      setSignatureFile(null);
      setSuccess(true);
      onUpdate?.(signatureUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const token = await getToken();
      const response = await fetch(`${API_URL}/users/me/signature`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ signatureUrl: null }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove signature');
      }

      clearSignature();
      setSuccess(true);
      onUpdate?.(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove signature');
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnsavedChanges = signatureFile !== null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-violet-100 p-2">
            <PenTool className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <CardTitle>Your Signature</CardTitle>
            <CardDescription>
              Upload your signature image for signing resolutions and official documents
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error/Success messages */}
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-100 p-3 text-sm text-green-700">
            Signature saved successfully
          </div>
        )}

        <div className="flex items-start gap-4">
          {preview ? (
            <div className="relative">
              <div className="flex h-24 w-48 items-center justify-center overflow-hidden rounded-lg border bg-white">
                <img
                  src={preview}
                  alt="Your signature preview"
                  className="h-full w-full object-contain p-2"
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6"
                onClick={clearSignature}
                type="button"
                disabled={isSaving}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex h-24 w-48 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
              <PenTool className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 space-y-2">
            <Label htmlFor="signature-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted">
                <Upload className="h-4 w-4" />
                {preview ? "Change Signature" : "Upload Signature"}
              </div>
            </Label>
            <Input
              id="signature-upload"
              type="file"
              accept="image/png,image/jpeg,image/gif"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading || isSaving}
            />
            <p className="text-xs text-muted-foreground">
              PNG or JPG recommended. Transparent or white background works best. Max 2MB.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={isUploading || isSaving || !hasUnsavedChanges}
          >
            {(isUploading || isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Signature
          </Button>
          {preview && !hasUnsavedChanges && (
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remove Signature
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
