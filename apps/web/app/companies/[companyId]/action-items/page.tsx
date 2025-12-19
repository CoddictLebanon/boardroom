"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Plus, Clock, AlertCircle, Loader2, ListTodo, CalendarClock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";

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
  };
}

interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  assignee: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  } | null;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  } | null;
  createdAt: string;
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
}

function getFullName(firstName?: string | null, lastName?: string | null) {
  return `${firstName || ""} ${lastName || ""}`.trim() || "Unknown";
}

export default function ActionItemsPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const companyId = params.companyId as string;

  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchActionItems = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/action-items`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActionItems(data);
      }
    } catch (error) {
      console.error("Error fetching action items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanyMembers = async () => {
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
    } catch (error) {
      console.error("Error fetching company members:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchActionItems();
    fetchCompanyMembers();
  }, [companyId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setAssigneeId("");
    setPriority("MEDIUM");
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies/${companyId}/action-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate || undefined,
          assigneeId: assigneeId || undefined,
          priority,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create action item");
      }

      resetForm();
      setDialogOpen(false);
      fetchActionItems();
    } catch (error) {
      console.error("Error creating action item:", error);
      alert("Failed to create action item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-amber-100 text-amber-800";
      case "LOW":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate stats
  const openItems = actionItems.filter((item) => item.status !== "COMPLETED");
  const overdueItems = actionItems.filter((item) => item.status === "OVERDUE");
  const completedThisMonth = actionItems.filter((item) => {
    if (item.status !== "COMPLETED") return false;
    const completedDate = new Date(item.createdAt);
    const now = new Date();
    return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
  });
  const dueThisWeek = actionItems.filter((item) => {
    if (!item.dueDate || item.status === "COMPLETED") return false;
    const dueDate = new Date(item.dueDate);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= now && dueDate <= weekFromNow;
  });

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Action Items</h1>
          <p className="text-muted-foreground">
            Track and manage tasks assigned from meetings
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Action Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Open</CardTitle>
            <div className="rounded-full bg-amber-100 p-2">
              <ListTodo className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openItems.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <div className="rounded-full bg-blue-100 p-2">
              <CalendarClock className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueThisWeek.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <div className="rounded-full bg-red-100 p-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueItems.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <div className="rounded-full bg-emerald-100 p-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedThisMonth.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-100 p-2">
              <CheckSquare className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>All Action Items</CardTitle>
              <CardDescription>Tasks requiring your attention</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : actionItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-amber-50 p-4">
                <CheckSquare className="h-10 w-10 text-amber-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No action items yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Action items will appear here when created from meetings or added manually.
              </p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Action Item
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      item.status === "COMPLETED" ? "bg-green-100" : "bg-amber-100"
                    }`}>
                      <CheckSquare className={`h-5 w-5 ${
                        item.status === "COMPLETED" ? "text-green-600" : "text-amber-600"
                      }`} />
                    </div>
                    <div>
                      <h4 className={`font-medium ${item.status === "COMPLETED" ? "line-through text-muted-foreground" : ""}`}>
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {item.assignee && (
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={item.assignee.imageUrl || undefined} />
                                  <AvatarFallback className="text-[8px]">
                                    {getInitials(item.assignee.firstName, item.assignee.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getFullName(item.assignee.firstName, item.assignee.lastName)}</p>
                              </TooltipContent>
                            </Tooltip>
                            <span>{item.assignee.firstName} {item.assignee.lastName}</span>
                            <span>•</span>
                          </div>
                        )}
                        {item.dueDate && (
                          <>
                            <Clock className="h-3 w-3" />
                            <span>Due {format(new Date(item.dueDate), "MMM d, yyyy")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(item.priority)} variant="secondary">
                      {item.priority}
                    </Badge>
                    <Badge className={getStatusColor(item.status)} variant="secondary">
                      {item.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Action Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Action Item</DialogTitle>
            <DialogDescription>
              Create a new action item to track.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Review quarterly report"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingMembers ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    companyMembers.map((member) => (
                      <SelectItem key={member.id} value={member.user?.id || member.userId}>
                        {member.user?.firstName} {member.user?.lastName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="due-date">Due Date (optional)</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as "HIGH" | "MEDIUM" | "LOW")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
