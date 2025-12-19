"use client";

import { use } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  FileText,
  CheckSquare,
  Vote,
  Play,
  Edit,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useMeeting } from "@/lib/hooks/use-meetings";
import type { MeetingStatus } from "@/lib/types";

const statusColors: Record<MeetingStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const statusLabels: Record<MeetingStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { meeting, isLoading, error } = useMeeting(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-red-100 p-3">
          <Calendar className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Meeting not found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {error || "The meeting you're looking for doesn't exist."}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/meetings">Back to Meetings</Link>
        </Button>
      </div>
    );
  }

  const scheduledDate = new Date(meeting.scheduledAt);
  const isUpcoming = scheduledDate > new Date() && meeting.status === "SCHEDULED";
  const isInProgress = meeting.status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/meetings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{meeting.title}</h1>
              <Badge className={statusColors[meeting.status]} variant="secondary">
                {statusLabels[meeting.status]}
              </Badge>
            </div>
            {meeting.description && (
              <p className="mt-1 text-muted-foreground">{meeting.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isUpcoming && (
            <Button variant="outline" asChild>
              <Link href={`/meetings/${meeting.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {(isUpcoming || isInProgress) && (
            <Button asChild>
              <Link href={`/meetings/${meeting.id}/live`}>
                <Play className="mr-2 h-4 w-4" />
                {isInProgress ? "Join Meeting" : "Start Meeting"}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 md:col-span-2">
          {/* Meeting Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Meeting Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(scheduledDate, "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm text-muted-foreground">
                      {format(scheduledDate, "h:mm a")} ({meeting.duration} min)
                    </p>
                  </div>
                </div>
                {meeting.location && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{meeting.location}</p>
                    </div>
                  </div>
                )}
                {meeting.videoLink && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Video Call</p>
                      <a
                        href={meeting.videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Join Video Call
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agenda */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Agenda</CardTitle>
                <CardDescription>Meeting agenda items</CardDescription>
              </div>
              {isUpcoming && (
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {meeting.agendaItems && meeting.agendaItems.length > 0 ? (
                <div className="space-y-4">
                  {meeting.agendaItems.map((item, index) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.title}</h4>
                        {item.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        {item.duration && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Duration: {item.duration} min
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No agenda items yet
                  </p>
                  {isUpcoming && (
                    <Button size="sm" variant="outline" className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Item
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Decisions */}
          {meeting.decisions && meeting.decisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Decisions</CardTitle>
                <CardDescription>Decisions made during this meeting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {meeting.decisions.map((decision) => (
                    <div key={decision.id} className="flex items-start gap-4 rounded-lg border p-4">
                      <Vote className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <h4 className="font-medium">{decision.title}</h4>
                        {decision.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {decision.description}
                          </p>
                        )}
                      </div>
                      {decision.outcome && (
                        <Badge
                          variant={decision.outcome === "PASSED" ? "default" : "secondary"}
                        >
                          {decision.outcome}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attendees */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Attendees</CardTitle>
              {isUpcoming && (
                <Button size="sm" variant="ghost">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {meeting.attendees && meeting.attendees.length > 0 ? (
                <div className="space-y-3">
                  {meeting.attendees.map((attendee) => (
                    <div key={attendee.id} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {attendee.member?.user?.firstName} {attendee.member?.user?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attendee.member?.title || attendee.member?.role}
                        </p>
                      </div>
                      {attendee.isPresent !== null && (
                        <Badge variant={attendee.isPresent ? "default" : "secondary"}>
                          {attendee.isPresent ? "Present" : "Absent"}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No attendees added
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Documents</CardTitle>
              <Button size="sm" variant="ghost">
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="py-4 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No documents attached
                </p>
                <Button size="sm" variant="outline" className="mt-4">
                  Attach Document
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Action Items</CardTitle>
              <Button size="sm" variant="ghost">
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="py-4 text-center">
                <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No action items yet
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
