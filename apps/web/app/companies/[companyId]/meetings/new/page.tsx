"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

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

export default function NewMeetingPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;
  const { getToken } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: "60",
    location: "",
    videoLink: "",
  });

  // Fetch company members on mount
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoadingMembers(true);
        const token = await getToken();
        const response = await fetch(`${API_URL}/companies/${companyId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const company = await response.json();
          setCompanyMembers(company.members || []);
        }
      } catch (err) {
        console.error("Error fetching company members:", err);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [companyId, getToken]);

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllMembers = () => {
    if (selectedMemberIds.length === companyMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(companyMembers.map((m) => m.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title || !formData.date || !formData.time) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setIsLoading(true);
      const token = await getToken();
      const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();

      // Create the meeting
      const createResponse = await fetch(`${API_URL}/companies/${companyId}/meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          scheduledAt,
          duration: parseInt(formData.duration),
          location: formData.location || undefined,
          videoLink: formData.videoLink || undefined,
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Failed to create meeting");
      }

      const meeting = await createResponse.json();

      // Add attendees if any selected
      if (selectedMemberIds.length > 0) {
        const attendeesResponse = await fetch(`${API_URL}/companies/${companyId}/meetings/${meeting.id}/attendees`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            memberIds: selectedMemberIds,
          }),
        });

        if (!attendeesResponse.ok) {
          console.error("Failed to add attendees, but meeting was created");
        }
      }

      router.push(`/companies/${companyId}/meetings/${meeting.id}`);
    } catch (err) {
      console.error("Error creating meeting:", err);
      setError("Failed to create meeting. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/companies/${companyId}/meetings`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule Meeting</h1>
          <p className="text-muted-foreground">
            Create a new board meeting
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Meeting Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Details</CardTitle>
              <CardDescription>
                Enter the basic information for your meeting
              </CardDescription>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Attendees</CardTitle>
                    <CardDescription>
                      Select members to invite to this meeting
                    </CardDescription>
                  </div>
                </div>
                {companyMembers.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllMembers}
                  >
                    {selectedMemberIds.length === companyMembers.length ? "Deselect All" : "Select All"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : companyMembers.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No company members found
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {companyMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        selectedMemberIds.includes(member.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleMemberSelection(member.id)}
                    >
                      <Checkbox
                        checked={selectedMemberIds.includes(member.id)}
                        onCheckedChange={() => toggleMemberSelection(member.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user?.imageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.user?.firstName, member.user?.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {member.user?.firstName} {member.user?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.title || member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedMemberIds.length > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? "s" : ""} selected
                </p>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Meeting"
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/companies/${companyId}/meetings`}>Cancel</Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
