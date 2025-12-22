# Financials Module

## Overview

The Financials module provides two complementary features:
1. **Monthly Financials** - Month-by-month financial data tracking with PDF attachments
2. **Financial Reports** - Formal financial reports with status workflow

## Monthly Financials

### Database Schema

```prisma
model MonthlyFinancial {
  id        String   @id @default(cuid())
  companyId String
  year      Int
  month     Int      // 1-12
  revenue   Decimal? @db.Decimal(15, 2)
  expenses  Decimal? @db.Decimal(15, 2)
  netIncome Decimal? @db.Decimal(15, 2)
  notes     String?
  pdfPath   String?  // Path to attached PDF
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, year, month])
}
```

### API Endpoints

```
GET  /api/v1/companies/:companyId/monthly-financials?year=2025
PUT  /api/v1/companies/:companyId/monthly-financials/:year/:month
POST /api/v1/companies/:companyId/monthly-financials/:year/:month/pdf
GET  /api/v1/companies/:companyId/monthly-financials/:year/:month/pdf
DELETE /api/v1/companies/:companyId/monthly-financials/:year/:month/pdf
```

**Get Year Data:**
Returns all 12 months for the specified year, with null values for months without data.

**Upsert Monthly Data:**
```json
{
  "revenue": 150000.00,
  "expenses": 120000.00,
  "netIncome": 30000.00,
  "notes": "Strong Q1 performance"
}
```

**PDF Upload:**
- Max size: 10MB
- Content-Type: multipart/form-data

---

## Financial Reports

### Database Schema

```prisma
model FinancialReport {
  id          String              @id @default(cuid())
  companyId   String
  type        FinancialReportType
  title       String
  fiscalYear  Int
  period      String?             // e.g., "Q1", "H1", "Annual"
  status      ReportStatus        @default(DRAFT)
  filePath    String?
  notes       String?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  finalizedAt DateTime?

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
}

enum FinancialReportType {
  BALANCE_SHEET
  INCOME_STATEMENT
  CASH_FLOW
  BUDGET
  FORECAST
  AUDIT
  TAX
  OTHER
}

enum ReportStatus {
  DRAFT
  FINALIZED
  ARCHIVED
}
```

### API Endpoints

```
POST   /api/v1/companies/:companyId/financial-reports
GET    /api/v1/companies/:companyId/financial-reports
GET    /api/v1/financial-reports/:id
PUT    /api/v1/financial-reports/:id
DELETE /api/v1/financial-reports/:id
PUT    /api/v1/financial-reports/:id/finalize
POST   /api/v1/financial-reports/:id/upload
```

**Create Report:**
```json
{
  "type": "INCOME_STATEMENT",
  "title": "Q1 2025 Income Statement",
  "fiscalYear": 2025,
  "period": "Q1",
  "notes": "Preliminary figures"
}
```

**Query Parameters:**
- `type` - Filter by report type
- `fiscalYear` - Filter by fiscal year
- `period` - Filter by period
- `status` - Filter by status

### Status Workflow

```
DRAFT → FINALIZED → ARCHIVED
```

**Finalize Report:**
```
PUT /api/v1/financial-reports/:id/finalize
```

Sets `finalizedAt` timestamp and changes status to FINALIZED.

## Permissions

| Action | Required Permission |
|--------|-------------------|
| View financials | `financials.view` |
| Create/update data | `financials.create` |
| Delete reports | `financials.delete` |
| Upload PDFs | `financials.update` |

## Related Files

### Monthly Financials
- Controller: `src/monthly-financials/monthly-financials.controller.ts`
- Service: `src/monthly-financials/monthly-financials.service.ts`

### Financial Reports
- Controller: `src/financial-reports/financial-reports.controller.ts`
- Service: `src/financial-reports/financial-reports.service.ts`
