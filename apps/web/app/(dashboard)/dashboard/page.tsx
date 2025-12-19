"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckSquare,
  FileText,
  Users,
  Plus,
  ArrowRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useCurrentCompany } from "@/lib/hooks/use-current-company";

export default function DashboardPage() {
  const { currentCompany } = useCurrentCompany();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back
          </h1>
          <p className="text-muted-foreground">
            {currentCompany
              ? `Here's what's happening with ${currentCompany.name}`
              : "Select a company to get started"}
          </p>
        </div>
        <Button asChild>
          <Link href="/meetings/new">
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Next: Tomorrow at 10:00 AM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Action Items</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">4 due this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Resolutions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Board Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">All active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Meetings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Meetings</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/meetings">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardDescription>Your next scheduled board meetings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sample meetings - will be replaced with real data */}
            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <h4 className="font-medium">Q4 Board Review</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Dec 20, 2024 at 10:00 AM</span>
                </div>
              </div>
              <Badge>Scheduled</Badge>
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <h4 className="font-medium">Budget Planning 2025</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Dec 28, 2024 at 2:00 PM</span>
                </div>
              </div>
              <Badge>Scheduled</Badge>
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <h4 className="font-medium">Annual General Meeting</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Jan 15, 2025 at 9:00 AM</span>
                </div>
              </div>
              <Badge variant="secondary">Upcoming</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Action Items</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/action-items">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardDescription>Tasks assigned to you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sample action items - will be replaced with real data */}
            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <h4 className="font-medium">Review Q3 Financial Report</h4>
                </div>
                <p className="text-sm text-muted-foreground">Due: Dec 18, 2024</p>
              </div>
              <Badge variant="destructive">Overdue</Badge>
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <h4 className="font-medium">Prepare Board Presentation</h4>
                <p className="text-sm text-muted-foreground">Due: Dec 19, 2024</p>
              </div>
              <Badge variant="outline">In Progress</Badge>
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <h4 className="font-medium">Update Company Policies</h4>
                <p className="text-sm text-muted-foreground">Due: Dec 25, 2024</p>
              </div>
              <Badge variant="secondary">Pending</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates across your company</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <CheckSquare className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Action item completed</p>
                <p className="text-xs text-muted-foreground">
                  John completed "Draft meeting agenda" - 2 hours ago
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">New document uploaded</p>
                <p className="text-xs text-muted-foreground">
                  Sarah uploaded "Q4 Financial Report.pdf" - 5 hours ago
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Meeting scheduled</p>
                <p className="text-xs text-muted-foreground">
                  Q4 Board Review scheduled for Dec 20, 2024 - Yesterday
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
