"use client";

import { useState, useEffect } from "react";
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
  Activity,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { format, formatDistanceToNow, isPast } from "date-fns";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface DashboardStats {
  upcomingMeetings: number;
  openActionItems: number;
  pendingResolutions: number;
  boardMembers: number;
}

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  location?: string;
  attendees?: Array<{
    id: string;
    member: {
      user: {
        id: string;
        firstName?: string;
        lastName?: string;
        imageUrl?: string;
      };
    };
  }>;
}

interface ActionItem {
  id: string;
  title: string;
  dueDate?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: string;
}

interface DashboardData {
  stats: DashboardStats;
  upcomingMeetings: Meeting[];
  userActionItems: ActionItem[];
}

const priorityColors = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-slate-100 text-slate-700",
};

export default function DashboardPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const { getToken } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoading(true);
        const token = await getToken();
        const response = await fetch(`${API_URL}/companies/${companyId}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const dashboardData = await response.json();
        setData(dashboardData);
        setError(null);
      } catch (err) {
        console.error("Error fetching dashboard:", err);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboard();
  }, [companyId, getToken]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const stats = data?.stats || {
    upcomingMeetings: 0,
    openActionItems: 0,
    pendingResolutions: 0,
    boardMembers: 0,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your company
          </p>
        </div>
        <Button asChild>
          <Link href={`/companies/${companyId}/meetings/new`}>
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <div className="rounded-full bg-blue-100 p-2">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingMeetings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.upcomingMeetings === 0
                ? "No meetings scheduled"
                : stats.upcomingMeetings === 1
                ? "Meeting scheduled"
                : "Meetings scheduled"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Action Items</CardTitle>
            <div className="rounded-full bg-amber-100 p-2">
              <CheckSquare className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openActionItems}</div>
            <p className="text-xs text-muted-foreground">
              {stats.openActionItems === 0
                ? "All tasks completed"
                : stats.openActionItems === 1
                ? "Task pending"
                : "Tasks pending"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Resolutions</CardTitle>
            <div className="rounded-full bg-purple-100 p-2">
              <FileText className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingResolutions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingResolutions === 0
                ? "No pending resolutions"
                : stats.pendingResolutions === 1
                ? "Awaiting approval"
                : "Awaiting approval"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Board Members</CardTitle>
            <div className="rounded-full bg-emerald-100 p-2">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.boardMembers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.boardMembers === 0
                ? "Invite members to get started"
                : stats.boardMembers === 1
                ? "Active member"
                : "Active members"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Meetings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle>Upcoming Meetings</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/companies/${companyId}/meetings`}>
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardDescription>Your next scheduled board meetings</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.upcomingMeetings && data.upcomingMeetings.length > 0 ? (
              <div className="space-y-4">
                {data.upcomingMeetings.map((meeting) => {
                  const scheduledDate = new Date(meeting.scheduledAt);
                  return (
                    <Link
                      key={meeting.id}
                      href={`/companies/${companyId}/meetings/${meeting.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center bg-slate-100 rounded-lg px-3 py-2 min-w-[50px]">
                        <span className="text-xs font-medium text-slate-500 uppercase">
                          {format(scheduledDate, "MMM")}
                        </span>
                        <span className="text-xl font-bold text-slate-900">
                          {format(scheduledDate, "d")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{meeting.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{format(scheduledDate, "h:mm a")}</span>
                          <span>•</span>
                          <span>{meeting.duration} min</span>
                        </div>
                      </div>
                      {meeting.attendees && meeting.attendees.length > 0 && (
                        <div className="flex -space-x-2">
                          {meeting.attendees.slice(0, 3).map((attendee) => (
                            <div
                              key={attendee.id}
                              className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                              title={`${attendee.member.user.firstName || ""} ${attendee.member.user.lastName || ""}`}
                            >
                              {(attendee.member.user.firstName?.[0] || "") +
                                (attendee.member.user.lastName?.[0] || "")}
                            </div>
                          ))}
                          {meeting.attendees.length > 3 && (
                            <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 border-2 border-white">
                              +{meeting.attendees.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-blue-50 p-4">
                  <Calendar className="h-8 w-8 text-blue-400" />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">No upcoming meetings</p>
                <Button className="mt-4" size="sm" asChild>
                  <Link href={`/companies/${companyId}/meetings/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Meeting
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-100 p-2">
                  <CheckSquare className="h-5 w-5 text-amber-600" />
                </div>
                <CardTitle>My Action Items</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/companies/${companyId}/action-items`}>
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardDescription>Tasks assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.userActionItems && data.userActionItems.length > 0 ? (
              <div className="space-y-3">
                {data.userActionItems.map((item) => {
                  const isOverdue = item.dueDate && isPast(new Date(item.dueDate));
                  return (
                    <Link
                      key={item.id}
                      href={`/companies/${companyId}/action-items`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={priorityColors[item.priority]}
                          >
                            {item.priority}
                          </Badge>
                          {item.dueDate && (
                            <span
                              className={`text-xs ${
                                isOverdue ? "text-red-600" : "text-muted-foreground"
                              }`}
                            >
                              Due {formatDistanceToNow(new Date(item.dueDate), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-amber-50 p-4">
                  <CheckSquare className="h-8 w-8 text-amber-400" />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">No action items assigned</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-slate-100 p-2">
              <Activity className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates across your company</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-slate-50 p-4">
              <Activity className="h-8 w-8 text-slate-400" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
