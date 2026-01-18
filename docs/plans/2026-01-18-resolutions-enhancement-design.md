# Resolutions Enhancement Design

**Date**: January 18, 2026
**Status**: Draft
**Author**: Brainstorming session

## Overview

Enhance the Resolutions section to support AI-assisted document generation, digital signatures, company branding, and PDF export. This is a sensitive section with strict role-based access control.

## Requirements Summary

1. **AI-assisted generation** - ChatGPT-style chat using Claude API to generate resolution content
2. **Multiple signers** - Resolutions require approval from selected company members
3. **Signature images** - Users upload signatures to their profiles
4. **Company branding** - Logo in header, company stamp option, company info in footer
5. **PDF export** - Professional document download
6. **Permission-based access** - Use existing permission system for visibility control

---

## Data Model Changes

### Company Model (Extended)

```prisma
model Company {
  // ... existing fields ...

  // New profile fields
  address         String?
  city            String?
  country         String?
  postalCode      String?
  registrationNo  String?   // Company registration/incorporation number
  phone           String?
  email           String?
  website         String?
  stampUrl        String?   // Company stamp image URL
}
```

### User Model (Extended)

```prisma
model User {
  // ... existing fields ...

  signatureUrl    String?   // User's signature image URL
}
```

### New ResolutionSignature Model

```prisma
model ResolutionSignature {
  id            String          @id @default(cuid())
  resolutionId  String
  userId        String
  order         Int             // Display order
  status        SignatureStatus @default(PENDING)
  signedAt      DateTime?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  resolution    Resolution      @relation(fields: [resolutionId], references: [id], onDelete: Cascade)
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([resolutionId, userId])
  @@index([resolutionId])
  @@index([userId])
}

enum SignatureStatus {
  PENDING
  SIGNED
  DECLINED
}
```

### Resolution Model (Extended)

```prisma
model Resolution {
  // ... existing fields ...

  createdById     String?
  generatedBy     String?         // "AI" or null if manual
  includeStamp    Boolean         @default(false)

  signatures      ResolutionSignature[]
  createdBy       User?           @relation(fields: [createdById], references: [id])
}
```

---

## AI Resolution Generation

### User Flow

1. User navigates to `/resolutions/new`
2. Full-page layout: Chat (40% left), Live Preview (60% right)
3. User describes what they need in natural language
4. Claude asks clarifying questions one at a time
5. Live preview updates as information is gathered
6. Claude generates formal resolution text (WHEREAS... RESOLVED...)
7. User can request edits via chat
8. "Save as Draft" creates the resolution, redirects to detail page

### Duplicate Feature

- Any existing resolution can be duplicated
- Creates a copy with new number, status = DRAFT
- User can then edit or use AI chat to modify

### Claude API Integration

- Backend endpoint: `POST /api/v1/ai/generate-resolution`
- Uses Claude API with system prompt for formal legal document style
- Streams responses for real-time preview updates
- Stores conversation history for context in follow-up edits

---

## Signature Workflow

### Adding Signers

1. On resolution detail page (DRAFT or PROPOSED status)
2. "Manage Signers" button opens dialog
3. Multi-select from company members (shows name + title)
4. Optional: drag to reorder for display
5. Checkbox: "Include company stamp"

### Signing Process

1. Resolution marked as PASSED triggers signature requests
2. Each signer receives in-app notification
3. Signer opens resolution, sees "Sign Resolution" button
4. If no signature uploaded → prompt to upload first
5. Confirmation dialog: "You are signing Resolution RES-2026-001. This action cannot be undone."
6. On confirm → status = SIGNED, timestamp recorded

### Signature Status Display

```
Signatures (2 of 3 complete)
✓ John Smith, Chairman - Signed Jan 18, 2026
✓ Sarah Lee, Secretary - Signed Jan 18, 2026
○ Mike Chen, CFO - Pending
```

### Signature Upload (User Profile)

- Located in user settings/profile
- Accepts PNG/JPG (transparent or white background recommended)
- Preview shows how it appears on documents
- Can replace anytime (only affects future signatures)

---

## PDF Document Structure

