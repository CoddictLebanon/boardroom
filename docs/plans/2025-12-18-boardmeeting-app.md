# BoardMeeting App - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive board meeting management platform for managing multiple companies, meetings, decisions, action items, financial reports, and resolutions.

**Architecture:** Multi-tenant SaaS application with company-based workspace isolation. Next.js frontend with app-like UX (Slack/Figma style), NestJS REST API backend, PostgreSQL database, real-time updates via Socket.io.

**Tech Stack:**
- Frontend: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, cmdk
- Backend: NestJS, TypeScript, Prisma ORM, Socket.io
- Database: PostgreSQL
- Auth: Clerk
- Storage: DigitalOcean Spaces
- Hosting: Vercel (frontend), Railway (backend + database)

---

# Part 1: Design Specification

## 1. Core Architecture & Multi-Company Model

### Company Workspaces
Each company is a separate workspace with its own:
- Board members and their roles
- Meetings and history
- Documents and financial reports
- Action items and decisions
- Resolutions

### User Model
- One user account can belong to multiple company workspaces
- Each workspace membership has a role: **Owner**, **Admin**, **Board Member**, or **Observer**
- Permissions are per-workspace

### Access Control
| Role | Permissions |
|------|-------------|
| Owner | Full access, manage members, billing, delete company |
| Admin | Full access, manage members, all documents, all meetings |
| Board Member | Access meetings they're invited to, vote, view shared documents |
| Observer | Read-only access to meetings and documents they're granted |

### Per-Company Isolation (Critical)
- Each company connects to its OWN integrations (Xero, Calendar, etc.)
- Board members are invited to specific companies only
- No cross-company data visibility unless explicitly invited to both
- Data is strictly scoped to one company

### Timezone
- System default: Dubai (GST / UTC+4)
- Per-company override available
- Individual users can display in local timezone
- Official records use company timezone

---

## 2. Meetings Module

### Meeting Lifecycle

**Before the meeting:**
- Create from template or blank
- Set date/time (syncs to calendars)
- Build agenda with timed sections
- Attach pre-read documents
- Invite attendees from company's board members
- System sends email with agenda + pre-read materials (configurable: 7/5/3 days before)

**During the meeting:**
- Live agenda view with current item tracking
- Capture notes per agenda item
- Record decisions (with option to trigger live vote)
- Create action items on the fly (assign owner, due date)
- Mark attendees present/absent

**After the meeting:**
- Auto-generate meeting summary
- Send summary email to attendees (optional: stakeholders)
- Action items appear in assignees' dashboards
- Decisions logged to decision register

### Meeting Summary Structure
Complete record including:
1. **Header** - Title, date, time, duration, company, attendees present/absent
2. **Documents attached** - All pre-reads and meeting documents with links
3. **Agenda covered** - Each item with notes captured
4. **Decisions made** - With outcomes and vote breakdowns
5. **Action items created** - Owner, due date, status
6. **Voting records** - Full vote history with individual votes

### Voting (Live Only)
- Votes only occur during active meetings (no async)
- Motion/resolution text set clearly
- Select voters: all present or specific members
- Vote options: For, Against, Abstain
- Quorum tracking
- Results: Passed / Failed
- Vote record attached to decision

### Meeting Templates
- Reusable templates (e.g., "Monthly Board Meeting")
- Include: default agenda items, duration, attendees, required document types
- One-click creation from template

---

## 3. Financial Reports Module

### Report Types
- Profit & Loss (Income Statement)
- Balance Sheet
- Cash Flow / Liquidity
- Budget vs. Actual
- Custom reports (user-defined structure)

### Data Input Methods
1. **Manual upload** - PDF/Excel, attach to time period
2. **Accounting integration** - Pull from Xero/QuickBooks
3. **Templated entry** - Fill standard form in-app

### Organization
- Company → Fiscal Year → Period (monthly/quarterly)
- Each report has: type, period, upload date, uploaded by, status (draft/final)
- Version history for updates

