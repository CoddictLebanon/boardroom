"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Calendar, Clock, MapPin, Video, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { format } from "date-fns";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface CompanyMember {
  id: string;
  userId: string;
  title: string | null;
  role: string;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    imageUrl?: string | null;
  };
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
}

export default function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string; companyId: string }>;
}) {
  const { id, companyId } = use(params);
  const router = useRouter();
  const { getToken } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: "60",
    location: "",
    videoLink: "",
  });

  // Attendee state
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  // Maps memberId → attendeeId (MeetingAttendee.id) for existing attendees
  const [existingAttendeeMap, setExistingAttendeeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [meetingRes, companyRes] = await Promise.all([
          fetch(`${API_URL}/companies/${companyId}/meetings/${id}`, { headers }),
          fetch(`${API_URL}/companies/${companyId}`, { headers }),
        ]);

        if (!meetingRes.ok) throw new Error("Failed to fetch meeting");

        const meeting = await meetingRes.json();
        const scheduledDate = new Date(meeting.scheduledAt);

        setFormData({
          title: meeting.title || "",
          description: meeting.description || "",
          date: format(scheduledDate, "yyyy-MM-dd"),
          time: format(scheduledDate, "HH:mm"),
          duration: meeting.duration?.toString() || "60",
          location: meeting.location || "",
          videoLink: meeting.videoLink || "",
        });

        // Build attendee map: memberId → attendeeId
        const attendeeMap: Record<string, string> = {};
        for (const a of meeting.attendees || []) {
          attendeeMap[a.memberId] = a.id;
        }
        setExistingAttendeeMap(attendeeMap);
        setSelectedMemberIds(Object.keys(attendeeMap));

        if (companyRes.ok) {
          const company = await companyRes.json();
          setCompanyMembers(company.members || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load meeting. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, companyId, getToken]);

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((m) => m !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title || !formData.date || !formData.time) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);
      const token = await getToken();
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();

      // 1. Update meeting details
      const meetingRes = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          scheduledAt,
          duration: parseInt(formData.duration),
          location: formData.location || undefined,
          videoLink: formData.videoLink || undefined,
        }),
      });

      if (!meetingRes.ok) throw new Error("Failed to update meeting");

      // 2. Diff attendees: find additions and removals
      const originalMemberIds = Object.keys(existingAttendeeMap);
      const toAdd = selectedMemberIds.filter((mid) => !originalMemberIds.includes(mid));
      const toRemove = originalMemberIds.filter((mid) => !selectedMemberIds.includes(mid));

      await Promise.all([
        // Add new attendees
        toAdd.length > 0
          ? fetch(`${API_URL}/companies/${companyId}/meetings/${id}/attendees`, {
              method: "POST",
              headers,
              body: JSON.stringify({ memberIds: toAdd }),
            })
          : Promise.resolve(),

        // Remove de-selected attendees
        ...toRemove.map((memberId) =>
          fetch(
            `${API_URL}/companies/${companyId}/meetings/${id}/attendees/${existingAttendeeMap[memberId]}`,
            { method: "DELETE", headers }
          )
        ),
      ]);

      router.push(`/companies/${companyId}/meetings/${id}`);
    } catch (err) {
      console.error("Error updating meeting:", err);
      setError("Failed to update meeting. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/companies/${companyId}/meetings/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Meeting</h1>
          <p className="text-muted-foreground">Update meeting details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Meeting Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Details</CardTitle>
              <CardDescription>Update the information for your meeting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Q4 Board Review"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Briefly describe the purpose of this meeting..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Date and Time */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="date"
                      type="date"
                      className="pl-10"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="time"
                      type="time"
                      className="pl-10"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(value) => setFormData({ ...formData, duration: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="e.g., Conference Room A, 5th Floor"
                    className="pl-10"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              {/* Video Link */}
              <div className="space-y-2">
                <Label htmlFor="videoLink">Video Conference Link</Label>
                <div className="relative">
                  <Video className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="videoLink"
                    type="url"
                    placeholder="e.g., https://zoom.us/j/..."
                    className="pl-10"
                    value={formData.videoLink}
                    onChange={(e) => setFormData({ ...formData, videoLink: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendees Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Attendees
              </CardTitle>
              <CardDescription>
                Select who should attend this meeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              {companyMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members found.</p>
              ) : (
                <div className="space-y-2">
                  {/* Select all toggle */}
                  <div
                    className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      if (selectedMemberIds.length === companyMembers.length) {
                        setSelectedMemberIds([]);
                      } else {
                        setSelectedMemberIds(companyMembers.map((m) => m.id));
                      }
                    }}
                  >
                    <Checkbox
                      checked={selectedMemberIds.length === companyMembers.length && companyMembers.length > 0}
                      onCheckedChange={() => {}}
                    />
                    <span className="text-sm font-medium">
                      {selectedMemberIds.length === companyMembers.length
                        ? "Deselect all"
                        : "Select all"}
                    </span>
                  </div>

                  {/* Member list */}
                  {companyMembers.map((member) => {
                    const isSelected = selectedMemberIds.includes(member.id);
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                          isSelected ? "bg-muted/30" : ""
                        }`}
                        onClick={() => toggleMember(member.id)}
                      >
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleMember(member.id)}
                          />
                        </div>
                        <Avatar className="h-7 w-7">
                          {member.user?.imageUrl && (
                            <AvatarImage src={member.user.imageUrl} />
                          )}
                          <AvatarFallback className="text-[10px]">
                            {getInitials(member.user?.firstName, member.user?.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {member.user?.firstName} {member.user?.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {member.title || member.role}
                        </span>
                      </div>
                    );
                  })}

                  {selectedMemberIds.length > 0 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/companies/${companyId}/meetings/${id}`}>Cancel</Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
