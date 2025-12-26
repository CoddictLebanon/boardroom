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

export interface MeetingNote {
  id: string;
  meetingId: string;
  content: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    imageUrl?: string;
  };
}

export interface NoteDeletedEvent {
  id: string;
}

export interface NotesReorderedEvent {
  noteIds: string[];
}

// Agenda Item types
export interface AgendaItem {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  duration?: number;
  order: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    imageUrl?: string;
  };
}

export interface AgendaDeletedEvent {
  id: string;
}

export interface AgendaReorderedEvent {
  itemIds: string[];
}

// Decision types
export interface Decision {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  outcome?: string;
  order: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl?: string;
  };
  votes?: any[];
  agendaItem?: any;
}

export interface DecisionDeletedEvent {
  id: string;
}

export interface DecisionReorderedEvent {
  decisionIds: string[];
}

// Action Item types
export interface ActionItem {
  id: string;
  meetingId?: string;
  companyId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  order: number;
  createdById: string;
  assigneeId?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    imageUrl?: string;
  };
  createdBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    imageUrl?: string;
  };
}

export interface ActionItemDeletedEvent {
  id: string;
}

export interface ActionItemReorderedEvent {
  itemIds: string[];
}

export function useMeetingSocket(meetingId: string | null) {
  const { socket, isConnected, isAuthenticated, error } = useSocket();
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [currentAttendees, setCurrentAttendees] = useState<string[]>([]);
  const [meetingError, setMeetingError] = useState<string | null>(null);

  // Join meeting room
  const joinMeeting = useCallback(async () => {
    console.log("[MeetingSocket] joinMeeting called:", {
      hasSocket: !!socket,
      meetingId,
      isConnected,
      isAuthenticated
    });

    if (!socket || !meetingId || !isConnected || !isAuthenticated) {
      console.log("[MeetingSocket] Cannot join - missing requirements");
      return;
    }

    try {
      console.log("[MeetingSocket] Emitting meeting:join for", meetingId);
      socket.emit("meeting:join", { meetingId }, (response: any) => {
        console.log("[MeetingSocket] meeting:join response:", response);
        if (response?.success) {
          setIsInMeeting(true);
          setCurrentAttendees(response.currentAttendees || []);
          setMeetingError(null);
        } else {
          const error = response?.error || "Failed to join meeting";
          console.error("[MeetingSocket] Failed to join:", error);
          setMeetingError(error);
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to join meeting";
      console.error("[MeetingSocket] Exception joining:", errorMessage);
      setMeetingError(errorMessage);
    }
  }, [socket, meetingId, isConnected, isAuthenticated]);

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

  // Note event handlers
  const onNoteCreated = useCallback(
    (callback: (note: MeetingNote) => void) => {
      if (!socket) return () => {};

      socket.on("note:created", callback);
      return () => socket.off("note:created", callback);
    },
    [socket]
  );

  const onNoteUpdated = useCallback(
    (callback: (note: MeetingNote) => void) => {
      if (!socket) return () => {};

      socket.on("note:updated", callback);
      return () => socket.off("note:updated", callback);
    },
    [socket]
  );

  const onNoteDeleted = useCallback(
    (callback: (event: NoteDeletedEvent) => void) => {
      if (!socket) return () => {};

      socket.on("note:deleted", callback);
      return () => socket.off("note:deleted", callback);
    },
    [socket]
  );

  const onNotesReordered = useCallback(
    (callback: (event: NotesReorderedEvent) => void) => {
      if (!socket) return () => {};

      socket.on("notes:reordered", callback);
      return () => socket.off("notes:reordered", callback);
    },
    [socket]
  );

  // Agenda Item event handlers
  const onAgendaCreated = useCallback(
    (callback: (item: AgendaItem) => void) => {
      if (!socket) return () => {};

      socket.on("agenda:created", callback);
      return () => socket.off("agenda:created", callback);
    },
    [socket]
  );

  const onAgendaUpdated = useCallback(
    (callback: (item: AgendaItem) => void) => {
      if (!socket) return () => {};

      socket.on("agenda:updated", callback);
      return () => socket.off("agenda:updated", callback);
    },
    [socket]
  );

  const onAgendaDeleted = useCallback(
    (callback: (event: AgendaDeletedEvent) => void) => {
      if (!socket) return () => {};

      socket.on("agenda:deleted", callback);
      return () => socket.off("agenda:deleted", callback);
    },
    [socket]
  );

  const onAgendaReordered = useCallback(
    (callback: (event: AgendaReorderedEvent) => void) => {
      if (!socket) return () => {};

      socket.on("agenda:reordered", callback);
      return () => socket.off("agenda:reordered", callback);
    },
    [socket]
  );

  // Decision event handlers
  const onDecisionCreated = useCallback(
    (callback: (decision: Decision) => void) => {
      if (!socket) return () => {};

      socket.on("decision:created", callback);
      return () => socket.off("decision:created", callback);
    },
    [socket]
  );

  const onDecisionUpdated = useCallback(
    (callback: (decision: Decision) => void) => {
      if (!socket) return () => {};

      socket.on("decision:updated", callback);
      return () => socket.off("decision:updated", callback);
    },
    [socket]
  );

  const onDecisionDeleted = useCallback(
    (callback: (event: DecisionDeletedEvent) => void) => {
      if (!socket) return () => {};

      socket.on("decision:deleted", callback);
      return () => socket.off("decision:deleted", callback);
    },
    [socket]
  );

  const onDecisionReordered = useCallback(
    (callback: (event: DecisionReorderedEvent) => void) => {
      if (!socket) return () => {};

      socket.on("decision:reordered", callback);
      return () => socket.off("decision:reordered", callback);
    },
    [socket]
  );

  // Action Item event handlers
  const onActionItemCreated = useCallback(
    (callback: (item: ActionItem) => void) => {
      if (!socket) return () => {};

      socket.on("actionItem:created", callback);
      return () => socket.off("actionItem:created", callback);
    },
    [socket]
  );

  const onActionItemUpdated = useCallback(
    (callback: (item: ActionItem) => void) => {
      if (!socket) return () => {};

      socket.on("actionItem:updated", callback);
      return () => socket.off("actionItem:updated", callback);
    },
    [socket]
  );

  const onActionItemDeleted = useCallback(
    (callback: (event: ActionItemDeletedEvent) => void) => {
      if (!socket) return () => {};

      socket.on("actionItem:deleted", callback);
      return () => socket.off("actionItem:deleted", callback);
    },
    [socket]
  );

  const onActionItemReordered = useCallback(
    (callback: (event: ActionItemReorderedEvent) => void) => {
      if (!socket) return () => {};

      socket.on("actionItem:reordered", callback);
      return () => socket.off("actionItem:reordered", callback);
    },
    [socket]
  );

  // Auto-join meeting when authenticated - wait for backend auth before joining
  useEffect(() => {
    console.log("[MeetingSocket] Auto-join effect running:", {
      meetingId,
      isConnected,
      isAuthenticated,
      isInMeeting,
      hasSocket: !!socket,
    });

    // Reset state if disconnected or not authenticated
    if (!isConnected || !isAuthenticated) {
      console.log("[MeetingSocket] Not connected/authenticated, resetting isInMeeting");
      setIsInMeeting(false);
      setCurrentAttendees([]);
      return;
    }

    // Only join if we have everything we need and aren't already in meeting
    if (meetingId && socket && !isInMeeting) {
      console.log("[MeetingSocket] Attempting to join meeting:", meetingId);

      socket.emit("meeting:join", { meetingId }, (response: any) => {
        console.log("[MeetingSocket] meeting:join response:", response);
        if (response?.success) {
          setIsInMeeting(true);
          setCurrentAttendees(response.currentAttendees || []);
          setMeetingError(null);
        } else {
          const error = response?.error || "Failed to join meeting";
          console.error("[MeetingSocket] Failed to join:", error);
          setMeetingError(error);
        }
      });
    }
  }, [meetingId, socket, isConnected, isAuthenticated, isInMeeting]);

  // Cleanup: leave meeting on unmount
  useEffect(() => {
    return () => {
      if (isInMeeting) {
        leaveMeeting();
      }
    };
  }, [isInMeeting, leaveMeeting]);

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
    // Note events
    onNoteCreated,
    onNoteUpdated,
    onNoteDeleted,
    onNotesReordered,
    // Agenda events
    onAgendaCreated,
    onAgendaUpdated,
    onAgendaDeleted,
    onAgendaReordered,
    // Decision events
    onDecisionCreated,
    onDecisionUpdated,
    onDecisionDeleted,
    onDecisionReordered,
    // Action Item events
    onActionItemCreated,
    onActionItemUpdated,
    onActionItemDeleted,
    onActionItemReordered,
  };
}