### Pre-Meeting Review
- Attach financial reports to meetings
- Board members receive with agenda
- Members can leave comments/questions before meeting
- Questions visible in meeting for discussion

### Financial Dashboard
- At-a-glance per company: latest P&L, cash position, key metrics
- Trend charts: revenue, expenses, profit over time
- Configurable KPIs per company

---

## 4. Action Items & Follow-Through

### Action Item Structure
- Title
- Description
- Assigned to (single owner)
- Due date
- Priority (High / Medium / Low)
- Status (Pending → In Progress → Complete / Overdue)
- Source: linked to meeting and agenda item

### Tracking & Visibility

**Personal dashboard:**
- User's action items across all companies
- Filter: due this week, overdue, by company
- One-click status updates

**Company dashboard:**
- Admins see all action items for company
- Filter by assignee, status, meeting
- Overdue items highlighted

### Accountability Features
- **Automatic reminders**: Email when due date approaching (3 days, 1 day)
- **Overdue escalation**: Notify admin/owner if overdue
- **Meeting rollover**: Incomplete items auto-appear on next meeting's agenda

### Reporting
- Completion rate per company
- Average time to completion
- Overdue items by assignee

---

## 5. Documents & Versioning

### Document Types
- Meeting documents (linked to specific meetings)
- Financial reports (organized by period)
- Governance documents (bylaws, policies, contracts)
- General documents

### Organization
- Folder structure per company (customizable)
- Default folders: Meetings, Financials, Governance, General
- Tags for cross-cutting categorization

### Version Control
- Every update creates new version
- Full history: who, when, version number
- View/restore any previous version
- Compare versions side-by-side
- "Current" version clearly marked

### Access Control
- Documents inherit company permissions by default
- Override per document or folder
- Example: "Executive compensation" visible only to non-executive members

### Cloud Storage Integration
- Link documents from Google Drive / Dropbox
- Option: Link (stays in cloud) or Import (copy for version control)
- Upload to cloud storage from within app

---

## 6. Board Member Directory

### Member Profile
- Name, email, phone
- Photo (optional)
- Role/title (e.g., "Chairman", "Independent Director")
- Companies they belong to (with role in each)
- Committee assignments
- Term dates: start, end
- Status: Active / Inactive / Former

### Directory Views

**Per company:**
- All board members for that company
- Roles, contact info, term status
- Filter: active only, by role, by committee

**Cross-company (admins):**
- All people across all companies
- Shows which companies each person belongs to

### Features
- Term expiration alerts (90 days before)
- Quick contact (click to email)
- Meeting attendance history
- Voting history (visible to admins)

### Onboarding
- Invite by email
- Create account and join company workspace
- Access based on role

---

## 7. Board Resolutions Register

### Resolution Structure
- Resolution number (auto-generated: RES-2024-015)
- Title
- Full resolution text
- Category (Financial, Governance, HR, Operations, Strategic)
- Status: Draft → Proposed → Passed / Rejected / Tabled
- Meeting reference (if applicable)
- Vote record (if voted on)
- Effective date
- Attachments

### Resolution Types

**Meeting resolutions:**
- Created during board meeting
- Linked to meeting record
- Vote captured in real-time

**Written resolutions (circular):**
- Passed outside meetings via written consent
- Track signatures: who signed, who pending
- Threshold tracking for passage

### Management
- Chronological register per company
- Search by: number, keyword, category, date, status
- Filter: passed only, pending, by year
- Export for legal/compliance (PDF)

### Future Resolutions
- Draft in advance
- Attach to upcoming meeting agenda
- Track resolutions that need to be passed

---

## 8. Historical Search

### Search Across
- Meeting summaries and notes
- Decisions and resolutions
- Action items
- Documents (titles and content)
- Financial report labels

### Features
- Full-text search
- Filters: company, date range, content type, meeting
- Search within results

### Results Display
- Content type indicator
- Snippet with keyword highlighted
- Date and context
- Direct link to full record

