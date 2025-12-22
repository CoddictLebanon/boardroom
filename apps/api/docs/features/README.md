# Boardroom API Features

## Overview

The Boardroom API is a comprehensive board meeting management platform built with NestJS, Prisma, and PostgreSQL. It provides real-time collaboration features via WebSockets and integrates with Clerk for authentication.

## Feature Modules

| Module | Description | Documentation |
|--------|-------------|---------------|
| [Companies](./companies.md) | Organization management and member roles | Core module |
| [Meetings](./meetings.md) | Meeting lifecycle, agenda, attendance, voting | Full CRUD + live controls |
| [Documents](./documents.md) | File storage with folders, versions, and tags | File upload/download |
| [Resolutions](./resolutions.md) | Board resolution tracking with auto-numbering | Status workflow |
| [Action Items](./action-items.md) | Task management with assignment and priorities | Cross-company view |
| [Financials](./financials.md) | Monthly data and formal reports | PDF attachments |
| [Permissions](./permissions.md) | Role-based access control | Custom roles |
| [Meeting Notes](./meeting-notes.md) | Real-time collaborative notes | WebSocket events |
| [Invitations](./invitations.md) | Email-based member invitations | Token acceptance |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  REST API (HTTP)                    │    WebSocket (Socket.io)│
├─────────────────────────────────────┼───────────────────────-─┤
│                    NestJS Application                        │
├──────────┬──────────┬──────────┬────┴───────┬───────────────┤
│ Companies│ Meetings │ Documents│ Permissions│   Gateway     │
│ Module   │ Module   │ Module   │ Module     │   Module      │
├──────────┴──────────┴──────────┴────────────┴───────────────┤
│                    Prisma ORM                                │
├─────────────────────────────────────────────────────────────┤
│                    PostgreSQL                                │
└─────────────────────────────────────────────────────────────┘
```

## Authentication

All protected routes use Clerk authentication via `ClerkAuthGuard`. The guard:
1. Validates the session token from the Authorization header
2. Extracts user ID and attaches to request
3. User data is available via `@CurrentUser()` decorator

## Permission System

### System Roles
- **OWNER** - Full access, bypasses all permission checks
- **ADMIN** - Administrative access, most permissions
- **BOARD_MEMBER** - Standard access, view + create
- **OBSERVER** - Read-only access

### Permission Guard
Routes are protected using the `@RequirePermission()` decorator:

```typescript
@RequirePermission('meetings.create')
@Post()
async create() { ... }
```

### Custom Roles
Companies can create custom roles with specific permission sets.

## API Versioning

All endpoints are prefixed with `/api/v1/`.

## Common Patterns

### Company-Scoped Routes
Most resources are scoped to a company:
```
/api/v1/companies/:companyId/meetings
/api/v1/companies/:companyId/documents
/api/v1/companies/:companyId/action-items
```

### Standard CRUD
```
POST   /resource          - Create
GET    /resource          - List
GET    /resource/:id      - Get one
PUT    /resource/:id      - Update
DELETE /resource/:id      - Delete
```

### Status Updates
```
PUT /resource/:id/status  - Update status only
```

## Real-time Features

The MeetingsGateway provides real-time updates for:
- Meeting state changes (start, pause, end)
- Attendance updates
- Voting and decisions
- Meeting notes (create, update, delete)
- Action items

## File Storage

- **Location:** `./uploads/` (local storage)
- **Documents:** Max 100MB
- **Financial PDFs:** Max 10MB

## Error Handling

Standard HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resources)
- `500` - Internal Server Error

## Testing

```bash
# Run all E2E tests
npm run test:e2e

# Tests use separate database: boardmeeting_test
```

## Environment Variables

```env
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@example.com
APP_URL=http://localhost:3000
```

## Claude Code Best Practices

### Use Parallel Sub-Agents for Independent Tasks

When working on multiple independent tasks (e.g., fixing bugs in different files, adding validation to multiple DTOs, implementing unrelated features), **always use parallel sub-agents** via the Task tool instead of working sequentially.

**Example: Code Review Fixes**

Instead of fixing issues one-by-one sequentially:
```
1. Fix file A (5 min)
2. Fix file B (5 min)
3. Fix file C (5 min)
Total: 15 min
```

Launch parallel sub-agents:
```
Agent 1: Fix file A ─┐
Agent 2: Fix file B ─┼─> All complete in ~5 min
Agent 3: Fix file C ─┘
```

**When to Parallelize:**
- Fixing issues in different files
- Adding similar changes across multiple modules (e.g., validation, logging)
- Running independent tests or builds
- Code review of separate features

**When NOT to Parallelize:**
- Tasks with dependencies (B needs A's output)
- Changes to the same file
- Sequential workflows (migrations, deployments)

**How to Launch Parallel Agents:**
```
Use the Task tool with multiple invocations in a single message.
Each agent gets a specific, focused task with clear scope.
```

This lesson learned from: Security fixes on 2024-12-20 where 10+ independent fixes were done sequentially instead of in parallel, taking significantly longer than necessary.
