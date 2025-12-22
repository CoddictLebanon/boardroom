# OKR System Design

## Overview

Company-wide OKR (Objectives and Key Results) tracking system that allows companies to set quarterly goals, track progress through measurable key results, and monitor overall performance scores.

## Requirements

- Company-wide OKRs with role-based permissions
- Flexible time periods with custom start/end dates
- Living document that gets updated throughout the period
- SPA-style UI with AJAX updates (no page reloads)
- Progress tracking at three levels: Key Result, Objective, and Period

## Data Model

### Schema Changes

Add to Company model:
```prisma
currency String @default("USD")
```

New models:
```prisma
model OkrPeriod {
  id          String          @id @default(cuid())
  companyId   String
  name        String          // e.g., "2025 Q2 Product OKRs"
  startDate   DateTime
  endDate     DateTime
  status      OkrPeriodStatus @default(OPEN)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  company     Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  objectives  Objective[]

  @@index([companyId])
  @@index([companyId, status])
}

enum OkrPeriodStatus {
  OPEN
  CLOSED
}

model Objective {
  id          String      @id @default(cuid())
  periodId    String
  title       String      // e.g., "Mitigate PPC Risk"
  order       Int         @default(0)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  period      OkrPeriod   @relation(fields: [periodId], references: [id], onDelete: Cascade)
  keyResults  KeyResult[]

  @@index([periodId])
}

model KeyResult {
  id           String     @id @default(cuid())
  objectiveId  String
  title        String     // e.g., "Acquire 40,000 Customers from PPC"
  metricType   MetricType @default(NUMERIC)
  startValue   Decimal    @db.Decimal(15, 2)
  targetValue  Decimal    @db.Decimal(15, 2)
  currentValue Decimal    @db.Decimal(15, 2)
  inverse      Boolean    @default(false)  // true = lower is better
  comment      String?
  order        Int        @default(0)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  objective    Objective  @relation(fields: [objectiveId], references: [id], onDelete: Cascade)

  @@index([objectiveId])
}

enum MetricType {
  NUMERIC
  PERCENTAGE
  CURRENCY
  BOOLEAN
}
```

### Permissions

New permissions to seed:

| code | area | action | description |
|------|------|--------|-------------|
| `okrs.view` | okrs | view | View OKR periods, objectives, and key results |
| `okrs.create` | okrs | create | Create new OKR periods and objectives |
| `okrs.edit` | okrs | edit | Edit objectives and update key result values |
| `okrs.delete` | okrs | delete | Delete OKR periods, objectives, and key results |
| `okrs.close` | okrs | close | Close/reopen OKR periods |

Default role permissions:

| Permission | OWNER | ADMIN | BOARD_MEMBER | OBSERVER |
|------------|-------|-------|--------------|----------|
| `okrs.view` | Yes | Yes | Yes | Yes |
| `okrs.create` | Yes | Yes | No | No |
| `okrs.edit` | Yes | Yes | Yes | No |
| `okrs.delete` | Yes | Yes | No | No |
| `okrs.close` | Yes | Yes | No | No |

## API Endpoints