### Decision History View
- Browse all decisions chronologically
- Filter by topic/category
- See: what decided, when, vote breakdown, resulting actions

---

## 9. Integrations

### Calendar (Google Calendar / Outlook)
- Meetings sync to connected calendars
- Attendees receive calendar invites
- Reschedules/cancellations sync both ways
- Video call links included

### Cloud Storage (Google Drive / Dropbox)
- Browse and link documents
- Link (stays in cloud) or Import (copy)
- Upload to cloud from within app

### Accounting (Xero / QuickBooks)
- Per-company connection (each company → own account)
- Pull financial data on-demand or scheduled
- Auto-generate standard reports
- Manual override for presentation

### Management
- Per-company setup
- Admin-only configuration
- Connection status visible
- Re-auth handling

---

## 10. Notifications

### Email Notifications

**Meetings:**
- Scheduled/rescheduled/cancelled
- Agenda and pre-read available (configurable days before)
- Reminder (1 day, morning of)
- Summary available

**Action items:**
- New item assigned
- Due date approaching (3 days, 1 day)
- Overdue
- Completed (for organizer)

**Resolutions:**
- Written resolution requires signature
- Signature reminder
- Resolution passed/rejected

**Documents:**
- New document shared
- Document updated (new version)

### Controls
- Per-user preferences
- Frequency: immediate, daily digest, weekly summary
- Quiet hours (respects timezone)
- Per-company override

---

## 11. Dashboard & Navigation

### Personal Dashboard (on login)

**Upcoming:**
- Next meetings across all companies
- Pre-read materials to review

**Action required:**
- Pending action items (by due date)
- Overdue highlighted
- Documents awaiting review

**Recent activity:**
- Latest decisions
- New documents
- Completed action items

### Company Dashboard

**Overview cards:**
- Next meeting date
- Open action items count
- Pending resolutions
- Latest financial snapshot

**Quick access:**
- Recent meetings
- Recent documents
- Recent decisions

### Navigation Structure
```
[Company Switcher]
├── Dashboard
├── Meetings
│   ├── Upcoming
│   ├── Past
│   └── Templates
├── Action Items
├── Resolutions
├── Documents
├── Financials
├── Board Members
└── Settings
    ├── Company Profile (name, logo, timezone, fiscal year)
    ├── Integrations (Calendar, Cloud Storage, Accounting)
    ├── Members & Permissions
    ├── Notifications
    └── Templates
```

### UI/UX Characteristics
- Sidebar navigation (always visible)
- Real-time updates (no page refresh)
- Keyboard shortcuts
- Command palette (Cmd+K)
- Smooth animations
- Dark mode support
- Desktop app option (installable)
- Company color coding (optional)
- Clear "You are viewing [Company]" indicator

---

# Part 2: Implementation Plan

## Phase 1: Project Setup & Core Infrastructure

### Task 1.1: Initialize Next.js Frontend

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`

**Step 1: Create monorepo structure**

```bash
mkdir -p apps/web apps/api packages/shared
```

**Step 2: Initialize Next.js app**

```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

**Step 3: Install UI dependencies**

```bash
npm install @radix-ui/react-icons @radix-ui/react-slot class-variance-authority clsx tailwind-merge
npm install framer-motion cmdk
npx shadcn-ui@latest init
```

**Step 4: Configure shadcn/ui**

Select: New York style, Zinc base color, CSS variables

**Step 5: Add initial shadcn components**

```bash
npx shadcn-ui@latest add button card input label dialog dropdown-menu avatar badge separator
```

**Step 6: Verify setup**

```bash
npm run dev
```

Expected: App runs on localhost:3000

**Step 7: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js frontend with Tailwind and shadcn/ui"
```

---

### Task 1.2: Initialize NestJS Backend

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`

**Step 1: Initialize NestJS app**

```bash
cd apps/api
npx @nestjs/cli new . --skip-git --package-manager npm
```

