# Settings Page Redesign

**Date:** 2026-01-18
**Status:** Approved

## Overview

Redesign the cluttered settings page to use a sidebar navigation pattern with sub-pages, removing non-functional placeholder sections and improving the visual organization of the Company Profile form.

## Current Problems

1. Everything visible on one long scrollable page - overwhelming
2. Non-functional sections (Regional Settings, Integrations, Notifications) clutter the UI
3. Company Profile form is too dense with 10+ fields all visible at once

## Design Decisions

- **Layout:** Sidebar with sub-pages (like GitHub/Stripe settings)
- **Non-functional sections:** Remove entirely until implemented
- **Company Profile:** Single page with clear visual sections
- **Sidebar integration:** Nested within settings area

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Settings                                               │
│  Manage your company and account settings               │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  ┌────────┐  │   [Content area for selected page]       │
│  │Company │  │                                          │
│  │Profile │  │                                          │
│  ├────────┤  │                                          │
│  │Members │  │                                          │
│  ├────────┤  │                                          │
│  │Perms   │  │   (Permissions only visible to owners)   │
│  └────────┘  │                                          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### URL Structure

- `/settings` → Shows Company Profile by default
- `/settings/members` → Members page (already exists)
- `/settings/permissions` → Permissions page (already exists, owner only)

## Company Profile Page Design

Three distinct visual sections:

### Section A: Company Details
- Street Address (full width)
- City | Country (2 columns)
- Postal Code | Registration Number (2 columns)

### Section B: Contact Information
- Phone | Company Email (2 columns)
- Website (full width)

### Section C: Branding
Two side-by-side cards:
- **Company Logo** - Upload area with preview, description, file constraints
- **Company Stamp** - Upload area with preview, description, file constraints

### Visual Improvements
- Each section in its own Card with subtle header
- Remove redundant icons within sections
- Single "Save Changes" button at bottom
- Success/error messages at top of form
- Consistent spacing between sections

## Implementation Plan

### Files to Create
- `apps/web/app/companies/[companyId]/settings/layout.tsx` - Sidebar layout

### Files to Modify
- `apps/web/app/companies/[companyId]/settings/page.tsx` - Refactor to clean Company Profile

### Code to Remove
- ~300 lines of non-functional placeholder code:
  - Regional Settings section
  - Integrations section
  - Notifications section
