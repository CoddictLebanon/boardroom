"use client";

import { MeetingCard } from "./meeting-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeetings, useMeetingMutations } from "@/lib/hooks/use-meetings";
import { useParams } from "next/navigation";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface MeetingsListProps {
  upcoming?: boolean;
  past?: boolean;
}

export function MeetingsList({ upcoming, past }: MeetingsListProps) {
  const params = useParams();
  const companyId = params.companyId as string;
  const { meetings, isLoading, error, refetch } = useMeetings({ upcoming, past });
  const { cancelMeeting } = useMeetingMutations();

  const handleCancel = async (id: string) => {
    if (confirm("Are you sure you want to cancel this meeting?")) {
      const success = await cancelMeeting(id);
      if (success) {
        refetch();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-6">
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-red-100 p-3">
          <Calendar className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Error loading meetings</h3>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-blue-50 p-4">
          <Calendar className="h-10 w-10 text-blue-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">
          {upcoming ? "No upcoming meetings" : past ? "No past meetings" : "No meetings yet"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {upcoming
            ? "Schedule your next board meeting to get started."
            : past
            ? "Your completed meetings will appear here."
            : "Create your first meeting to get started."}
        </p>
        {(upcoming || (!upcoming && !past)) && (
          <Button className="mt-4" asChild>
            <Link href={`/companies/${companyId}/meetings/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Meeting
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} companyId={companyId} onCancel={handleCancel} />
      ))}
    </div>
  );
}