**Step 2: Install dependencies**

```bash
npm install @nestjs/config @nestjs/swagger class-validator class-transformer
npm install @prisma/client
npm install -D prisma
```

**Step 3: Initialize Prisma**

```bash
npx prisma init
```

**Step 4: Configure environment**

Create `apps/api/.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/boardmeeting?schema=public"
```

**Step 5: Verify setup**

```bash
npm run start:dev
```

Expected: API runs on localhost:3000 (change to 3001)

**Step 6: Update port to 3001**

Edit `apps/api/src/main.ts`:
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(3001);
}
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: initialize NestJS backend with Prisma"
```

---

### Task 1.3: Database Schema - Core Entities

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Step 1: Write database schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Users (synced from Clerk)
model User {
  id        String   @id
  email     String   @unique
  firstName String?
  lastName  String?
  imageUrl  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  memberships     CompanyMember[]
  assignedActions ActionItem[]
  uploadedDocs    Document[]
  votes           Vote[]
}

// Companies (workspaces)
model Company {
  id          String   @id @default(cuid())
  name        String
  logo        String?
  timezone    String   @default("Asia/Dubai")
  fiscalYearStart Int  @default(1) // Month 1-12
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members       CompanyMember[]
  meetings      Meeting[]
  documents     Document[]
  folders       Folder[]
  actionItems   ActionItem[]
  resolutions   Resolution[]
  financialReports FinancialReport[]
  integrations  Integration[]
}

// Company membership with roles
model CompanyMember {
  id        String   @id @default(cuid())
  userId    String
  companyId String
  role      MemberRole @default(BOARD_MEMBER)
  title     String?  // e.g., "Chairman", "CFO"
  termStart DateTime?
  termEnd   DateTime?
  status    MemberStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  meetingAttendances MeetingAttendee[]

  @@unique([userId, companyId])
}

enum MemberRole {
  OWNER
  ADMIN
  BOARD_MEMBER
  OBSERVER
}

enum MemberStatus {
  ACTIVE
  INACTIVE
  FORMER
}

// Meetings
model Meeting {
  id          String   @id @default(cuid())
  companyId   String
  title       String
  description String?
  scheduledAt DateTime
  duration    Int      // minutes
  location    String?
  videoLink   String?
  status      MeetingStatus @default(SCHEDULED)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  agendaItems AgendaItem[]
  attendees   MeetingAttendee[]
  documents   MeetingDocument[]
  decisions   Decision[]
  summary     MeetingSummary?
}

enum MeetingStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model MeetingAttendee {
  id         String   @id @default(cuid())
  meetingId  String
  memberId   String
  isPresent  Boolean?
  createdAt  DateTime @default(now())

  meeting Meeting       @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  member  CompanyMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([meetingId, memberId])
}

model AgendaItem {
  id           String   @id @default(cuid())
  meetingId    String
  title        String
  description  String?
  duration     Int?     // minutes
  order        Int
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  meeting   Meeting      @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  decisions Decision[]
  actions   ActionItem[]
}

model MeetingSummary {
  id        String   @id @default(cuid())
  meetingId String   @unique
  content   String   // JSON or Markdown
  sentAt    DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  meeting Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)
}

// Decisions & Voting
model Decision {
  id           String   @id @default(cuid())
  meetingId    String
  agendaItemId String?
  title        String
  description  String?
  outcome      DecisionOutcome?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  meeting    Meeting     @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  agendaItem AgendaItem? @relation(fields: [agendaItemId], references: [id])
  votes      Vote[]
  resolution Resolution?
}

enum DecisionOutcome {
  PASSED
  REJECTED
  TABLED
}

model Vote {
  id         String   @id @default(cuid())
  decisionId String
  userId     String
  vote       VoteType
  createdAt  DateTime @default(now())

  decision Decision @relation(fields: [decisionId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([decisionId, userId])
}

enum VoteType {
  FOR
  AGAINST
  ABSTAIN
}

// Action Items
model ActionItem {
  id           String   @id @default(cuid())
  companyId    String
  meetingId    String?
  agendaItemId String?
  title        String
  description  String?
  assigneeId   String
  dueDate      DateTime?
  priority     Priority @default(MEDIUM)
  status       ActionStatus @default(PENDING)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company    Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  assignee   User        @relation(fields: [assigneeId], references: [id])
  agendaItem AgendaItem? @relation(fields: [agendaItemId], references: [id])
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}

enum ActionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  OVERDUE
}

// Documents
model Folder {
  id        String   @id @default(cuid())
  companyId String
  parentId  String?
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company  Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  parent   Folder?   @relation("FolderHierarchy", fields: [parentId], references: [id])
  children Folder[]  @relation("FolderHierarchy")
  documents Document[]
}

model Document {
  id          String   @id @default(cuid())
  companyId   String
  folderId    String?
  uploaderId  String
  name        String
  description String?
  type        DocumentType
  mimeType    String?
  size        Int?
  storageKey  String   // DigitalOcean Spaces key
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company  Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  folder   Folder?  @relation(fields: [folderId], references: [id])
  uploader User     @relation(fields: [uploaderId], references: [id])
  versions DocumentVersion[]
  meetings MeetingDocument[]
  tags     DocumentTag[]
}

enum DocumentType {
  MEETING
  FINANCIAL
  GOVERNANCE
  GENERAL
}

model DocumentVersion {
  id         String   @id @default(cuid())
  documentId String
  version    Int
  storageKey String
  size       Int?
  uploaderId String
  createdAt  DateTime @default(now())

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
}

model DocumentTag {
  id         String   @id @default(cuid())
  documentId String
  tag        String

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, tag])
}

model MeetingDocument {
  id         String   @id @default(cuid())
  meetingId  String
  documentId String
  isPreRead  Boolean  @default(false)
  createdAt  DateTime @default(now())

  meeting  Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([meetingId, documentId])
}

// Resolutions
model Resolution {
  id           String   @id @default(cuid())
  companyId    String
  decisionId   String?  @unique
  number       String   // e.g., RES-2024-015
  title        String
  content      String   // Full resolution text
  category     ResolutionCategory
  status       ResolutionStatus @default(DRAFT)
  effectiveDate DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company  Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  decision Decision? @relation(fields: [decisionId], references: [id])
}

enum ResolutionCategory {
  FINANCIAL
  GOVERNANCE
  HR
  OPERATIONS
  STRATEGIC
  OTHER
}

enum ResolutionStatus {
  DRAFT
  PROPOSED
  PASSED
  REJECTED
  TABLED
}

// Financial Reports
model FinancialReport {
  id          String   @id @default(cuid())
  companyId   String
  type        FinancialReportType
  fiscalYear  Int
  period      String   // e.g., "Q1", "January", "Annual"
  status      ReportStatus @default(DRAFT)
  data        Json?    // Structured financial data
  storageKey  String?  // PDF/Excel file if uploaded
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
}

enum FinancialReportType {
  PROFIT_LOSS
  BALANCE_SHEET
  CASH_FLOW
  BUDGET_VS_ACTUAL
  CUSTOM
}

enum ReportStatus {
  DRAFT
  FINAL
}

// Integrations
model Integration {
  id          String   @id @default(cuid())
  companyId   String
  type        IntegrationType
  provider    String   // e.g., "google", "xero"
  accessToken String?
  refreshToken String?
  expiresAt   DateTime?
  metadata    Json?
  status      IntegrationStatus @default(DISCONNECTED)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, type, provider])
}

enum IntegrationType {
  CALENDAR
  STORAGE
  ACCOUNTING
}

enum IntegrationStatus {
  CONNECTED
  DISCONNECTED
  ERROR
}
```

