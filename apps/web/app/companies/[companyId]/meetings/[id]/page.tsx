"use client";

import { use, useState, useEffect, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  FileText,
  CheckSquare,
  Vote,
  Play,
  Edit,
  Plus,
  Loader2,
  Upload,
  GripVertical,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useMeeting } from "@/lib/hooks/use-meetings";
import type { MeetingStatus } from "@/lib/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
}

function getFullName(firstName?: string | null, lastName?: string | null) {
  return `${firstName || ""} ${lastName || ""}`.trim() || "Unknown";
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const statusColors: Record<MeetingStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-green-100 text-green-800",
  PAUSED: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const statusLabels: Record<MeetingStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// Sortable agenda item component for drag-and-drop
interface SortableAgendaItemProps {
  item: any;
  index: number;
  onEdit: (item: any) => void;
}

function SortableAgendaItem({ item, index, onEdit }: SortableAgendaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-4 group">
      <button
        className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
        {index + 1}
      </div>
      <div className="flex-1">
        <h4 className="font-medium">{item.title}</h4>
        {item.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {item.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.duration} min
            </span>
          )}
          {item.createdBy && (
            <span className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={item.createdBy.imageUrl || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {getInitials(item.createdBy.firstName, item.createdBy.lastName)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getFullName(item.createdBy.firstName, item.createdBy.lastName)}</p>
                </TooltipContent>
              </Tooltip>
              Added by {item.createdBy.firstName}
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onEdit(item)}
      >
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string; companyId: string }>;
}) {
  const { id, companyId } = use(params);
  const { meeting, isLoading, error, refetch } = useMeeting(id);
  const { getToken } = useAuth();

  // Agenda Item state
  const [agendaDialogOpen, setAgendaDialogOpen] = useState(false);
  const [agendaTitle, setAgendaTitle] = useState("");
  const [agendaDescription, setAgendaDescription] = useState("");
  const [agendaDuration, setAgendaDuration] = useState("");
  const [isSubmittingAgenda, setIsSubmittingAgenda] = useState(false);
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);

  // Attendees state
  const [attendeesDialogOpen, setAttendeesDialogOpen] = useState(false);
  const [companyMembers, setCompanyMembers] = useState<Array<{ id: string; userId: string; title: string | null; role: string; user?: { id: string; firstName: string | null; lastName: string | null; email: string } }>>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isAddingAttendees, setIsAddingAttendees] = useState(false);

  // Action Items state
  const [actionItemDialogOpen, setActionItemDialogOpen] = useState(false);
  const [actionItemTitle, setActionItemTitle] = useState("");
  const [actionItemDescription, setActionItemDescription] = useState("");
  const [actionItemAssigneeId, setActionItemAssigneeId] = useState("");
  const [actionItemDueDate, setActionItemDueDate] = useState("");
  const [actionItemPriority, setActionItemPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [isSubmittingActionItem, setIsSubmittingActionItem] = useState(false);

  // Documents state
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  // Local agenda items state for drag-and-drop
  const [localAgendaItems, setLocalAgendaItems] = useState<any[]>([]);

  // Sync local agenda items with meeting data
  useEffect(() => {
    if (meeting?.agendaItems) {
      setLocalAgendaItems(meeting.agendaItems);
    }
  }, [meeting?.agendaItems]);

  // dnd-kit sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle agenda drag end
  const handleAgendaDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = localAgendaItems.findIndex((a) => a.id === active.id);
      const newIndex = localAgendaItems.findIndex((a) => a.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Optimistically update the local state
      const newItems = arrayMove(localAgendaItems, oldIndex, newIndex);
      setLocalAgendaItems(newItems);

      try {
        const token = await getToken();
        const response = await fetch(
          `${API_URL}/companies/${companyId}/meetings/${id}/agenda/reorder`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ itemIds: newItems.map((a) => a.id) }),
          }
        );
        if (!response.ok) {
          // Rollback on failure
          setLocalAgendaItems((prev) => arrayMove(prev, newIndex, oldIndex));
          console.error("Failed to reorder agenda items");
        }
      } catch (error) {
        // Rollback on error
        setLocalAgendaItems((prev) => arrayMove(prev, newIndex, oldIndex));
        console.error("Error reordering agenda items:", error);
      }
    },
    [localAgendaItems, companyId, id, getToken]
  );

  const resetAgendaForm = () => {
    setAgendaTitle("");
    setAgendaDescription("");
    setAgendaDuration("");
    setEditingAgendaId(null);
  };

  const openAddAgendaDialog = () => {
    resetAgendaForm();
    setAgendaDialogOpen(true);
  };

  const openEditAgendaDialog = (item: { id: string; title: string; description?: string | null; duration?: number | null }) => {
    setEditingAgendaId(item.id);
    setAgendaTitle(item.title);
    setAgendaDescription(item.description || "");
    setAgendaDuration(item.duration?.toString() || "");
    setAgendaDialogOpen(true);
  };

  const handleSubmitAgendaItem = async () => {
    if (!agendaTitle.trim()) return;

    try {
      setIsSubmittingAgenda(true);
      const token = await getToken();

      const isEditing = editingAgendaId !== null;
      const url = isEditing
        ? `${API_URL}/companies/${companyId}/meetings/${id}/agenda/${editingAgendaId}`
        : `${API_URL}/companies/${companyId}/meetings/${id}/agenda`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: agendaTitle.trim(),
          description: agendaDescription.trim() || undefined,
          duration: agendaDuration ? parseInt(agendaDuration) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(isEditing ? "Failed to update agenda item" : "Failed to add agenda item");
      }

      // Refresh meeting data
      await refetch();

      // Reset form and close dialog
      resetAgendaForm();
      setAgendaDialogOpen(false);
    } catch (error) {
      console.error("Error saving agenda item:", error);
      alert(editingAgendaId ? "Failed to update agenda item. Please try again." : "Failed to add agenda item. Please try again.");
    } finally {
      setIsSubmittingAgenda(false);
    }
  };

  // Attendees functions
  const openAttendeesDialog = async () => {
    if (!companyId) return;

    setAttendeesDialogOpen(true);
    setIsLoadingMembers(true);
    setSelectedMemberIds([]);

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch company members");
      }

      const company = await response.json();
      setCompanyMembers(company.members || []);
    } catch (error) {
      console.error("Error fetching company members:", error);
      alert("Failed to load company members. Please try again.");
      setAttendeesDialogOpen(false);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleAddAttendees = async () => {
    if (selectedMemberIds.length === 0) return;

    try {
      setIsAddingAttendees(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/attendees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          memberIds: selectedMemberIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add attendees");
      }

      await refetch();
      setSelectedMemberIds([]);
      setAttendeesDialogOpen(false);
    } catch (error) {
      console.error("Error adding attendees:", error);
      alert("Failed to add attendees. Please try again.");
    } finally {
      setIsAddingAttendees(false);
    }
  };

  // Get members who aren't already attendees
  const availableMembers = companyMembers.filter(
    (member) => !meeting?.attendees?.some((a) => a.memberId === member.id)
  );

  // Action Items functions
  const resetActionItemForm = () => {
    setActionItemTitle("");
    setActionItemDescription("");
    setActionItemAssigneeId("");
    setActionItemDueDate("");
    setActionItemPriority("MEDIUM");
  };

  const openActionItemDialog = async () => {
    if (!companyId) return;

    resetActionItemForm();
    setActionItemDialogOpen(true);

    // Only load members if we don't have them yet
    if (companyMembers.length === 0) {
      setIsLoadingMembers(true);
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/companies/${companyId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch company members");
        }

        const company = await response.json();
        setCompanyMembers(company.members || []);
      } catch (error) {
        console.error("Error fetching company members:", error);
      } finally {
        setIsLoadingMembers(false);
      }
    }
  };

  const handleSubmitActionItem = async () => {
    if (!actionItemTitle.trim() || !companyId) return;

    try {
      setIsSubmittingActionItem(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies/${companyId}/action-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: actionItemTitle.trim(),
          description: actionItemDescription.trim() || undefined,
          assigneeId: actionItemAssigneeId || undefined,
          dueDate: actionItemDueDate || undefined,
          priority: actionItemPriority,
          meetingId: id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create action item");
      }

      await refetch();
      resetActionItemForm();
      setActionItemDialogOpen(false);
    } catch (error) {
      console.error("Error creating action item:", error);
      alert("Failed to create action item. Please try again.");
    } finally {
      setIsSubmittingActionItem(false);
    }
  };

  // Documents functions
  const resetDocumentForm = () => {
    setDocumentName("");
    setDocumentDescription("");
    setDocumentFile(null);
  };

  const openDocumentDialog = () => {
    resetDocumentForm();
    setDocumentDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      if (!documentName) {
        setDocumentName(file.name.replace(/\.[^/.]+$/, "")); // Set name from filename without extension
      }
    }
  };

  const handleUploadDocument = async () => {
    if (!documentFile || !documentName.trim() || !meeting?.companyId) return;

    try {
      setIsUploadingDocument(true);
      const token = await getToken();

      const formData = new FormData();
      formData.append("file", documentFile);
      formData.append("name", documentName.trim());
      formData.append("type", "MEETING");
      formData.append("meetingId", id); // Associate with this meeting
      if (documentDescription.trim()) {
        formData.append("description", documentDescription.trim());
      }

      const response = await fetch(`${API_URL}/companies/${companyId}/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload document");
      }

      // Refresh meeting data to show the new document
      await refetch();

      resetDocumentForm();
      setDocumentDialogOpen(false);
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Failed to upload document. Please try again.");
    } finally {
      setIsUploadingDocument(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-red-100 p-3">
          <Calendar className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Meeting not found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {error || "The meeting you're looking for doesn't exist."}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={`/companies/${companyId}/meetings`}>Back to Meetings</Link>
        </Button>
      </div>
    );
  }

  const scheduledDate = new Date(meeting.scheduledAt);
  const isUpcoming = scheduledDate > new Date() && meeting.status === "SCHEDULED";
  const isInProgress = meeting.status === "IN_PROGRESS";

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/companies/${companyId}/meetings`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{meeting.title}</h1>
              <Badge className={statusColors[meeting.status]} variant="secondary">
                {statusLabels[meeting.status]}
              </Badge>
            </div>
            {meeting.description && (
              <p className="mt-1 text-muted-foreground">{meeting.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isUpcoming && (
            <Button variant="outline" asChild>
              <Link href={`/companies/${companyId}/meetings/${meeting.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {(isUpcoming || isInProgress) && (
            <Button asChild>
              <Link href={`/companies/${companyId}/meetings/${meeting.id}/live`}>
                <Play className="mr-2 h-4 w-4" />
                {isInProgress ? "Join Meeting" : "Start Meeting"}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 md:col-span-2">
          {/* Meeting Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Meeting Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(scheduledDate, "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm text-muted-foreground">
                      {format(scheduledDate, "h:mm a")} ({meeting.duration} min)
                    </p>
                  </div>
                </div>
                {meeting.location && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{meeting.location}</p>
                    </div>
                  </div>
                )}
                {meeting.videoLink && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Video Call</p>
                      <a
                        href={meeting.videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Join Video Call
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agenda */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Agenda</CardTitle>
                <CardDescription>
                  {isUpcoming ? "Drag items to reorder" : "Meeting agenda items"}
                </CardDescription>
              </div>
              {isUpcoming && (
                <Button size="sm" variant="outline" onClick={openAddAgendaDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {localAgendaItems.length > 0 ? (
                isUpcoming ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleAgendaDragEnd}
                  >
                    <SortableContext
                      items={localAgendaItems.map((a) => a.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {localAgendaItems.map((item, index) => (
                          <SortableAgendaItem
                            key={item.id}
                            item={item}
                            index={index}
                            onEdit={openEditAgendaDialog}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="space-y-4">
                    {localAgendaItems.map((item, index) => (
                      <div key={item.id} className="flex gap-4 group">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{item.title}</h4>
                          {item.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            {item.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.duration} min
                              </span>
                            )}
                            {item.createdBy && (
                              <span className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Avatar className="h-4 w-4">
                                      <AvatarImage src={item.createdBy.imageUrl || undefined} />
                                      <AvatarFallback className="text-[8px]">
                                        {getInitials(item.createdBy.firstName, item.createdBy.lastName)}
                                      </AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{getFullName(item.createdBy.firstName, item.createdBy.lastName)}</p>
                                  </TooltipContent>
                                </Tooltip>
                                Added by {item.createdBy.firstName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="py-8 text-center">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No agenda items yet
                  </p>
                  {isUpcoming && (
                    <Button size="sm" variant="outline" className="mt-4" onClick={openAddAgendaDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Item
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Decisions */}
          {meeting.decisions && meeting.decisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Decisions</CardTitle>
                <CardDescription>Decisions made during this meeting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {meeting.decisions.map((decision) => (
                    <div key={decision.id} className="flex items-start gap-4 rounded-lg border p-4">
                      {decision.createdBy ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={decision.createdBy.imageUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(decision.createdBy.firstName, decision.createdBy.lastName)}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getFullName(decision.createdBy.firstName, decision.createdBy.lastName)}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Vote className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{decision.title}</h4>
                        {decision.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {decision.description}
                          </p>
                        )}
                      </div>
                      {decision.outcome && (
                        <Badge
                          variant={decision.outcome === "PASSED" ? "default" : "secondary"}
                        >
                          {decision.outcome}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attendees */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Attendees</CardTitle>
              {isUpcoming && (
                <Button size="sm" variant="ghost" onClick={openAttendeesDialog}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {meeting.attendees && meeting.attendees.length > 0 ? (
                <div className="space-y-3">
                  {meeting.attendees.map((attendee) => (
                    <div key={attendee.id} className="flex items-center gap-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={attendee.member?.user?.imageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(attendee.member?.user?.firstName, attendee.member?.user?.lastName)}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getFullName(attendee.member?.user?.firstName, attendee.member?.user?.lastName)}</p>
                        </TooltipContent>
                      </Tooltip>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {attendee.member?.user?.firstName} {attendee.member?.user?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attendee.member?.title || attendee.member?.role}
                        </p>
                      </div>
                      {attendee.isPresent !== null && (
                        <Badge variant={attendee.isPresent ? "default" : "secondary"}>
                          {attendee.isPresent ? "Present" : "Absent"}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No attendees added
                  </p>
                  {isUpcoming && (
                    <Button size="sm" variant="outline" className="mt-4" onClick={openAttendeesDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Attendees
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Documents</CardTitle>
              <Button size="sm" variant="ghost" onClick={openDocumentDialog}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {meeting.documents && meeting.documents.length > 0 ? (
                <div className="space-y-3">
                  {meeting.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                        <FileText className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.document?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.document?.uploader?.firstName} {doc.document?.uploader?.lastName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No documents attached
                  </p>
                  <Button size="sm" variant="outline" className="mt-4" onClick={openDocumentDialog}>
                    Attach Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Action Items</CardTitle>
              <Button size="sm" variant="ghost" onClick={openActionItemDialog}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {meeting.actionItems && meeting.actionItems.length > 0 ? (
                <div className="space-y-3">
                  {meeting.actionItems.map((item: any) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className={`mt-0.5 h-2 w-2 rounded-full ${
                        item.status === "COMPLETED" ? "bg-green-500" :
                        item.status === "IN_PROGRESS" ? "bg-blue-500" :
                        "bg-gray-300"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${item.status === "COMPLETED" ? "line-through text-muted-foreground" : ""}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        )}
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          {item.assignee && (
                            <span className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={item.assignee.imageUrl} />
                                <AvatarFallback className="text-[8px]">
                                  {getInitials(item.assignee.firstName, item.assignee.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              {item.assignee.firstName}
                            </span>
                          )}
                          {item.dueDate && (
                            <span>Due {format(new Date(item.dueDate), "MMM d")}</span>
                          )}
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 ${
                            item.priority === "HIGH" ? "border-red-300 text-red-700" :
                            item.priority === "LOW" ? "border-gray-300 text-gray-600" :
                            "border-amber-300 text-amber-700"
                          }`}>
                            {item.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No action items yet
                  </p>
                  <Button size="sm" variant="outline" className="mt-4" onClick={openActionItemDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Action Item
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Agenda Item Dialog (Add/Edit) */}
      <Dialog open={agendaDialogOpen} onOpenChange={(open) => {
        setAgendaDialogOpen(open);
        if (!open) resetAgendaForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAgendaId ? "Edit Agenda Item" : "Add Agenda Item"}</DialogTitle>
            <DialogDescription>
              {editingAgendaId ? "Update the agenda item details." : "Add a new item to the meeting agenda."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="agenda-title">Title</Label>
              <Input
                id="agenda-title"
                placeholder="e.g., Review Q4 Financial Report"
                value={agendaTitle}
                onChange={(e) => setAgendaTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agenda-description">Description (optional)</Label>
              <Textarea
                id="agenda-description"
                placeholder="Brief description of the agenda item..."
                value={agendaDescription}
                onChange={(e) => setAgendaDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agenda-duration">Duration (minutes, optional)</Label>
              <Input
                id="agenda-duration"
                type="number"
                placeholder="e.g., 15"
                value={agendaDuration}
                onChange={(e) => setAgendaDuration(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAgendaDialogOpen(false)}
              disabled={isSubmittingAgenda}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitAgendaItem} disabled={isSubmittingAgenda || !agendaTitle.trim()}>
              {isSubmittingAgenda && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAgendaId ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendees Dialog */}
      <Dialog open={attendeesDialogOpen} onOpenChange={setAttendeesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Attendees</DialogTitle>
            <DialogDescription>
              Select company members to add as meeting attendees.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableMembers.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMemberIds.includes(member.id)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleMemberSelection(member.id)}
                  >
                    <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                      selectedMemberIds.includes(member.id)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    }`}>
                      {selectedMemberIds.includes(member.id) && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
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
            ) : (
              <div className="py-8 text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  All company members are already attendees
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAttendeesDialogOpen(false)}
              disabled={isAddingAttendees}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAttendees}
              disabled={isAddingAttendees || selectedMemberIds.length === 0}
            >
              {isAddingAttendees && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {selectedMemberIds.length > 0 ? `(${selectedMemberIds.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Item Dialog */}
      <Dialog open={actionItemDialogOpen} onOpenChange={(open) => {
        setActionItemDialogOpen(open);
        if (!open) resetActionItemForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Action Item</DialogTitle>
            <DialogDescription>
              Create a new action item for this meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="action-title">Title</Label>
              <Input
                id="action-title"
                placeholder="e.g., Follow up with finance team"
                value={actionItemTitle}
                onChange={(e) => setActionItemTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="action-description">Description (optional)</Label>
              <Textarea
                id="action-description"
                placeholder="Additional details about the action item..."
                value={actionItemDescription}
                onChange={(e) => setActionItemDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="action-assignee">Assignee (optional)</Label>
              <Select value={actionItemAssigneeId} onValueChange={setActionItemAssigneeId}>
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
                <Label htmlFor="action-due-date">Due Date (optional)</Label>
                <Input
                  id="action-due-date"
                  type="date"
                  value={actionItemDueDate}
                  onChange={(e) => setActionItemDueDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="action-priority">Priority</Label>
                <Select value={actionItemPriority} onValueChange={(v) => setActionItemPriority(v as "HIGH" | "MEDIUM" | "LOW")}>
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
            <Button
              variant="outline"
              onClick={() => setActionItemDialogOpen(false)}
              disabled={isSubmittingActionItem}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitActionItem} disabled={isSubmittingActionItem || !actionItemTitle.trim()}>
              {isSubmittingActionItem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Action Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={(open) => {
        setDocumentDialogOpen(open);
        if (!open) resetDocumentForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document to attach to this meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="document-file">File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="document-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
              {documentFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {documentFile.name} ({(documentFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document-name">Document Name</Label>
              <Input
                id="document-name"
                placeholder="e.g., Q4 Financial Report"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document-description">Description (optional)</Label>
              <Textarea
                id="document-description"
                placeholder="Brief description of the document..."
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDocumentDialogOpen(false)}
              disabled={isUploadingDocument}
            >
              Cancel
            </Button>
            <Button onClick={handleUploadDocument} disabled={isUploadingDocument || !documentFile || !documentName.trim()}>
              {isUploadingDocument && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
