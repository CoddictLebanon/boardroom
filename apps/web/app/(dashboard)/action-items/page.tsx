"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ActionItemsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Action Items</h1>
          <p className="text-muted-foreground">
            Track and manage tasks assigned from meetings
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Action Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items List */}
      <Card>
        <CardHeader>
          <CardTitle>All Action Items</CardTitle>
          <CardDescription>Tasks requiring your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample items */}
            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-medium">Review Q3 Financial Report</h4>
                  <p className="text-sm text-muted-foreground">
                    From: Q3 Board Review Meeting
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: Dec 18, 2024
                    </span>
                    <span>Assigned to: You</span>
                  </div>
                </div>
              </div>
              <Badge variant="destructive">Overdue</Badge>
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                  <CheckSquare className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium">Prepare Board Presentation</h4>
                  <p className="text-sm text-muted-foreground">
                    From: Planning Session
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: Dec 19, 2024
                    </span>
                    <span>Assigned to: You</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline">In Progress</Badge>
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <CheckSquare className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-medium">Update Company Policies</h4>
                  <p className="text-sm text-muted-foreground">
                    From: Governance Review
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: Dec 25, 2024
                    </span>
                    <span>Assigned to: You</span>
                  </div>
                </div>
              </div>
              <Badge variant="secondary">Pending</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
