"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, Plus, FileText } from "lucide-react";

export default function ResolutionsPage() {
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
        <Button>
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
    </div>
  );
}
