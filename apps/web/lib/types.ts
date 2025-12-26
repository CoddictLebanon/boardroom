// Meeting Types
export type MeetingStatus = "SCHEDULED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "CANCELLED";

export interface Company {
  id: string;
  name: string;
  members?: CompanyMember[];
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

export interface Meeting {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  duration: number;
  location: string | null;
  videoLink: string | null;
  status: MeetingStatus;
  notes: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  agendaItems?: AgendaItem[];
  attendees?: MeetingAttendee[];
  decisions?: Decision[];
  documents?: MeetingDocument[];
  meetingNotes?: MeetingNote[];
  actionItems?: ActionItem[];
}

export interface MeetingDocument {
  id: string;
  meetingId: string;
  documentId: string;
  isPreRead: boolean;
  document: Document;
}

export interface AgendaItem {
  id: string;
  meetingId: string;
  title: string;
  description: string | null;
  duration: number | null;
  order: number;
  notes: string | null;
  createdById: string | null;
  createdBy?: User;
}

export interface MeetingAttendee {
  id: string;
  meetingId: string;
  memberId: string;
  isPresent: boolean | null;
  member?: CompanyMember;
}

export interface CompanyMember {
  id: string;
  userId: string;
  companyId: string;
  role: "OWNER" | "ADMIN" | "BOARD_MEMBER" | "OBSERVER";
  title: string | null;
  status: "ACTIVE" | "INACTIVE" | "FORMER";
  user?: User;
}

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

// Decision Types
export type DecisionOutcome = "PASSED" | "REJECTED" | "TABLED";
export type VoteType = "FOR" | "AGAINST" | "ABSTAIN";

export interface Decision {
  id: string;
  meetingId: string;
  agendaItemId: string | null;
  createdById: string | null;
  title: string;
  description: string | null;
  outcome: DecisionOutcome | null;
  votes?: Vote[];
  createdBy?: User;
}

export interface Vote {
  id: string;
  decisionId: string;
  userId: string;
  vote: VoteType;
}

// Action Item Types
export type ActionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface ActionItem {
  id: string;
  companyId: string;
  meetingId: string | null;
  agendaItemId: string | null;
  createdById: string | null;
  title: string;
  description: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  priority: Priority;
  status: ActionStatus;
  assignee?: User;
  createdBy?: User;
}

// Resolution Types
export type ResolutionStatus = "DRAFT" | "PROPOSED" | "PASSED" | "REJECTED" | "TABLED";
export type ResolutionCategory = "FINANCIAL" | "GOVERNANCE" | "HR" | "OPERATIONS" | "STRATEGIC" | "OTHER";

export interface Resolution {
  id: string;
  companyId: string;
  decisionId: string | null;
  number: string;
  title: string;
  content: string;
  category: ResolutionCategory;
  status: ResolutionStatus;
  effectiveDate: string | null;
}

// Document Types
export type DocumentType = "MEETING" | "FINANCIAL" | "GOVERNANCE" | "GENERAL";

export interface Document {
  id: string;
  companyId: string;
  folderId: string | null;
  uploaderId: string;
  name: string;
  description: string | null;
  type: DocumentType;
  mimeType: string | null;
  size: number | null;
  storageKey: string;
  version: number;
  uploader?: User;
}

// Financial Report Types
export type FinancialReportType = "PROFIT_LOSS" | "BALANCE_SHEET" | "CASH_FLOW" | "BUDGET_VS_ACTUAL" | "CUSTOM";
export type ReportStatus = "DRAFT" | "FINAL";

export interface FinancialReport {
  id: string;
  companyId: string;
  type: FinancialReportType;
  fiscalYear: number;
  period: string;
  status: ReportStatus;
}

// OKR Types
export type OkrPeriodStatus = "OPEN" | "CLOSED";
export type MetricType = "NUMERIC" | "PERCENTAGE" | "CURRENCY" | "BOOLEAN";

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  metricType: MetricType;
  startValue: number;
  targetValue: number;
  currentValue: number;
  inverse: boolean;
  comment: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  progress: number;
}

export interface Objective {
  id: string;
  periodId: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  keyResults?: KeyResult[];
  progress: number;
}

export interface OkrPeriod {
  id: string;
  companyId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: OkrPeriodStatus;
  createdAt: string;
  updatedAt: string;
  objectives?: Objective[];
  score: number;
}

// Team/Org Chart Types
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';

export interface OrgRole {
  id: string;
  companyId: string;
  parentId: string | null;
  title: string;
  personName: string | null;
  responsibilities: string | null;
  department: string | null;
  employmentType: EmploymentType | null;
  positionX: number;
  positionY: number;
  createdAt: string;
  updatedAt: string;
  parent?: { id: string; title: string } | null;
  children?: { id: string; title: string; personName: string | null }[];
}

export interface CreateOrgRoleInput {
  title: string;
  personName?: string;
  responsibilities?: string;
  department?: string;
  employmentType?: EmploymentType;
  parentId?: string;
}

export interface UpdateOrgRoleInput {
  title?: string;
  personName?: string | null;
  responsibilities?: string | null;
  department?: string | null;
  employmentType?: EmploymentType | null;
  parentId?: string | null;
  positionX?: number;
  positionY?: number;
}
