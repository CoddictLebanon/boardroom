# Invitations Module

## Overview

The Invitations module enables company owners and admins to invite new members via email with role assignment and token-based acceptance.

## Database Schema

```prisma
model Invitation {
  id        String           @id @default(cuid())
  companyId String
  email     String
  role      MemberRole       @default(BOARD_MEMBER)
  token     String           @unique @default(cuid())
  status    InvitationStatus @default(PENDING)
  expiresAt DateTime
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, email])
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}
```

## API Endpoints

### Create Invitation

```
POST /api/v1/companies/:companyId/invitations
```

**Request:**
```json
{
  "email": "newmember@example.com",
  "role": "BOARD_MEMBER"
}
```

**Response:**
```json
{
  "id": "cmj...",
  "companyId": "cmj...",
  "email": "newmember@example.com",
  "role": "BOARD_MEMBER",
  "token": "cmj...",
  "status": "PENDING",
  "expiresAt": "2025-01-22T00:00:00Z",
  "createdAt": "2025-01-15T00:00:00Z"
}
```

### List Invitations

```
GET /api/v1/companies/:companyId/invitations
```

Returns all invitations for the company with status.

### Revoke Invitation

```
DELETE /api/v1/invitations/:id
```

Sets status to REVOKED. Only pending invitations can be revoked.

### Accept Invitation

```
POST /api/v1/invitations/:token/accept
```

**Flow:**
1. Validates token exists and is not expired/revoked
2. Creates user record if not exists (from Clerk auth)
3. Creates CompanyMember with assigned role
4. Updates invitation status to ACCEPTED
5. Returns the new membership

## Email Notification

When an invitation is created, an email is sent via the EmailService:

```
Subject: You've been invited to join {Company Name}

Body:
You have been invited to join {Company Name} as a {Role}.

Click here to accept: {APP_URL}/invitations/{token}/accept

This invitation expires on {expiresAt}.
```

## Invitation Flow

```
1. Admin creates invitation
   ↓
2. Email sent to invitee
   ↓
3. Invitee clicks link → /invitations/:token/accept
   ↓
4. Frontend calls POST /invitations/:token/accept
   ↓
5. User added to company
```

## Business Rules

- Invitations expire after 7 days
- Only one pending invitation per email per company
- Cannot invite existing members
- Only OWNER/ADMIN can create invitations
- Invitee must be authenticated to accept

## Permissions

| Action | Required Role |
|--------|--------------|
| Create invitation | OWNER, ADMIN |
| List invitations | OWNER, ADMIN |
| Revoke invitation | OWNER, ADMIN |
| Accept invitation | Any authenticated user (with matching email) |

## Related Files

- Controller: `src/invitations/invitations.controller.ts`
- Service: `src/invitations/invitations.service.ts`
- DTOs: `src/invitations/dto/`
- Email Service: `src/email/email.service.ts`