**Step 2: Generate Prisma client**

```bash
cd apps/api
npx prisma generate
```

**Step 3: Create migration**

```bash
npx prisma migrate dev --name init
```

**Step 4: Verify migration**

```bash
npx prisma studio
```

Expected: Prisma Studio opens, shows all tables

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add complete database schema"
```

---

### Task 1.4: Setup Clerk Authentication

**Files:**
- Create: `apps/web/middleware.ts`
- Modify: `apps/web/app/layout.tsx`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.guard.ts`

**Step 1: Install Clerk in frontend**

```bash
cd apps/web
npm install @clerk/nextjs
```

**Step 2: Add Clerk environment variables**

Create `apps/web/.env.local`:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

**Step 3: Create middleware**

Create `apps/web/middleware.ts`:
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

**Step 4: Wrap app with ClerkProvider**

Update `apps/web/app/layout.tsx`:
```typescript
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

**Step 5: Install Clerk webhook handler in backend**

```bash
cd apps/api
npm install svix
```

**Step 6: Create webhook handler for user sync**

Create `apps/api/src/webhooks/clerk.controller.ts`:
```typescript
import { Controller, Post, Req, Res, Headers } from '@nestjs/common';
import { Webhook } from 'svix';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async handleWebhook(
    @Req() req: any,
    @Res() res: any,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    const wh = new Webhook(webhookSecret);

    let evt: any;
    try {
      evt = wh.verify(JSON.stringify(req.body), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      await this.prisma.user.upsert({
        where: { id },
        update: {
          email: email_addresses[0]?.email_address,
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
        },
        create: {
          id,
          email: email_addresses[0]?.email_address,
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
        },
      });
    }

    return res.status(200).json({ received: true });
  }
}
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: setup Clerk authentication"
```

---

## Phase 2: Core Modules Implementation

### Task 2.1: Company Management API

**Files:**
- Create: `apps/api/src/companies/companies.module.ts`
- Create: `apps/api/src/companies/companies.controller.ts`
- Create: `apps/api/src/companies/companies.service.ts`
- Create: `apps/api/src/companies/dto/*.ts`
- Test: `apps/api/src/companies/companies.service.spec.ts`

**Step 1: Write the failing test**

Create `apps/api/src/companies/companies.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: PrismaService,
          useValue: {
            company: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            companyMember: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a company and add owner as member', async () => {
      const createDto = { name: 'Test Company', timezone: 'Asia/Dubai' };
      const userId = 'user_123';

      const mockCompany = { id: 'company_1', ...createDto };
      (prisma.company.create as jest.Mock).mockResolvedValue(mockCompany);
      (prisma.companyMember.create as jest.Mock).mockResolvedValue({});

      const result = await service.create(createDto, userId);

      expect(result).toEqual(mockCompany);
      expect(prisma.companyMember.create).toHaveBeenCalledWith({
        data: {
          userId,
          companyId: mockCompany.id,
          role: 'OWNER',
        },
      });
    });
  });

  describe('findAllForUser', () => {
    it('should return companies where user is a member', async () => {
      const userId = 'user_123';
      const mockCompanies = [
        { id: 'company_1', name: 'Company 1' },
        { id: 'company_2', name: 'Company 2' },
      ];

      (prisma.company.findMany as jest.Mock).mockResolvedValue(mockCompanies);

      const result = await service.findAllForUser(userId);

      expect(result).toEqual(mockCompanies);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/api
npm run test -- companies.service.spec.ts
```

Expected: FAIL - CompaniesService not found

**Step 3: Implement CompaniesService**

Create `apps/api/src/companies/companies.service.ts`:
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { MemberRole } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateCompanyDto, userId: string) {
    const company = await this.prisma.company.create({
      data: {
        name: createDto.name,
        timezone: createDto.timezone || 'Asia/Dubai',
        fiscalYearStart: createDto.fiscalYearStart || 1,
      },
    });

    await this.prisma.companyMember.create({
      data: {
        userId,
        companyId: company.id,
        role: MemberRole.OWNER,
      },
    });

    return company;
  }

  async findAllForUser(userId: string) {
    return this.prisma.company.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const membership = company.members.find((m) => m.userId === userId);
    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    return company;
  }

  async update(id: string, updateDto: UpdateCompanyDto, userId: string) {
    await this.checkAdminAccess(id, userId);

    return this.prisma.company.update({
      where: { id },
      data: updateDto,
    });
  }

  async checkAdminAccess(companyId: string, userId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException('Admin access required');
    }

    return membership;
  }
}
```

**Step 4: Create DTOs**

Create `apps/api/src/companies/dto/index.ts`:
```typescript
export * from './create-company.dto';
export * from './update-company.dto';
```

Create `apps/api/src/companies/dto/create-company.dto.ts`:
```typescript
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearStart?: number;
}
```

Create `apps/api/src/companies/dto/update-company.dto.ts`:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
```

**Step 5: Run test to verify it passes**

```bash
npm run test -- companies.service.spec.ts
```

Expected: PASS

**Step 6: Create controller and module**

Create `apps/api/src/companies/companies.controller.ts`:
```typescript
import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('companies')
@UseGuards(AuthGuard)
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Post()
  create(@Body() createDto: CreateCompanyDto, @Req() req: any) {
    return this.companiesService.create(createDto, req.userId);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.companiesService.findAllForUser(req.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.companiesService.findOne(id, req.userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateCompanyDto, @Req() req: any) {
    return this.companiesService.update(id, updateDto, req.userId);
  }
}
```

Create `apps/api/src/companies/companies.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: implement company management API"
```

---

### Task 2.2: Meetings API

(Similar structure - TDD approach)

**Files:**
- Create: `apps/api/src/meetings/meetings.module.ts`
- Create: `apps/api/src/meetings/meetings.controller.ts`
- Create: `apps/api/src/meetings/meetings.service.ts`
- Create: `apps/api/src/meetings/dto/*.ts`
- Test: `apps/api/src/meetings/meetings.service.spec.ts`

[Detailed implementation following same TDD pattern...]

---

### Task 2.3: Action Items API

[TDD implementation...]

---

### Task 2.4: Documents API with DigitalOcean Spaces

[TDD implementation...]

---

### Task 2.5: Resolutions API

[TDD implementation...]

---

### Task 2.6: Financial Reports API

[TDD implementation...]

---

## Phase 3: Frontend Implementation

### Task 3.1: App Shell & Navigation

**Files:**
- Create: `apps/web/app/(dashboard)/layout.tsx`
- Create: `apps/web/components/sidebar.tsx`
- Create: `apps/web/components/company-switcher.tsx`
- Create: `apps/web/components/command-palette.tsx`

[Implementation...]

---

### Task 3.2: Dashboard Pages

[Implementation...]

---

### Task 3.3: Meetings UI

[Implementation...]

---

### Task 3.4: Real-time with Socket.io

[Implementation...]

---

## Phase 4: Integrations

### Task 4.1: Calendar Integration (Google/Outlook)

[Implementation...]

---

### Task 4.2: Cloud Storage Integration

[Implementation...]

---

### Task 4.3: Accounting Integration (Xero/QuickBooks)

[Implementation...]

---

## Phase 5: Polish & Deploy

### Task 5.1: Email Notifications

[Implementation...]

---

### Task 5.2: Dark Mode

[Implementation...]

---

### Task 5.3: Desktop App (Electron/Tauri)

[Implementation...]

---

### Task 5.4: Deploy to Production

[Vercel + Railway deployment steps...]

---

# Summary

This plan provides:
1. Complete database schema ready for implementation
2. Phase 1 fully detailed with TDD approach
3. Subsequent phases outlined for expansion

**Estimated phases:**
- Phase 1: Project setup & core infrastructure
- Phase 2: Core modules (Companies, Meetings, Actions, Documents, Resolutions, Financials)
- Phase 3: Frontend implementation
- Phase 4: Integrations
- Phase 5: Polish & deploy
