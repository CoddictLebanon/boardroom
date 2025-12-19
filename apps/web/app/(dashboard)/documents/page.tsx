"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FolderOpen, Plus, Upload, Download } from "lucide-react";

export default function DocumentsPage() {
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
        <Button>
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
              <p className="text-sm text-muted-foreground">12 files</p>
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
              <p className="text-sm text-muted-foreground">8 files</p>
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
              <p className="text-sm text-muted-foreground">5 files</p>
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
              <p className="text-sm text-muted-foreground">3 files</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
          <CardDescription>Recently uploaded and modified files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-medium">Q4 Financial Report.pdf</h4>
                  <p className="text-sm text-muted-foreground">
                    Uploaded by Sarah • Dec 15, 2024
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">Board Meeting Minutes - Dec 2024.docx</h4>
                  <p className="text-sm text-muted-foreground">
                    Uploaded by John • Dec 12, 2024
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium">2025 Budget Proposal.xlsx</h4>
                  <p className="text-sm text-muted-foreground">
                    Uploaded by Mike • Dec 10, 2024
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
