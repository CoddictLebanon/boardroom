"use client";

import { useEffect, useCallback, useState } from "react";
import { useSocket } from "./socket-context";

export interface VoteTally {
  for: number;
  against: number;
  abstain: number;
}

export interface VoteUpdateEvent {
  decisionId: string;
  voterId: string;
  vote: "FOR" | "AGAINST" | "ABSTAIN";
  tally: VoteTally;
}

export interface AttendeeEvent {
  userId: string;
  meetingId: string;
}

export interface AttendanceUpdateEvent {
  meetingId: string;
  userId: string;
  isPresent: boolean;
}

export interface MeetingStatusEvent {
  meetingId: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  updatedAt: string;
}

export function useMeetingSocket(meetingId: string | null) {
  const { socket, isConnected, error } = useSocket();
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [currentAttendees, setCurrentAttendees] = useState<string[]>([]);
  const [meetingError, setMeetingError] = useState<string | null>(null);

  // Join meeting room
  const joinMeeting = useCallback(async () => {
    if (!socket || !meetingId || !isConnected) return;

    try {
      socket.emit("meeting:join", { meetingId }, (response: any) => {
        if (response.success) {
          setIsInMeeting(true);
          setCurrentAttendees(response.currentAttendees || []);
          setMeetingError(null);
        } else {
          setMeetingError(response.error || "Failed to join meeting");
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to join meeting";
      setMeetingError(errorMessage);
    }
  }, [socket, meetingId, isConnected]);

  // Leave meeting room
  const leaveMeeting = useCallback(() => {
    if (!socket || !meetingId) return;

    socket.emit("meeting:leave", { meetingId }, () => {
      setIsInMeeting(false);
      setCurrentAttendees([]);
    });
  }, [socket, meetingId]);

  // Cast a vote
  const castVote = useCallback(
    (decisionId: string, vote: "FOR" | "AGAINST" | "ABSTAIN") => {
      return new Promise<{ success: boolean; tally?: VoteTally; error?: string }>(
        (resolve) => {
          if (!socket || !isConnected) {
            resolve({ success: false, error: "Not connected" });
            return;
          }

          socket.emit("vote:cast", { decisionId, vote }, (response: any) => {
            resolve(response);
          });
        }
      );
    },
    [socket, isConnected]
  );

  // Update attendance
  const updateAttendance = useCallback(
    (isPresent: boolean) => {
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        if (!socket || !meetingId || !isConnected) {
          resolve({ success: false, error: "Not connected" });
          return;
        }

        socket.emit(
          "attendance:update",
          { meetingId, isPresent },
          (response: any) => {
            resolve(response);
          }
        );
      });
    },
    [socket, meetingId, isConnected]
  );

  // Update meeting status (admin only)
  const updateMeetingStatus = useCallback(
    (status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") => {
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        if (!socket || !meetingId || !isConnected) {
          resolve({ success: false, error: "Not connected" });
          return;
        }

        socket.emit(
          "meeting:status",
          { meetingId, status },
          (response: any) => {
            resolve(response);
          }
        );
      });
    },
    [socket, meetingId, isConnected]
  );

  // Subscribe to events
  const onVoteUpdate = useCallback(
    (callback: (event: VoteUpdateEvent) => void) => {
      if (!socket) return () => {};

      socket.on("vote:updated", callback);
      return () => socket.off("vote:updated", callback);
    },
    [socket]
  );

  const onAttendeeJoined = useCallback(
    (callback: (event: AttendeeEvent) => void) => {
      if (!socket) return () => {};

      socket.on("attendee:joined", callback);
      return () => socket.off("attendee:joined", callback);
    },
    [socket]
  );

  const onAttendeeLeft = useCallback(
    (callback: (event: AttendeeEvent) => void) => {
      if (!socket) return () => {};

      socket.on("attendee:left", callback);
      return () => socket.off("attendee:left", callback);
    },
    [socket]
  );

  const onAttendanceUpdate = useCallback(
    (callback: (event: AttendanceUpdateEvent) => void) => {
      if (!socket) return () => {};

      socket.on("attendance:updated", callback);
      return () => socket.off("attendance:updated", callback);
    },
    [socket]
  );

  const onMeetingStatusUpdate = useCallback(
    (callback: (event: MeetingStatusEvent) => void) => {
      if (!socket) return () => {};

      socket.on("meeting:status:updated", callback);
      return () => socket.off("meeting:status:updated", callback);
    },
    [socket]
  );

  // Auto-join meeting when connected
  useEffect(() => {
    if (meetingId && isConnected && !isInMeeting) {
      joinMeeting();
    }

    return () => {
      if (isInMeeting) {
        leaveMeeting();
      }
    };
  }, [meetingId, isConnected]);

  // Update attendees list on events
  useEffect(() => {
    if (!socket) return;

    const handleJoined = (event: AttendeeEvent) => {
      if (event.meetingId === meetingId) {
        setCurrentAttendees((prev) =>
          prev.includes(event.userId) ? prev : [...prev, event.userId]
        );
      }
    };

    const handleLeft = (event: AttendeeEvent) => {
      if (event.meetingId === meetingId) {
        setCurrentAttendees((prev) =>
          prev.filter((id) => id !== event.userId)
        );
      }
    };

    socket.on("attendee:joined", handleJoined);
    socket.on("attendee:left", handleLeft);

    return () => {
      socket.off("attendee:joined", handleJoined);
      socket.off("attendee:left", handleLeft);
    };
  }, [socket, meetingId]);

  return {
    isConnected,
    isInMeeting,
    currentAttendees,
    error: error || meetingError,
    joinMeeting,
    leaveMeeting,
    castVote,
    updateAttendance,
    updateMeetingStatus,
    onVoteUpdate,
    onAttendeeJoined,
    onAttendeeLeft,
    onAttendanceUpdate,
    onMeetingStatusUpdate,
  };
}
