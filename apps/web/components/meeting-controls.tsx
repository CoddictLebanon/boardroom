"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMeetingSocket, MeetingStatusEvent } from "@/lib/socket";
import { Play, Square, Users, Clock } from "lucide-react";
import type { MeetingStatus } from "@/lib/types";

interface MeetingControlsProps {
  meetingId: string;
  initialStatus: MeetingStatus;
  isAdmin: boolean;
  onStatusChange?: (status: MeetingStatus) => void;
}

export function MeetingControls({
  meetingId,
  initialStatus,
  isAdmin,
  onStatusChange,
}: MeetingControlsProps) {
  const {
    isConnected,
    isInMeeting,
    currentAttendees,
    updateMeetingStatus,
    updateAttendance,
    onMeetingStatusUpdate,
  } = useMeetingSocket(meetingId);

  const [status, setStatus] = useState<MeetingStatus>(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasMarkedPresent, setHasMarkedPresent] = useState(false);

  // Listen for status updates
  useEffect(() => {
    const unsubscribe = onMeetingStatusUpdate((event: MeetingStatusEvent) => {
      if (event.meetingId === meetingId) {
        setStatus(event.status);
        onStatusChange?.(event.status);
      }
    });

    return unsubscribe;
  }, [meetingId, onMeetingStatusUpdate, onStatusChange]);

  // Auto-mark present when joining a live meeting
  useEffect(() => {
    if (isInMeeting && status === "IN_PROGRESS" && !hasMarkedPresent) {
      updateAttendance(true);
      setHasMarkedPresent(true);
    }
  }, [isInMeeting, status, hasMarkedPresent, updateAttendance]);

  const handleStartMeeting = async () => {
    if (!isAdmin || !isConnected) return;

    setIsUpdating(true);
    try {
      const result = await updateMeetingStatus("IN_PROGRESS");
      if (result.success) {
        setStatus("IN_PROGRESS");
        onStatusChange?.("IN_PROGRESS");
      }
    } catch (err) {
      console.error("Failed to start meeting:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEndMeeting = async () => {
    if (!isAdmin || !isConnected) return;

    setIsUpdating(true);
    try {
      const result = await updateMeetingStatus("COMPLETED");
      if (result.success) {
        setStatus("COMPLETED");
        onStatusChange?.("COMPLETED");
      }
    } catch (err) {
      console.error("Failed to end meeting:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "SCHEDULED":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Scheduled
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-green-600">
            <div className="mr-1 h-2 w-2 animate-pulse rounded-full bg-white" />
            Live
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-gray-100">
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive">
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Meeting Status</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Online Attendees */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{currentAttendees.length} participants online</span>
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="space-y-2">
            {status === "SCHEDULED" && (
              <Button
                onClick={handleStartMeeting}
                disabled={!isConnected || isUpdating}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Meeting
              </Button>
            )}

            {status === "IN_PROGRESS" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={!isConnected || isUpdating}
                    className="w-full"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    End Meeting
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>End this meeting?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the meeting as completed. All votes will be
                      finalized and participants will be notified.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEndMeeting}>
                      End Meeting
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}

        {/* Connection Status */}
        {!isConnected && (
          <p className="text-center text-sm text-muted-foreground">
            Connecting to real-time updates...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