### OKR Periods

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/companies/:companyId/okr-periods` | `okrs.view` | List all periods (with objectives & key results) |
| `GET` | `/companies/:companyId/okr-periods/:id` | `okrs.view` | Get single period with full details |
| `POST` | `/companies/:companyId/okr-periods` | `okrs.create` | Create new period |
| `PATCH` | `/companies/:companyId/okr-periods/:id` | `okrs.edit` | Update period name/dates |
| `POST` | `/companies/:companyId/okr-periods/:id/close` | `okrs.close` | Close period |
| `POST` | `/companies/:companyId/okr-periods/:id/reopen` | `okrs.close` | Reopen closed period |
| `DELETE` | `/companies/:companyId/okr-periods/:id` | `okrs.delete` | Delete period |

### Objectives

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `POST` | `/okr-periods/:periodId/objectives` | `okrs.create` | Create objective |
| `PATCH` | `/objectives/:id` | `okrs.edit` | Update objective title/order |
| `DELETE` | `/objectives/:id` | `okrs.delete` | Delete objective |

### Key Results

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `POST` | `/objectives/:objectiveId/key-results` | `okrs.create` | Create key result |
| `PATCH` | `/key-results/:id` | `okrs.edit` | Update key result (values, comment, etc.) |
| `DELETE` | `/key-results/:id` | `okrs.delete` | Delete key result |

All endpoints return calculated progress percentages in the response.

## Score Calculation

### Key Result Progress

Formula: `(currentValue - startValue) / (targetValue - startValue) * 100`

- Clamped between 0% and 100%
- For inverse metrics (lower is better): `(startValue - currentValue) / (startValue - targetValue) * 100`
- For boolean metrics: 0% or 100%

```typescript
function calculateKeyResultProgress(kr: KeyResult): number {
  const { startValue, targetValue, currentValue, inverse, metricType } = kr;

  // Boolean type: 0% or 100%
  if (metricType === 'BOOLEAN') {
    return currentValue >= 1 ? 100 : 0;
  }

  const range = targetValue - startValue;
  if (range === 0) return currentValue >= targetValue ? 100 : 0;

  let progress: number;
  if (inverse) {
    // Lower is better: progress increases as value decreases
    progress = ((startValue - currentValue) / (startValue - targetValue)) * 100;
  } else {
    // Higher is better: standard formula
    progress = ((currentValue - startValue) / (targetValue - startValue)) * 100;
  }

  // Clamp between 0 and 100
  return Math.min(100, Math.max(0, progress));
}
```

### Objective Progress

Simple average of all key result progress values.

```typescript
function calculateObjectiveProgress(objective: Objective): number {
  if (objective.keyResults.length === 0) return 0;
  const sum = objective.keyResults.reduce((acc, kr) => acc + calculateKeyResultProgress(kr), 0);
  return sum / objective.keyResults.length;
}
```

### Period Score

Simple average of all objective progress values.

```typescript
function calculatePeriodScore(period: OkrPeriod): number {
  if (period.objectives.length === 0) return 0;
  const sum = period.objectives.reduce((acc, obj) => acc + calculateObjectiveProgress(obj), 0);
  return sum / period.objectives.length;
}
```

Calculations are performed on the backend and returned in API responses.

## UI Design

### Navigation

New "OKRs" top-level sidebar item at `/companies/[companyId]/okrs`

### Main OKRs Page

**Period Header:**
- Period selector dropdown (switch between periods, shows Open/Closed badge)
- Period name, start date, end date
- Days remaining (or "Ended" if past end date)
- Overall score percentage with progress bar
- "New Period" button (if `okrs.create` permission)

**OKR Table:**

```
+------------------------------------------------------------------+
| 2025 Q2 Product OKRs         Start: 2025-04-01  End: 2025-06-30  |
|                              Days remaining: Q2 Ended             |
| Score: [======22.92%=======]                                      |
+------------------------------------------------------------------+
| Objective              | Progress |                               |
+------------------------------------------------------------------+
| > Mitigate PPC Risk    | 28.83%   |                               |
|   - Acquire 40k cust.  | Numeric  | 30k | 40k | 30k | 0%   | ...  |
|   - Generate 75k SEO   | Numeric  | 50k | 75k | 71k | 84%  | ...  |
|   - Acquire 200 high.. | Numeric  | 0   | 200 | 5   | 2.5% | ...  |
+------------------------------------------------------------------+
| > Optimize ROI         | 17.00%   |                               |
|   - Increase margin    | Numeric  | 10  | 15  | 15  | 100% | ...  |
|   - Generate 400k USD  | Numeric  | 300k| 400k| 317k| 17%  | ...  |
+------------------------------------------------------------------+
```

**Table Columns for Key Results:**
- Title
- Metric type badge
- Start Value
- Target Value
- Current Value (inline editable)
- Progress percentage
- Last Update timestamp
- Comments (inline editable)
- Actions (Edit/Delete based on permissions)

**Inline Editing:**
- Click current value to edit in place
- Click comment to edit in place
- Save on blur or Enter key
- All updates via AJAX, no page reload

### Modals

- **New Period Modal:** Name, start date, end date
- **New Objective Modal:** Title
- **New Key Result Modal:** Title, metric type, start value, target value, current value, inverse checkbox
- **Edit modals** for each entity

## Permissions Enforcement

- View permission required to access the OKRs page
- Create/Edit/Delete buttons hidden based on permissions
- Closed periods are read-only regardless of permissions
- Backend validates permissions on all API calls
