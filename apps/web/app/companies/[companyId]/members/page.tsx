"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Mail, Loader2, UserPlus, X, Clock, MoreHorizontal, UserMinus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type MemberRole = "OWNER" | "ADMIN" | "BOARD_MEMBER" | "OBSERVER";

interface Invitation {
  id: string;
  email: string;
  role: MemberRole;
  title: string | null;
  status: string;
  expiresAt: string;
  inviter: { firstName: string | null; lastName: string | null };
}

interface Member {
  id: string;
  role: MemberRole;
  title: string | null;
  status: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  };
}

export default function MembersPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const companyId = params.companyId as string;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("BOARD_MEMBER");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const resetForm = () => {
    setEmail("");
    setRole("BOARD_MEMBER");
    setTitle("");
  };

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setIsInitialLoading(true);
      const token = await getToken();

      const [companyRes, invitationsRes] = await Promise.all([
        fetch(`${API_URL}/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/companies/${companyId}/invitations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (companyRes.ok) {
        const company = await companyRes.json();
        setMembers(company.members || []);
      }

      if (invitationsRes.ok) {
        const invites = await invitationsRes.json();
        setInvitations(invites.filter((i: Invitation) => i.status === "PENDING"));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      if (showLoading) setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const handleInvite = async () => {
    if (!email.trim()) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();

      const response = await fetch(
        `${API_URL}/companies/${companyId}/invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: email.trim(),
            role,
            title: title.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send invitation");
      }

      // Optimistic update - add invitation to list immediately
      const newInvitation = await response.json();
      setInvitations((prev) => [...prev, newInvitation]);

      resetForm();
      setDialogOpen(false);

      // Background refresh
      fetchData(false);
    } catch (error) {
      console.error("Error sending invitation:", error);
      alert(error instanceof Error ? error.message : "Failed to send invitation");
      fetchData(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;

    // Optimistic update - remove from list immediately
    setInvitations((prev) => prev.filter((i) => i.id !== invitationId));

    try {
      const token = await getToken();
      await fetch(`${API_URL}/invitations/${invitationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Background refresh
      fetchData(false);
    } catch (error) {
      console.error("Error revoking invitation:", error);
      fetchData(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this company? They will lose access immediately.`)) return;

    // Optimistic update - remove from list immediately
    setMembers((prev) => prev.filter((m) => m.id !== memberId));

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/members/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove member");
      }

      // Background refresh
      fetchData(false);
    } catch (error) {
      console.error("Error removing member:", error);
      alert(error instanceof Error ? error.message : "Failed to remove member");
      fetchData(false);
    }
  };

  const getRoleBadgeVariant = (role: MemberRole) => {
    switch (role) {
      case "OWNER": return "default";
      case "ADMIN": return "secondary";
      default: return "outline";
    }
  };

  const formatRole = (role: MemberRole) => {
    switch (role) {
      case "OWNER": return "Owner";
      case "ADMIN": return "Admin";
      case "BOARD_MEMBER": return "Board Member";
      case "OBSERVER": return "Observer";
      default: return role;
    }
  };

  const activeMembers = members.filter((m) => m.status === "ACTIVE");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Board Members</h1>
          <p className="text-muted-foreground">Manage your board member directory</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <div className="rounded-full bg-emerald-100 p-2">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <div className="rounded-full bg-amber-100 p-2">
              <Mail className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitations.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <div className="rounded-full bg-blue-100 p-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {activeMembers.filter((m) => m.role === "OWNER").length} Owners,{" "}
              {activeMembers.filter((m) => m.role === "ADMIN").length} Admins
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-100 p-2">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>Invitations waiting to be accepted</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                      <Mail className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatRole(invitation.role)} {invitation.title && `• ${invitation.title}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeInvitation(invitation.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-2">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>All Members</CardTitle>
              <CardDescription>Board members and their roles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isInitialLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : activeMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-emerald-50 p-4">
                <Users className="h-10 w-10 text-emerald-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No members yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Invite members to get started.
              </p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      {member.user.imageUrl && (
                        <AvatarImage src={member.user.imageUrl} />
                      )}
                      <AvatarFallback>
                        {member.user.firstName?.[0]}
                        {member.user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">
                        {member.user.firstName} {member.user.lastName}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {member.title || member.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(member.role)}>{formatRole(member.role)}</Badge>
                    {member.role !== "OWNER" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleRemoveMember(
                              member.id,
                              `${member.user.firstName} ${member.user.lastName}`.trim() || member.user.email
                            )}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove from company
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Board Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to join your board.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="BOARD_MEMBER">Board Member</SelectItem>
                  <SelectItem value="OBSERVER">Observer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="e.g., Independent Director"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isSubmitting || !email.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Mail className="mr-2 h-4 w-4" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