```
┌─────────────────────────────────────────────────┐
│  [LOGO]     COMPANY NAME                        │  Header
│             Resolution RES-2026-001             │
├─────────────────────────────────────────────────┤
│                                                 │
│  RESOLUTION OF THE BOARD OF DIRECTORS           │
│  OF [COMPANY NAME]                              │
│                                                 │
│  Category: Financial                            │
│  Date: January 18, 2026                         │
│  Effective Date: February 1, 2026               │
│                                                 │
│  WHEREAS, the Board has reviewed...             │  Body
│                                                 │
│  NOW, THEREFORE, BE IT RESOLVED...              │
│                                                 │
├─────────────────────────────────────────────────┤
│  SIGNATURES                          [STAMP]    │  Signatures
│                                                 │
│  [signature img]      [signature img]           │
│  ________________     ________________          │
│  John Smith           Sarah Lee                 │
│  Chairman             Secretary                 │
│  Jan 18, 2026         Jan 18, 2026              │
│                                                 │
├─────────────────────────────────────────────────┤
│  Company Name | Address, City, Country          │  Footer
│  Reg: XXXXX | Phone | Website                   │
└─────────────────────────────────────────────────┘
```

### PDF Library

Using `@react-pdf/renderer`:
- Renders React components to PDF
- Works with Next.js
- Supports images (logos, signatures, stamps)

### Download Rules

- "Download PDF" button on resolution detail page
- Fully available when PASSED and all signatures complete
- Draft download available with "DRAFT" watermark

---

## Permissions

### Existing Permissions (No Changes)

- `resolutions.view` - See resolutions list and details
- `resolutions.create` - Create new resolutions
- `resolutions.edit` - Modify draft resolutions
- `resolutions.delete` - Delete draft resolutions
- `resolutions.change_status` - Change resolution status

### New Permissions

- `resolutions.sign` - Can be selected as a signer
- `resolutions.manage_signers` - Can add/remove signers
- `resolutions.download_pdf` - Can download PDF documents

### Visibility Rules

- No `resolutions.view` → Resolutions hidden from sidebar
- Signers automatically get view access to their assigned resolutions
- Company profile/stamp managed by Owner only (existing Settings page)

---

## Pages & Components

### Pages

| Page | Description |
|------|-------------|
| `/resolutions` | List view with stats (existing, minor updates) |
| `/resolutions/new` | AI chat + live preview for creating |
| `/resolutions/[id]` | Detail view with signers, signing UI, PDF download |
| `/settings` | Company profile fields + stamp upload (owner only) |
| User profile/settings | Signature upload |

### Components

| Component | Description |
|-----------|-------------|
| `ResolutionChat` | Chat interface for AI generation |
| `ResolutionPreview` | Live preview styled like PDF |
| `SignerSelector` | Multi-select company members |
| `SignatureUploader` | Upload/manage user signature |
| `StampUploader` | Upload/manage company stamp |
| `SigningStatus` | Shows signature progress |
| `SignResolutionDialog` | Confirmation when signing |
| `ResolutionPDF` | React-PDF component for generation |

### API Endpoints (New)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/resolutions/:id/signers` | Add signers |
| DELETE | `/resolutions/:id/signers/:userId` | Remove signer |
| POST | `/resolutions/:id/sign` | Current user signs |
| GET | `/resolutions/:id/pdf` | Generate/download PDF |
| POST | `/ai/generate-resolution` | Claude chat endpoint |
| POST | `/resolutions/:id/duplicate` | Create copy of resolution |

---

## Technical Notes

### File Storage

Signature images, company logos, and stamps stored via existing file upload infrastructure (likely S3/DigitalOcean Spaces based on env config).

### Claude API

- Requires `ANTHROPIC_API_KEY` environment variable
- Use claude-3-5-sonnet or claude-3-opus for quality
- System prompt emphasizes formal legal language, proper resolution structure

### Real-time Updates

- Chat responses streamed for live preview
- Consider WebSocket for signature status updates (already have socket.io)

---

## Out of Scope

- E-signature legal compliance (DocuSign integration)
- Sequential signing enforcement (all signers can sign in any order)
- Resolution versioning/amendments
- Bulk PDF export
