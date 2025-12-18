"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  FileText,
} from "lucide-react";
import type { Meeting, MeetingStatus } from "@/lib/types";

interface MeetingCardProps {
  meeting: Meeting;
  onCancel?: (id: string) => void;
}

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

export function MeetingCard({ meeting, onCancel }: MeetingCardProps) {
  const scheduledDate = new Date(meeting.scheduledAt);
  const isUpcoming = scheduledDate > new Date() && meeting.status === "SCHEDULED";
  const isInProgress = meeting.status === "IN_PROGRESS";

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Link
              href={`/meetings/${meeting.id}`}
              className="text-lg font-semibold hover:underline"
            >
              {meeting.title}
            </Link>
            {meeting.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {meeting.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[meeting.status]} variant="secondary">
              {statusLabels[meeting.status]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/meetings/${meeting.id}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                {isUpcoming && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/meetings/${meeting.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Meeting
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => onCancel?.(meeting.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Cancel Meeting
                    </DropdownMenuItem>
                  </>
                )}
                {isInProgress && (
                  <DropdownMenuItem asChild>
                    <Link href={`/meetings/${meeting.id}/live`}>
                      <Play className="mr-2 h-4 w-4" />
                      Join Meeting
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(scheduledDate, "EEEE, MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              {format(scheduledDate, "h:mm a")} ({meeting.duration} min)
            </span>
          </div>
          {meeting.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{meeting.location}</span>
            </div>
          )}
          {meeting.videoLink && (
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              <a
                href={meeting.videoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Join Video Call
              </a>
            </div>
          )}
          {meeting.attendees && meeting.attendees.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{meeting.attendees.length} attendees</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {(isUpcoming || isInProgress) && (
          <div className="mt-4 flex gap-2">
            {isUpcoming && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/meetings/${meeting.id}`}>View Agenda</Link>
              </Button>
            )}
            {isInProgress && (
              <Button size="sm" asChild>
                <Link href={`/meetings/${meeting.id}/live`}>
                  <Play className="mr-2 h-4 w-4" />
                  Join Now
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
