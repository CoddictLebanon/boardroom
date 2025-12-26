"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { Card } from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  FileText,
  ListChecks,
  Vote,
  ChevronRight,
  User,
} from "lucide-react";
import type { Meeting, MeetingStatus, MeetingAttendee } from "@/lib/types";

interface MeetingCardProps {
  meeting: Meeting;
  companyId: string;
  onCancel?: (id: string) => void;
}

const statusConfig: Record<MeetingStatus, { color: string; bg: string; border: string; label: string }> = {
  SCHEDULED: { color: "text-blue-700", bg: "bg-blue-50", border: "border-l-blue-500", label: "Scheduled" },
  IN_PROGRESS: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-l-emerald-500", label: "In Progress" },
  PAUSED: { color: "text-amber-700", bg: "bg-amber-50", border: "border-l-amber-500", label: "Paused" },
  COMPLETED: { color: "text-slate-600", bg: "bg-slate-100", border: "border-l-slate-400", label: "Completed" },
  CANCELLED: { color: "text-red-700", bg: "bg-red-50", border: "border-l-red-400", label: "Cancelled" },
};

function AttendeeAvatar({ attendee, size = "md" }: { attendee: MeetingAttendee; size?: "sm" | "md" }) {
  const user = attendee.member?.user;
  const name = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Unknown";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const sizeClasses = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  const imgSize = size === "sm" ? 28 : 36;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`${sizeClasses} rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium shadow-sm overflow-hidden ring-2 ring-white`}
          >
            {user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={name}
                width={imgSize}
                height={imgSize}
                className="object-cover w-full h-full"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{name}</p>
          {attendee.member?.title && (
            <p className="text-xs text-muted-foreground">{attendee.member.title}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function AttendeeAvatars({ attendees }: { attendees: MeetingAttendee[] }) {
  if (!attendees || attendees.length === 0) return null;

  const displayedAttendees = attendees.slice(0, 5);
  const remainingCount = attendees.length - 5;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {displayedAttendees.map((attendee) => (
          <AttendeeAvatar key={attendee.id} attendee={attendee} />
        ))}
        {remainingCount > 0 && (
          <div className="h-9 w-9 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 ring-2 ring-white">
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
}

export function MeetingCard({ meeting, companyId, onCancel }: MeetingCardProps) {
  const router = useRouter();
  const scheduledDate = new Date(meeting.scheduledAt);
  const isUpcoming = scheduledDate > new Date() && meeting.status === "SCHEDULED";
  const isInProgress = meeting.status === "IN_PROGRESS" || meeting.status === "PAUSED";
  const isPastMeeting = isPast(scheduledDate);
  const status = statusConfig[meeting.status];

  const basePath = `/companies/${companyId}/meetings/${meeting.id}`;

  const agendaCount = meeting.agendaItems?.length || 0;
  const decisionCount = meeting.decisions?.length || 0;
  const attendeeCount = meeting.attendees?.length || 0;

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-lg border-l-4 ${status.border} group cursor-pointer`}
      onClick={() => router.push(basePath)}
    >
        <div className="p-5">
          {/* Top row: Date badge and status */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Date box */}
              <div className="flex flex-col items-center justify-center bg-slate-100 rounded-lg px-3 py-2 min-w-[60px]">
                <span className="text-xs font-medium text-slate-500 uppercase">
                  {format(scheduledDate, "MMM")}
                </span>
                <span className="text-2xl font-bold text-slate-900">
                  {format(scheduledDate, "d")}
                </span>
                <span className="text-xs text-slate-500">
                  {format(scheduledDate, "EEE")}
                </span>
              </div>

              {/* Title and description */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {meeting.title}
                </h3>
                {meeting.description && (
                  <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">
                    {meeting.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(scheduledDate, "h:mm a")}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>{meeting.duration} min</span>
                  {meeting.location && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {meeting.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status badge and menu */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Badge className={`${status.bg} ${status.color} border-0`}>
                {status.label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={basePath}>
                      <FileText className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  {isUpcoming && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href={`${basePath}/edit`}>
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
                      <Link href={`${basePath}/live`}>
                        <Play className="mr-2 h-4 w-4" />
                        Join Meeting
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bottom row: Attendees and stats */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {/* Attendees */}
            <div className="flex items-center gap-4">
              {meeting.attendees && meeting.attendees.length > 0 ? (
                <AttendeeAvatars attendees={meeting.attendees} />
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <User className="h-4 w-4" />
                  <span>No attendees</span>
                </div>
              )}
            </div>

            {/* Stats and quick action */}
            <div className="flex items-center gap-4">
              {/* Stats badges */}
              <div className="flex items-center gap-2">
                {agendaCount > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md text-sm text-slate-600">
                          <ListChecks className="h-3.5 w-3.5" />
                          <span>{agendaCount}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{agendaCount} agenda item{agendaCount !== 1 ? "s" : ""}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {decisionCount > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md text-sm text-slate-600">
                          <Vote className="h-3.5 w-3.5" />
                          <span>{decisionCount}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{decisionCount} decision{decisionCount !== 1 ? "s" : ""}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {meeting.videoLink && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md text-sm text-blue-600">
                          <Video className="h-3.5 w-3.5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Video call available</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Action button */}
              {isInProgress && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" asChild>
                  <Link href={`${basePath}/live`} onClick={(e) => e.stopPropagation()}>
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    Join
                  </Link>
                </Button>
              )}
              {isUpcoming && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={basePath} onClick={(e) => e.stopPropagation()}>
                    View
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
              {meeting.status === "COMPLETED" && (
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(scheduledDate, { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>
    </Card>
  );
}
