"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function MeetingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">
            Schedule and manage your board meetings
          </p>
        </div>
        <Button asChild>
          <Link href="/meetings/new">
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <MeetingsList upcoming />
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          <MeetingsList past />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <MeetingsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
