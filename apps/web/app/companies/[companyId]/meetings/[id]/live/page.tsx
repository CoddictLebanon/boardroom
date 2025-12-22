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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  FileText,
  CheckSquare,
  Vote,
  Play,
  Pause,
  Square,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Timer,
  StickyNote,
  User,
  Pencil,
  Trash2,
  MoreHorizontal,
  GripVertical,
  Paperclip,
  Upload,
  Download,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMeeting } from "@/lib/hooks/use-meetings";
import {
  useMeetingSocket,
  MeetingNote,
  AgendaItem as AgendaItemType,
  Decision as DecisionType,
  ActionItem as ActionItemType,
} from "@/lib/socket/use-meeting-socket";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

import { MeetingDocument } from "@/lib/types";

type VoteType = "FOR" | "AGAINST" | "ABSTAIN";

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
    imageUrl?: string;
  };
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
}

function getFullName(firstName?: string | null, lastName?: string | null) {
  return `${firstName || ""} ${lastName || ""}`.trim() || "Unknown";
}

// Avatar with tooltip showing the person's name
function AvatarWithTooltip({
  imageUrl,
  firstName,
  lastName,
  size = "default",
}: {
  imageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: "default" | "sm" | "xs";
}) {
  const sizeClasses = {
    default: "h-10 w-10",
    sm: "h-8 w-8",
    xs: "h-5 w-5",
  };
  const fallbackClasses = {
    default: "",
    sm: "text-xs",
    xs: "text-[8px]",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={imageUrl || undefined} />
          <AvatarFallback className={fallbackClasses[size]}>
            {getInitials(firstName, lastName)}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getFullName(firstName, lastName)}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Sortable note item for drag-and-drop
interface SortableNoteProps {
  note: MeetingNote;
  isActive: boolean;
  isOwner: boolean;
  editingNoteId: string | null;
  editingNoteContent: string;
  setEditingNoteContent: (content: string) => void;
  onEdit: (note: MeetingNote) => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: (noteId: string) => void;
}

function SortableNote({
  note,
  isActive,
  isOwner,
  editingNoteId,
  editingNoteContent,
  setEditingNoteContent,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: SortableNoteProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border p-3 bg-background"
    >
      {editingNoteId === note.id ? (
        <div className="space-y-2">
          <Textarea
            value={editingNoteContent}
            onChange={(e) => setEditingNoteContent(e.target.value)}
            className="min-h-[80px]"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={!editingNoteContent.trim()}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            {isActive && (
              <button
                className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-start gap-3 flex-1">
              <AvatarWithTooltip
                imageUrl={note.createdBy?.imageUrl}
                firstName={note.createdBy?.firstName}
                lastName={note.createdBy?.lastName}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {note.createdBy?.firstName} {note.createdBy?.lastName}
                  </span>
                  <span>•</span>
                  <span>{format(new Date(note.createdAt), "MMM d, h:mm a")}</span>
                </div>
              </div>
            </div>
            {isActive && isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(note)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(note.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Sortable agenda item component
interface SortableAgendaItemProps {
  item: any;
  index: number;
  isActive: boolean;
}

function SortableAgendaItem({ item, index, isActive }: SortableAgendaItemProps) {
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
    <div ref={setNodeRef} style={style} className="flex gap-3 rounded-lg border p-3">
      {isActive && (
        <button
          className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
        {index + 1}
      </div>
      <div className="flex-1">
        <h4 className="font-medium">{item.title}</h4>
        {item.description && (
          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        )}
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          {item.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.duration} min
            </span>
          )}
          {item.createdBy && (
            <span className="flex items-center gap-1">
              <AvatarWithTooltip
                imageUrl={item.createdBy.imageUrl}
                firstName={item.createdBy.firstName}
                lastName={item.createdBy.lastName}
                size="xs"
              />
              Added by {item.createdBy.firstName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Sortable decision component
interface SortableDecisionProps {
  decision: any;
  isActive: boolean;
  currentUser: any;
  attendees: any[];
  isCastingVote: boolean;
  onCastVote: (decisionId: string, vote: VoteType) => void;
  onFinalizeVote: (decisionId: string, outcome: "PASSED" | "REJECTED") => void;
}

function SortableDecision({
  decision,
  isActive,
  currentUser,
  attendees,
  isCastingVote,
  onCastVote,
  onFinalizeVote,
}: SortableDecisionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: decision.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const votes = decision.votes || [];
  const forVotes = votes.filter((v: { vote: string }) => v.vote === "FOR").length;
  const againstVotes = votes.filter((v: { vote: string }) => v.vote === "AGAINST").length;
  const abstainVotes = votes.filter((v: { vote: string }) => v.vote === "ABSTAIN").length;
  const myVote = votes.find((v: { userId: string; vote: string }) => v.userId === currentUser?.id);
  const isOpenForVoting = !decision.outcome;
  const isCurrentUserAttendee = attendees.some((a) => a.member?.userId === currentUser?.id && a.isPresent);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border p-4 ${isOpenForVoting ? "border-purple-200 bg-purple-50/50" : ""}`}
    >
      {/* Decision Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {isActive && (
            <button
              className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          {decision.createdBy && (
            <AvatarWithTooltip
              imageUrl={decision.createdBy.imageUrl}
              firstName={decision.createdBy.firstName}
              lastName={decision.createdBy.lastName}
              size="sm"
            />
          )}
          <div>
            <p className="font-medium">{decision.title}</p>
            {decision.description && (
              <p className="text-sm text-muted-foreground">{decision.description}</p>
            )}
          </div>
        </div>
        <Badge
          variant={decision.outcome === "PASSED" ? "default" : "secondary"}
          className={
            decision.outcome === "PASSED" ? "bg-green-100 text-green-800" :
            decision.outcome === "REJECTED" ? "bg-red-100 text-red-800" :
            "bg-purple-100 text-purple-800"
          }
        >
          {decision.outcome || "Open for Voting"}
        </Badge>
      </div>

      {/* Voting Section */}
      {isOpenForVoting && isActive && (
        <div className="mt-4 space-y-3">
          {/* Current User Vote Buttons */}
          {isCurrentUserAttendee ? (
            <div className="flex items-center justify-between rounded-lg border bg-white p-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Your Vote:</span>
                {myVote && (
                  <Badge variant="outline" className={
                    myVote.vote === "FOR" ? "border-green-500 text-green-700" :
                    myVote.vote === "AGAINST" ? "border-red-500 text-red-700" :
                    "border-gray-500 text-gray-700"
                  }>
                    {myVote.vote}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={myVote?.vote === "FOR" ? "default" : "outline"}
                  className={myVote?.vote === "FOR" ? "bg-green-600 hover:bg-green-700" : ""}
                  onClick={() => onCastVote(decision.id, "FOR")}
                  disabled={isCastingVote}
                >
                  {isCastingVote ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span className="ml-1">For</span>
                </Button>
                <Button
                  size="sm"
                  variant={myVote?.vote === "AGAINST" ? "default" : "outline"}
                  className={myVote?.vote === "AGAINST" ? "bg-red-600 hover:bg-red-700" : ""}
                  onClick={() => onCastVote(decision.id, "AGAINST")}
                  disabled={isCastingVote}
                >
                  {isCastingVote ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  <span className="ml-1">Against</span>
                </Button>
                <Button
                  size="sm"
                  variant={myVote?.vote === "ABSTAIN" ? "default" : "outline"}
                  className={myVote?.vote === "ABSTAIN" ? "bg-gray-600 hover:bg-gray-700" : ""}
                  onClick={() => onCastVote(decision.id, "ABSTAIN")}
                  disabled={isCastingVote}
                >
                  {isCastingVote ? <Loader2 className="h-4 w-4 animate-spin" /> : <MinusCircle className="h-4 w-4" />}
                  <span className="ml-1">Abstain</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-700">
              You must be a present attendee to vote on this decision.
            </div>
          )}

          {/* Vote Tally */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-4">
              <span className="text-green-600 font-medium">For: {forVotes}</span>
              <span className="text-red-600 font-medium">Against: {againstVotes}</span>
              <span className="text-gray-600 font-medium">Abstain: {abstainVotes}</span>
              <span className="text-muted-foreground">Total: {votes.length}</span>
            </div>
            {/* Close Voting Buttons */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onFinalizeVote(decision.id, "REJECTED")}>
                Close as Rejected
              </Button>
              <Button size="sm" onClick={() => onFinalizeVote(decision.id, "PASSED")}>
                Close as Passed
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Final Vote Results for closed decisions */}
      {decision.outcome && votes.length > 0 && (
        <div className="mt-2 text-sm text-muted-foreground">
          Final tally: For {forVotes} • Against {againstVotes} • Abstain {abstainVotes}
        </div>
      )}
    </div>
  );
}

// Sortable action item component
interface SortableActionItemProps {
  item: any;
  isActive: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}

function SortableActionItem({ item, isActive, onEdit, onDelete }: SortableActionItemProps) {
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
    <div ref={setNodeRef} style={style} className="flex items-start gap-3 rounded-lg border p-3">
      {isActive && (
        <button
          className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
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
      {isActive && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export default function LiveMeetingPage({
  params,
}: {
  params: Promise<{ id: string; companyId: string }>;
}) {
  const { id, companyId } = use(params);
  const router = useRouter();
  const { meeting, isLoading, error, refetch } = useMeeting(id);
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const {
    onNoteCreated,
    onNoteUpdated,
    onNoteDeleted,
    onNotesReordered,
    onAgendaCreated,
    onAgendaUpdated,
    onAgendaDeleted,
    onAgendaReordered,
    onDecisionCreated,
    onDecisionUpdated,
    onDecisionDeleted,
    onDecisionReordered,
    onActionItemCreated,
    onActionItemUpdated,
    onActionItemDeleted,
    onActionItemReordered,
    onVoteUpdate,
  } = useMeetingSocket(id);

  // dnd-kit sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [isStarting, setIsStarting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Confirmation dialogs
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Vote/Decision state
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [voteTitle, setVoteTitle] = useState("");
  const [voteDescription, setVoteDescription] = useState("");

  // Agenda item state
  const [agendaDialogOpen, setAgendaDialogOpen] = useState(false);
  const [agendaTitle, setAgendaTitle] = useState("");
  const [agendaDescription, setAgendaDescription] = useState("");
  const [agendaDuration, setAgendaDuration] = useState("");
  const [isSubmittingAgenda, setIsSubmittingAgenda] = useState(false);
  const [includeVoting, setIncludeVoting] = useState(true);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [isCastingVote, setIsCastingVote] = useState(false);
  const [activeVote, setActiveVote] = useState<{
    id: string;
    title: string;
    description?: string;
  } | null>(null);

  // Attendance state
  const [attendanceUpdating, setAttendanceUpdating] = useState<string | null>(null);
  const [attendeeDialogOpen, setAttendeeDialogOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isAddingAttendees, setIsAddingAttendees] = useState(false);

  // Action item state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [actionAssigneeId, setActionAssigneeId] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [actionPriority, setActionPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [deletingActionId, setDeletingActionId] = useState<string | null>(null);
  const [showDeleteActionConfirm, setShowDeleteActionConfirm] = useState(false);

  // Meeting notes state (new multi-note system)
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(false);

  // Real-time state for agenda items, decisions, and action items
  const [agendaItems, setAgendaItems] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);

  // Documents state
  const [meetingDocuments, setMeetingDocuments] = useState<MeetingDocument[]>([]);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  // Load company members for action item assignment
  useEffect(() => {
    const loadMembers = async () => {
      if (!companyId) return;
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const company = await response.json();
          setCompanyMembers(company.members || []);
        }
      } catch (error) {
        console.error("Error loading members:", error);
      }
    };
    loadMembers();
  }, [companyId, getToken]);

  // Load meeting data when meeting loads
  useEffect(() => {
    if (meeting?.meetingNotes) {
      setNotes(meeting.meetingNotes);
    }
    if (meeting?.agendaItems) {
      setAgendaItems(meeting.agendaItems);
    }
    if (meeting?.decisions) {
      setDecisions(meeting.decisions);
    }
    if (meeting?.actionItems) {
      setActionItems(meeting.actionItems);
    }
    if (meeting?.documents) {
      setMeetingDocuments(meeting.documents);
    }
  }, [meeting?.meetingNotes, meeting?.agendaItems, meeting?.decisions, meeting?.actionItems, meeting?.documents]);

  // Set up socket event handlers for real-time note updates
  useEffect(() => {
    const unsubCreated = onNoteCreated((note) => {
      setNotes((prev) => {
        // Avoid duplicates
        if (prev.some((n) => n.id === note.id)) return prev;
        return [...prev, note];
      });
    });

    const unsubUpdated = onNoteUpdated((note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    });

    const unsubDeleted = onNoteDeleted(({ id }) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    });

    const unsubReordered = onNotesReordered(({ noteIds }) => {
      setNotes((prev) => {
        const noteMap = new Map(prev.map((n) => [n.id, n]));
        return noteIds.map((id) => noteMap.get(id)).filter(Boolean) as MeetingNote[];
      });
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubReordered();
    };
  }, [onNoteCreated, onNoteUpdated, onNoteDeleted, onNotesReordered]);

  // Set up socket event handlers for real-time agenda updates
  useEffect(() => {
    const unsubCreated = onAgendaCreated((item) => {
      setAgendaItems((prev) => {
        if (prev.some((a) => a.id === item.id)) return prev;
        return [...prev, item].sort((a, b) => a.order - b.order);
      });
    });

    const unsubUpdated = onAgendaUpdated((item) => {
      setAgendaItems((prev) => prev.map((a) => (a.id === item.id ? item : a)));
    });

    const unsubDeleted = onAgendaDeleted(({ id }) => {
      setAgendaItems((prev) => prev.filter((a) => a.id !== id));
    });

    const unsubReordered = onAgendaReordered(({ itemIds }) => {
      setAgendaItems((prev) => {
        const itemMap = new Map(prev.map((a) => [a.id, a]));
        return itemIds.map((id) => itemMap.get(id)).filter(Boolean);
      });
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubReordered();
    };
  }, [onAgendaCreated, onAgendaUpdated, onAgendaDeleted, onAgendaReordered]);

  // Set up socket event handlers for real-time decision updates
  useEffect(() => {
    const unsubCreated = onDecisionCreated((decision) => {
      setDecisions((prev) => {
        if (prev.some((d) => d.id === decision.id)) return prev;
        return [...prev, decision].sort((a, b) => a.order - b.order);
      });
    });

    const unsubUpdated = onDecisionUpdated((decision) => {
      setDecisions((prev) => prev.map((d) => (d.id === decision.id ? decision : d)));
    });

    const unsubDeleted = onDecisionDeleted(({ id }) => {
      setDecisions((prev) => prev.filter((d) => d.id !== id));
    });

    const unsubReordered = onDecisionReordered(({ decisionIds }) => {
      setDecisions((prev) => {
        const decisionMap = new Map(prev.map((d) => [d.id, d]));
        return decisionIds.map((id) => decisionMap.get(id)).filter(Boolean);
      });
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubReordered();
    };
  }, [onDecisionCreated, onDecisionUpdated, onDecisionDeleted, onDecisionReordered]);

  // Set up socket event handler for real-time vote updates
  useEffect(() => {
    const unsubVote = onVoteUpdate(({ decisionId, voterId, vote, tally }) => {
      setDecisions((prev) =>
        prev.map((d) => {
          if (d.id !== decisionId) return d;
          // Update votes array
          const existingVoteIndex = d.votes?.findIndex((v: { userId: string }) => v.userId === voterId) ?? -1;
          const newVotes = d.votes ? [...d.votes] : [];
          if (existingVoteIndex >= 0) {
            newVotes[existingVoteIndex] = { ...newVotes[existingVoteIndex], vote };
          } else {
            newVotes.push({ userId: voterId, vote, decisionId });
          }
          return { ...d, votes: newVotes };
        })
      );
    });

    return () => {
      unsubVote();
    };
  }, [onVoteUpdate]);

  // Set up socket event handlers for real-time action item updates
  useEffect(() => {
    const unsubCreated = onActionItemCreated((item) => {
      setActionItems((prev) => {
        if (prev.some((a) => a.id === item.id)) return prev;
        return [...prev, item].sort((a, b) => a.order - b.order);
      });
    });

    const unsubUpdated = onActionItemUpdated((item) => {
      setActionItems((prev) => prev.map((a) => (a.id === item.id ? item : a)));
    });

    const unsubDeleted = onActionItemDeleted(({ id }) => {
      setActionItems((prev) => prev.filter((a) => a.id !== id));
    });

    const unsubReordered = onActionItemReordered(({ itemIds }) => {
      setActionItems((prev) => {
        const itemMap = new Map(prev.map((a) => [a.id, a]));
        return itemIds.map((id) => itemMap.get(id)).filter(Boolean);
      });
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubReordered();
    };
  }, [onActionItemCreated, onActionItemUpdated, onActionItemDeleted, onActionItemReordered]);

  // Handle drag end for note reordering
  const handleNotesDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = notes.findIndex((n) => n.id === active.id);
      const newIndex = notes.findIndex((n) => n.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Optimistically update UI
      const newNotes = arrayMove(notes, oldIndex, newIndex);
      setNotes(newNotes);

      // Call API to persist reorder
      try {
        const token = await getToken();
        const response = await fetch(
          `${API_URL}/companies/${companyId}/meetings/${id}/notes/reorder`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ noteIds: newNotes.map((n) => n.id) }),
          }
        );
        if (!response.ok) {
          // Revert on failure using functional update
          setNotes((prev) => arrayMove(prev, newIndex, oldIndex));
          console.error("Failed to reorder notes");
        }
      } catch (error) {
        // Revert on error using functional update
        setNotes((prev) => arrayMove(prev, newIndex, oldIndex));
        console.error("Error reordering notes:", error);
      }
    },
    [notes, companyId, id, getToken]
  );

  const handleAgendaDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = agendaItems.findIndex((a) => a.id === active.id);
      const newIndex = agendaItems.findIndex((a) => a.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newItems = arrayMove(agendaItems, oldIndex, newIndex);
      setAgendaItems(newItems);

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
          setAgendaItems((prev) => arrayMove(prev, newIndex, oldIndex));
          console.error("Failed to reorder agenda items");
        }
      } catch (error) {
        setAgendaItems((prev) => arrayMove(prev, newIndex, oldIndex));
        console.error("Error reordering agenda items:", error);
      }
    },
    [agendaItems, companyId, id, getToken]
  );

  const handleDecisionsDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = decisions.findIndex((d) => d.id === active.id);
      const newIndex = decisions.findIndex((d) => d.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newItems = arrayMove(decisions, oldIndex, newIndex);
      setDecisions(newItems);

      try {
        const token = await getToken();
        const response = await fetch(
          `${API_URL}/companies/${companyId}/meetings/${id}/decisions/reorder`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ decisionIds: newItems.map((d) => d.id) }),
          }
        );
        if (!response.ok) {
          setDecisions((prev) => arrayMove(prev, newIndex, oldIndex));
          console.error("Failed to reorder decisions");
        }
      } catch (error) {
        setDecisions((prev) => arrayMove(prev, newIndex, oldIndex));
        console.error("Error reordering decisions:", error);
      }
    },
    [decisions, companyId, id, getToken]
  );

  const handleActionItemsDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = actionItems.findIndex((a) => a.id === active.id);
      const newIndex = actionItems.findIndex((a) => a.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newItems = arrayMove(actionItems, oldIndex, newIndex);
      setActionItems(newItems);

      try {
        const token = await getToken();
        const response = await fetch(
          `${API_URL}/companies/${companyId}/meetings/${id}/action-items/reorder`,
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
          setActionItems((prev) => arrayMove(prev, newIndex, oldIndex));
          console.error("Failed to reorder action items");
        }
      } catch (error) {
        setActionItems((prev) => arrayMove(prev, newIndex, oldIndex));
        console.error("Error reordering action items:", error);
      }
    },
    [actionItems, companyId, id, getToken]
  );

  const handleStartMeeting = async () => {
    try {
      setIsStarting(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to start meeting");
      await refetch();
      setShowStartConfirm(false);
    } catch (error) {
      console.error("Error starting meeting:", error);
      alert("Failed to start meeting. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const handlePauseMeeting = async () => {
    try {
      setIsPausing(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/pause`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to pause meeting");
      await refetch();
    } catch (error) {
      console.error("Error pausing meeting:", error);
      alert("Failed to pause meeting. Please try again.");
    } finally {
      setIsPausing(false);
    }
  };

  const handleResumeMeeting = async () => {
    try {
      setIsResuming(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/resume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to resume meeting");
      await refetch();
    } catch (error) {
      console.error("Error resuming meeting:", error);
      alert("Failed to resume meeting. Please try again.");
    } finally {
      setIsResuming(false);
    }
  };

  const handleEndMeeting = async () => {
    try {
      setIsEnding(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to end meeting");
      await refetch();
      setShowEndConfirm(false);
      router.push(`/companies/${companyId}/meetings/${id}`);
    } catch (error) {
      console.error("Error ending meeting:", error);
      alert("Failed to end meeting. Please try again.");
    } finally {
      setIsEnding(false);
    }
  };

  const handleUpdateAttendance = async (attendeeId: string, isPresent: boolean) => {
    try {
      setAttendanceUpdating(attendeeId);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/attendees/${attendeeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPresent }),
      });
      if (!response.ok) throw new Error("Failed to update attendance");
      await refetch();
    } catch (error) {
      console.error("Error updating attendance:", error);
    } finally {
      setAttendanceUpdating(null);
    }
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
        body: JSON.stringify({ memberIds: selectedMemberIds }),
      });
      if (!response.ok) throw new Error("Failed to add attendees");
      await refetch();
      setAttendeeDialogOpen(false);
      setSelectedMemberIds([]);
    } catch (error) {
      console.error("Error adding attendees:", error);
      alert("Failed to add attendees. Please try again.");
    } finally {
      setIsAddingAttendees(false);
    }
  };

  const resetVoteForm = () => {
    setVoteTitle("");
    setVoteDescription("");
    setIncludeVoting(true);
  };

  const resetAgendaForm = () => {
    setAgendaTitle("");
    setAgendaDescription("");
    setAgendaDuration("");
  };

  const handleCreateAgendaItem = async () => {
    if (!agendaTitle.trim()) return;
    try {
      setIsSubmittingAgenda(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/agenda`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: agendaTitle.trim(),
          description: agendaDescription.trim() || undefined,
          duration: agendaDuration ? parseInt(agendaDuration, 10) : undefined,
        }),
      });
      if (!response.ok) throw new Error("Failed to create agenda item");

      setAgendaDialogOpen(false);
      resetAgendaForm();
      // Socket event will handle adding the agenda item to the list
    } catch (error) {
      console.error("Error creating agenda item:", error);
      alert("Failed to create agenda item. Please try again.");
    } finally {
      setIsSubmittingAgenda(false);
    }
  };

  const handleCreateDecision = async () => {
    if (!voteTitle.trim()) return;
    try {
      setIsSubmittingVote(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/decisions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: voteTitle.trim(),
          description: voteDescription.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error("Failed to create decision");
      const decision = await response.json();

      // If voting is enabled, set this as the active vote for self-service voting
      if (includeVoting) {
        setActiveVote({
          id: decision.id,
          title: decision.title,
          description: decision.description,
        });
      }

      setVoteDialogOpen(false);
      resetVoteForm();
      // Socket event will handle adding the decision to the list
    } catch (error) {
      console.error("Error creating decision:", error);
      alert("Failed to create decision. Please try again.");
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleCastVote = async (decisionId: string, vote: VoteType) => {
    try {
      setIsCastingVote(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/decisions/${decisionId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vote }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to cast vote");
      }
      // Socket event will handle updating the decision
    } catch (error) {
      console.error("Error casting vote:", error);
      alert(error instanceof Error ? error.message : "Failed to cast vote. Please try again.");
    } finally {
      setIsCastingVote(false);
    }
  };

  const handleFinalizeVote = async (decisionId: string, outcome: "PASSED" | "REJECTED") => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/decisions/${decisionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ outcome }),
      });
      if (!response.ok) throw new Error("Failed to finalize vote");
      setActiveVote(null);
      // Socket event will handle updating the decision
    } catch (error) {
      console.error("Error finalizing vote:", error);
      alert("Failed to finalize vote. Please try again.");
    }
  };

  const resetActionForm = () => {
    setActionTitle("");
    setActionDescription("");
    setActionAssigneeId("");
    setActionDueDate("");
    setActionPriority("MEDIUM");
    setEditingActionId(null);
  };

  const handleOpenEditAction = (item: any) => {
    setEditingActionId(item.id);
    setActionTitle(item.title);
    setActionDescription(item.description || "");
    setActionAssigneeId(item.assigneeId || "");
    setActionDueDate(item.dueDate ? format(new Date(item.dueDate), "yyyy-MM-dd") : "");
    setActionPriority(item.priority || "MEDIUM");
    setActionDialogOpen(true);
  };

  const handleCreateAction = async () => {
    if (!actionTitle.trim() || !companyId) return;
    try {
      setIsSubmittingAction(true);
      const token = await getToken();

      const isEditing = !!editingActionId;
      const url = isEditing
        ? `${API_URL}/companies/${companyId}/action-items/${editingActionId}`
        : `${API_URL}/companies/${companyId}/action-items`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: actionTitle.trim(),
          description: actionDescription.trim() || undefined,
          assigneeId: actionAssigneeId || undefined,
          dueDate: actionDueDate || undefined,
          priority: actionPriority,
          ...(isEditing ? {} : { meetingId: id }),
        }),
      });
      if (!response.ok) throw new Error(`Failed to ${isEditing ? "update" : "create"} action item`);
      resetActionForm();
      setActionDialogOpen(false);
      // Socket event will handle adding/updating the action item
    } catch (error) {
      console.error("Error saving action item:", error);
      alert(`Failed to ${editingActionId ? "update" : "create"} action item. Please try again.`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleDeleteAction = async () => {
    if (!deletingActionId || !companyId) return;
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/action-items/${deletingActionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete action item");
      setShowDeleteActionConfirm(false);
      setDeletingActionId(null);
      // Socket event will handle removing the action item
    } catch (error) {
      console.error("Error deleting action item:", error);
      alert("Failed to delete action item. Please try again.");
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim() || !companyId) return;
    try {
      setIsSubmittingNote(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      if (!response.ok) throw new Error("Failed to create note");
      setNewNoteContent("");
      // Note will be added via socket event
    } catch (error) {
      console.error("Error creating note:", error);
      alert("Failed to create note. Please try again.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNoteId || !editingNoteContent.trim() || !companyId) return;
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/notes/${editingNoteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editingNoteContent.trim() }),
      });
      if (!response.ok) throw new Error("Failed to update note");
      setEditingNoteId(null);
      setEditingNoteContent("");
      // Update will be received via socket event
    } catch (error) {
      console.error("Error updating note:", error);
      alert("Failed to update note. Please try again.");
    }
  };

  const handleDeleteNote = async () => {
    if (!deletingNoteId || !companyId) return;
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/notes/${deletingNoteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete note");
      setShowDeleteNoteConfirm(false);
      setDeletingNoteId(null);
      // Delete will be received via socket event
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note. Please try again.");
    }
  };

  const handleOpenEditNote = (note: MeetingNote) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteContent("");
  };

  const resetDocumentForm = () => {
    setDocumentFile(null);
    setDocumentName("");
  };

  const handleUploadDocument = async () => {
    if (!documentFile || !companyId) return;
    try {
      setIsUploadingDocument(true);
      const token = await getToken();

      const formData = new FormData();
      formData.append("file", documentFile);
      formData.append("name", documentName.trim() || documentFile.name);
      formData.append("type", "MEETING_MATERIAL");
      formData.append("meetingId", id);

      const response = await fetch(`${API_URL}/companies/${companyId}/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload document");

      const newDoc = await response.json();
      // Add to meeting documents list
      if (newDoc.meetings && newDoc.meetings.length > 0) {
        setMeetingDocuments((prev) => [
          ...prev,
          {
            id: newDoc.meetings[0].id,
            documentId: newDoc.id,
            meetingId: id,
            isPreRead: false,
            document: {
              id: newDoc.id,
              companyId: newDoc.companyId,
              folderId: newDoc.folderId,
              uploaderId: newDoc.uploaderId,
              name: newDoc.name,
              description: newDoc.description,
              type: newDoc.type,
              mimeType: newDoc.mimeType,
              size: newDoc.size,
              storageKey: newDoc.storageKey,
              version: newDoc.version,
              uploader: newDoc.uploader,
            },
          },
        ]);
      }

      setDocumentDialogOpen(false);
      resetDocumentForm();
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Failed to upload document. Please try again.");
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleViewDocument = async (documentId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/documents/${documentId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to get download URL");
      const { url } = await response.json();
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error viewing document:", error);
      alert("Failed to open document. Please try again.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

  const isScheduled = meeting.status === "SCHEDULED";
  const isInProgress = meeting.status === "IN_PROGRESS";
  const isPaused = meeting.status === "PAUSED";
  const isActive = isInProgress || isPaused;
  const attendees = meeting.attendees || [];

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/companies/${companyId}/meetings/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{meeting.title}</h1>
              <Badge
                variant="secondary"
                className={
                  isInProgress ? "bg-green-100 text-green-800" :
                  isPaused ? "bg-amber-100 text-amber-800" :
                  "bg-blue-100 text-blue-800"
                }
              >
                {isPaused ? "Paused" : isInProgress ? "In Progress" : "Ready to Start"}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {format(new Date(meeting.scheduledAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isScheduled && (
            <Button onClick={() => setShowStartConfirm(true)}>
              <Play className="mr-2 h-4 w-4" />
              Start Meeting
            </Button>
          )}
          {isInProgress && (
            <>
              <Button variant="outline" onClick={handlePauseMeeting} disabled={isPausing}>
                {isPausing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="mr-2 h-4 w-4" />
                )}
                Pause
              </Button>
              <Button variant="destructive" onClick={() => setShowEndConfirm(true)}>
                <Square className="mr-2 h-4 w-4" />
                Stop Meeting
              </Button>
            </>
          )}
          {isPaused && (
            <>
              <Button onClick={handleResumeMeeting} disabled={isResuming}>
                {isResuming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Resume
              </Button>
              <Button variant="destructive" onClick={() => setShowEndConfirm(true)}>
                <Square className="mr-2 h-4 w-4" />
                Stop Meeting
              </Button>
            </>
          )}
        </div>
      </div>

      {!isActive && isScheduled && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-full bg-amber-100 p-2">
              <Timer className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800">Meeting hasn't started yet</p>
              <p className="text-sm text-amber-700">Click "Start Meeting" to begin and enable attendance tracking and voting.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Attendance</CardTitle>
                <CardDescription>
                  {attendees.filter((a) => a.isPresent).length} of {attendees.length} present
                </CardDescription>
              </div>
            </div>
            {isActive && (
              <Button size="sm" onClick={() => setAttendeeDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Attendee
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {attendees.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {attendees.map((attendee) => (
                <div key={attendee.id} className="flex items-center gap-3 rounded-lg border p-3 min-w-[200px]">
                  <AvatarWithTooltip
                    imageUrl={attendee.member?.user?.imageUrl}
                    firstName={attendee.member?.user?.firstName}
                    lastName={attendee.member?.user?.lastName}
                    size="default"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {attendee.member?.user?.firstName} {attendee.member?.user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attendee.member?.title || attendee.member?.role}
                    </p>
                  </div>
                  {isActive && (
                    <Button
                      size="sm"
                      variant={attendee.isPresent ? "default" : "secondary"}
                      className={attendee.isPresent ? "bg-green-600 hover:bg-green-700" : ""}
                      onClick={() => handleUpdateAttendance(attendee.id, !attendee.isPresent)}
                      disabled={attendanceUpdating === attendee.id}
                    >
                      {attendanceUpdating === attendee.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : attendee.isPresent ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Present
                        </>
                      ) : (
                        "Mark Present"
                      )}
                    </Button>
                  )}
                  {!isActive && (
                    <div className={`h-2 w-2 rounded-full ${attendee.isPresent ? "bg-green-500" : "bg-gray-300"}`} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">No attendees added</div>
          )}
        </CardContent>
      </Card>

      {/* Main Content - 2 Column Grid Layout */}
      <div className="space-y-6">
        {/* Row 1: Agenda | Decisions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agenda Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Agenda</CardTitle>
                    <CardDescription>{agendaItems.length} items</CardDescription>
                  </div>
                </div>
                {isActive && (
                  <Button size="sm" onClick={() => setAgendaDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {agendaItems.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleAgendaDragEnd}
                >
                  <SortableContext
                    items={agendaItems.map((a) => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {agendaItems.map((item, index) => (
                        <SortableAgendaItem
                          key={item.id}
                          item={item}
                          index={index}
                          isActive={isActive}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="py-8 text-center">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No agenda items</p>
                  {isActive && (
                    <Button size="sm" variant="outline" className="mt-4" onClick={() => setAgendaDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Agenda Item
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Decisions Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <Vote className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Decisions</CardTitle>
                    <CardDescription>Record decisions with voting</CardDescription>
                  </div>
                </div>
                {isActive && !activeVote && (
                  <Button size="sm" onClick={() => setVoteDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {decisions.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDecisionsDragEnd}
                >
                  <SortableContext
                    items={decisions.map((d) => d.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {decisions.map((decision) => (
                        <SortableDecision
                          key={decision.id}
                          decision={decision}
                          isActive={isActive}
                          currentUser={currentUser}
                          attendees={attendees}
                          isCastingVote={isCastingVote}
                          onCastVote={handleCastVote}
                          onFinalizeVote={handleFinalizeVote}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="py-8 text-center">
                  <Vote className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No decisions yet</p>
                  {isActive && (
                    <Button size="sm" variant="outline" className="mt-4" onClick={() => setVoteDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Decision
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Action Items | Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Action Items Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-100 p-2">
                    <CheckSquare className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle>Action Items</CardTitle>
                    <CardDescription>Tasks from this meeting</CardDescription>
                  </div>
                </div>
                {isActive && (
                  <Button size="sm" onClick={() => setActionDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {actionItems.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleActionItemsDragEnd}
                >
                  <SortableContext
                    items={actionItems.map((a) => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {actionItems.map((item: any) => (
                        <SortableActionItem
                          key={item.id}
                          item={item}
                          isActive={isActive}
                          onEdit={handleOpenEditAction}
                          onDelete={(id) => {
                            setDeletingActionId(id);
                            setShowDeleteActionConfirm(true);
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="py-8 text-center">
                  <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No action items yet</p>
                  {isActive && (
                    <Button size="sm" variant="outline" className="mt-4" onClick={() => setActionDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Action Item
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-slate-100 p-2">
                  <StickyNote className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <CardTitle>Meeting Notes</CardTitle>
                  <CardDescription>{notes.length} note{notes.length !== 1 ? "s" : ""}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add Note Input */}
              {isActive && (
                <div className="mb-4 flex gap-2">
                  <Input
                    placeholder="Add a note..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCreateNote();
                      }
                    }}
                    disabled={isSubmittingNote}
                  />
                  <Button onClick={handleCreateNote} disabled={isSubmittingNote || !newNoteContent.trim()}>
                    {isSubmittingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              )}

              {/* Notes List with Drag-and-Drop */}
              {notes.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleNotesDragEnd}
                >
                  <SortableContext
                    items={notes.map((n) => n.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <SortableNote
                          key={note.id}
                          note={note}
                          isActive={isActive}
                          isOwner={note.createdById === currentUser?.id}
                          editingNoteId={editingNoteId}
                          editingNoteContent={editingNoteContent}
                          setEditingNoteContent={setEditingNoteContent}
                          onEdit={handleOpenEditNote}
                          onCancelEdit={handleCancelEditNote}
                          onSave={handleUpdateNote}
                          onDelete={(noteId) => {
                            setDeletingNoteId(noteId);
                            setShowDeleteNoteConfirm(true);
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="py-8 text-center">
                  <StickyNote className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No notes yet</p>
                  {!isActive && (
                    <p className="mt-1 text-xs text-muted-foreground">Start the meeting to add notes</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Documents (full width) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-cyan-100 p-2">
                  <Paperclip className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>{meetingDocuments.length} document{meetingDocuments.length !== 1 ? "s" : ""}</CardDescription>
                </div>
              </div>
              {isActive && (
                <Button size="sm" onClick={() => setDocumentDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {meetingDocuments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meetingDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="rounded-lg bg-muted p-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.document.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.document.size || 0)}</span>
                        {doc.document.uploader && (
                          <>
                            <span>•</span>
                            <span>{doc.document.uploader.firstName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleViewDocument(doc.document.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Paperclip className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No documents attached</p>
                {isActive && (
                  <Button size="sm" variant="outline" className="mt-4" onClick={() => setDocumentDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Start Meeting Confirmation Dialog */}
      <AlertDialog open={showStartConfirm} onOpenChange={setShowStartConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will start the meeting and enable attendance tracking and voting.
              All attendees will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartMeeting} disabled={isStarting}>
              {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Meeting Confirmation Dialog */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the meeting and send a summary email to all attendees.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndMeeting} disabled={isEnding} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isEnding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              End Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decision Dialog */}
      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Decision</DialogTitle>
            <DialogDescription>Record a decision made during the meeting.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="decision-title">Title</Label>
              <Input
                id="decision-title"
                placeholder="e.g., Approve Q4 Budget"
                value={voteTitle}
                onChange={(e) => setVoteTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="decision-description">Description (optional)</Label>
              <Textarea
                id="decision-description"
                placeholder="Additional details about the decision..."
                value={voteDescription}
                onChange={(e) => setVoteDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="include-voting">Include Voting</Label>
                <p className="text-sm text-muted-foreground">Allow attendees to vote on this decision</p>
              </div>
              <Switch
                id="include-voting"
                checked={includeVoting}
                onCheckedChange={setIncludeVoting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoteDialogOpen(false)} disabled={isSubmittingVote}>
              Cancel
            </Button>
            <Button onClick={handleCreateDecision} disabled={isSubmittingVote || !voteTitle.trim()}>
              {isSubmittingVote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {includeVoting ? "Start Vote" : "Add Decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agenda Item Dialog */}
      <Dialog open={agendaDialogOpen} onOpenChange={(open) => {
        setAgendaDialogOpen(open);
        if (!open) resetAgendaForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Agenda Item</DialogTitle>
            <DialogDescription>Add a new item to the meeting agenda.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="agenda-title">Title</Label>
              <Input
                id="agenda-title"
                placeholder="e.g., Review Q4 financials"
                value={agendaTitle}
                onChange={(e) => setAgendaTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agenda-description">Description (optional)</Label>
              <Textarea
                id="agenda-description"
                placeholder="Additional details about this agenda item..."
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
            <Button variant="outline" onClick={() => setAgendaDialogOpen(false)} disabled={isSubmittingAgenda}>
              Cancel
            </Button>
            <Button onClick={handleCreateAgendaItem} disabled={isSubmittingAgenda || !agendaTitle.trim()}>
              {isSubmittingAgenda && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Item Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={(open) => {
        setActionDialogOpen(open);
        if (!open) resetActionForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActionId ? "Edit Action Item" : "Add Action Item"}</DialogTitle>
            <DialogDescription>
              {editingActionId ? "Update the action item details." : "Create a new action item from this meeting."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="action-title">Title</Label>
              <Input
                id="action-title"
                placeholder="e.g., Follow up with finance team"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="action-description">Description (optional)</Label>
              <Textarea
                id="action-description"
                placeholder="Additional details..."
                value={actionDescription}
                onChange={(e) => setActionDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="action-assignee">Assignee</Label>
              <Select value={actionAssigneeId} onValueChange={setActionAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {companyMembers.map((member) => (
                    <SelectItem key={member.id} value={member.user?.id || member.userId}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.user?.imageUrl || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {getInitials(member.user?.firstName, member.user?.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        {member.user?.firstName} {member.user?.lastName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="action-due-date">Due Date</Label>
                <Input
                  id="action-due-date"
                  type="date"
                  value={actionDueDate}
                  onChange={(e) => setActionDueDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="action-priority">Priority</Label>
                <Select value={actionPriority} onValueChange={(v) => setActionPriority(v as "HIGH" | "MEDIUM" | "LOW")}>
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
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={isSubmittingAction}>
              Cancel
            </Button>
            <Button onClick={handleCreateAction} disabled={isSubmittingAction || !actionTitle.trim()}>
              {isSubmittingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingActionId ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Action Item Confirmation */}
      <AlertDialog open={showDeleteActionConfirm} onOpenChange={setShowDeleteActionConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The action item will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingActionId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Note Confirmation */}
      <AlertDialog open={showDeleteNoteConfirm} onOpenChange={setShowDeleteNoteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The note will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingNoteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Attendee Dialog */}
      <Dialog open={attendeeDialogOpen} onOpenChange={(open) => {
        setAttendeeDialogOpen(open);
        if (!open) setSelectedMemberIds([]);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Attendees</DialogTitle>
            <DialogDescription>Select company members to add to this meeting.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {companyMembers
                .filter((member) => !attendees.some((a) => a.member?.id === member.id))
                .map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 ${
                      selectedMemberIds.includes(member.id) ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      setSelectedMemberIds((prev) =>
                        prev.includes(member.id)
                          ? prev.filter((id) => id !== member.id)
                          : [...prev, member.id]
                      );
                    }}
                  >
                    <Avatar>
                      <AvatarImage src={member.user?.imageUrl || undefined} />
                      <AvatarFallback>
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
                    {selectedMemberIds.includes(member.id) && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))}
              {companyMembers.filter((member) => !attendees.some((a) => a.member?.id === member.id)).length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  All company members are already attendees
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendeeDialogOpen(false)} disabled={isAddingAttendees}>
              Cancel
            </Button>
            <Button onClick={handleAddAttendees} disabled={isAddingAttendees || selectedMemberIds.length === 0}>
              {isAddingAttendees && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {selectedMemberIds.length > 0 ? `(${selectedMemberIds.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={(open) => {
        setDocumentDialogOpen(open);
        if (!open) resetDocumentForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Add a document to this meeting.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="document-file">File</Label>
              <Input
                id="document-file"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setDocumentFile(file);
                    if (!documentName) {
                      setDocumentName(file.name);
                    }
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document-name">Name</Label>
              <Input
                id="document-name"
                placeholder="Document name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
              />
            </div>
            {documentFile && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{documentFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(documentFile.size)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentDialogOpen(false)} disabled={isUploadingDocument}>
              Cancel
            </Button>
            <Button onClick={handleUploadDocument} disabled={isUploadingDocument || !documentFile}>
              {isUploadingDocument && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
