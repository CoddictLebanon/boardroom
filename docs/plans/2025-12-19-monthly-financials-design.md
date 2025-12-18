# Monthly Financials Feature Design

## Overview

Replace the current financial reports system with a simpler monthly financial performance tracker focused on revenue, cost, and profit with bar chart visualization.

## Requirements

1. **Monthly data entry**: Simple form with revenue, cost, profit per month
2. **Single annual view**: See and edit all 12 months of a year at once
3. **Bar chart visualization**: Grouped bars showing revenue and profit side by side
4. **Monthly/Quarterly toggle**: Switch chart view between 12 months or 4 quarters
5. **PDF upload per month**: Attach supporting documents (stored locally on server)

## Data Model

```prisma
model MonthlyFinancial {
  id            String   @id @default(cuid())
  companyId     String
  year          Int
  month         Int      // 1-12
  revenue       Decimal  @db.Decimal(15, 2)
  cost          Decimal  @db.Decimal(15, 2)
  profit        Decimal  @db.Decimal(15, 2)
  pdfPath       String?  // Local file path for PDF
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, year, month])
  @@index([companyId, year])
}
```

## API Endpoints

- `GET /companies/:companyId/monthly-financials?year=2025` - Get all 12 months for a year
- `PUT /companies/:companyId/monthly-financials/:year/:month` - Upsert a month's data
- `POST /companies/:companyId/monthly-financials/:year/:month/pdf` - Upload PDF
- `GET /companies/:companyId/monthly-financials/:year/:month/pdf` - Download PDF
- `DELETE /companies/:companyId/monthly-financials/:year/:month/pdf` - Delete PDF

## File Storage

PDFs stored locally at: `uploads/financials/{companyId}/{year}/{month}.pdf`

## UI Components

### Chart Section
- Year selector dropdown
- Monthly/Quarterly toggle
- Recharts BarChart with grouped bars (revenue=blue, profit=green)

### Data Entry Table
- 12 rows (Jan-Dec)
- Columns: Month | Revenue | Cost | Profit (calculated) | PDF | Actions
- Inline editing with auto-save
- PDF upload/download/delete per row
