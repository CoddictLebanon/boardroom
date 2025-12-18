"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useCurrentCompany } from "./use-current-company";
import type { Meeting, MeetingStatus } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface UseMeetingsOptions {
  status?: MeetingStatus;
  upcoming?: boolean;
  past?: boolean;
}

export function useMeetings(options: UseMeetingsOptions = {}) {
  const { getToken, isLoaded } = useAuth();
  const { currentCompany } = useCurrentCompany();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    if (!isLoaded || !currentCompany) return;

    try {
      setIsLoading(true);
      const token = await getToken();

      const params = new URLSearchParams();
      if (options.status) params.append("status", options.status);
      if (options.upcoming) params.append("upcoming", "true");
      if (options.past) params.append("past", "true");

      const url = `${API_URL}/companies/${currentCompany.id}/meetings${params.toString() ? `?${params}` : ""}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch meetings");
      }

      const data = await response.json();
      setMeetings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, currentCompany, options.status, options.upcoming, options.past]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return { meetings, isLoading, error, refetch: fetchMeetings };
}

export function useMeeting(meetingId: string) {
  const { getToken, isLoaded } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeeting = useCallback(async () => {
    if (!isLoaded || !meetingId) return;

    try {
      setIsLoading(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch meeting");
      }

      const data = await response.json();
      setMeeting(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, meetingId]);

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  return { meeting, isLoading, error, refetch: fetchMeeting };
}

interface CreateMeetingData {
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  location?: string;
  videoLink?: string;
}

export function useMeetingMutations() {
  const { getToken } = useAuth();
  const { currentCompany } = useCurrentCompany();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMeeting = useCallback(
    async (data: CreateMeetingData): Promise<Meeting | null> => {
      if (!currentCompany) {
        setError("No company selected");
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);
        const token = await getToken();

        const response = await fetch(`${API_URL}/companies/${currentCompany.id}/meetings`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to create meeting");
        }

        return await response.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [getToken, currentCompany]
  );

  const updateMeeting = useCallback(
    async (meetingId: string, data: Partial<CreateMeetingData>): Promise<Meeting | null> => {
      try {
        setIsLoading(true);
        setError(null);
        const token = await getToken();

        const response = await fetch(`${API_URL}/meetings/${meetingId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error("Failed to update meeting");
        }

        return await response.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [getToken]
  );

  const cancelMeeting = useCallback(
    async (meetingId: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);
        const token = await getToken();

        const response = await fetch(`${API_URL}/meetings/${meetingId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to cancel meeting");
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getToken]
  );

  return {
    createMeeting,
    updateMeeting,
    cancelMeeting,
    isLoading,
    error,
  };
}
