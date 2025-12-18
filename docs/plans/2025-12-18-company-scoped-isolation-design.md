# Company-Scoped Data Isolation Design

**Goal:** Enforce complete data isolation per company - users must select a company to see any data, no cross-company aggregation.

## Requirements

1. Each company has its own fully isolated dashboard
2. Company picker at `/companies` - users must explicitly choose
3. If user belongs to 1 company → auto-redirect to dashboard
4. If user belongs to 2+ companies → show picker
5. Company ID in URL: `/companies/[companyId]/dashboard`, etc.
6. Switching companies via sidebar stays on same page, loads new data
7. Invalid company access → redirect to `/companies` with error

## URL Structure

```
/                              → Redirect to /companies
/sign-in                       → Clerk sign-in (public)
/companies                     → Company picker page
/companies/[companyId]/dashboard
/companies/[companyId]/meetings
/companies/[companyId]/meetings/[meetingId]
/companies/[companyId]/meetings/new
/companies/[companyId]/action-items
/companies/[companyId]/documents
/companies/[companyId]/resolutions
/companies/[companyId]/financials
/companies/[companyId]/members
/companies/[companyId]/settings
```

## Company Picker Page

- Location: `/companies/page.tsx`
- Shows grid of company cards (logo, name, user's role)
- 0 companies: Empty state with "contact administrator" message
- 1 company: Auto-redirect to dashboard
- 2+ companies: Show picker

## Company Layout

- Location: `/companies/[companyId]/layout.tsx`
- Validates membership server-side
- Provides company context from URL params
- Renders sidebar with company switcher

## Migration

**Move:** `app/(dashboard)/*` → `app/companies/[companyId]/*`
**Create:** `app/companies/page.tsx`, `app/companies/[companyId]/layout.tsx`
**Delete:** `lib/hooks/use-current-company.ts`
**Modify:** `app/page.tsx`, `middleware.ts`, `components/sidebar.tsx`, `components/company-switcher.tsx`, all pages

**API unchanged** - already scopes by companyId in URL
