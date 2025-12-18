# Monthly Financials Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the complex financial reports system with a simple monthly performance tracker showing revenue, cost, profit with bar chart visualization.

**Architecture:** Add MonthlyFinancial Prisma model, create NestJS module with CRUD + file upload endpoints, replace frontend financials page with chart + data table using Recharts.

**Tech Stack:** Prisma, NestJS, Next.js, Recharts, Multer (file uploads)

---

### Task 1: Add MonthlyFinancial Prisma Model

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Step 1: Add the MonthlyFinancial model to schema**

Add after the FinancialReport model (around line 468):

```prisma
model MonthlyFinancial {
  id        String   @id @default(cuid())
  companyId String
  year      Int
  month     Int      // 1-12
  revenue   Decimal  @db.Decimal(15, 2)
  cost      Decimal  @db.Decimal(15, 2)
  profit    Decimal  @db.Decimal(15, 2)
  pdfPath   String?  // Local file path for PDF
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, year, month])
  @@index([companyId, year])
}
```

**Step 2: Add relation to Company model**

Find the Company model and add to its relations list:

```prisma
monthlyFinancials MonthlyFinancial[]
```

**Step 3: Run Prisma migration**

Run: `cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/api && npx prisma migrate dev --name add_monthly_financials`

Expected: Migration created and applied successfully

**Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat: add MonthlyFinancial model for monthly performance tracking"
```

---

### Task 2: Create Monthly Financials NestJS Module Structure

**Files:**
- Create: `apps/api/src/monthly-financials/monthly-financials.module.ts`
- Create: `apps/api/src/monthly-financials/monthly-financials.controller.ts`
- Create: `apps/api/src/monthly-financials/monthly-financials.service.ts`
- Create: `apps/api/src/monthly-financials/dto/upsert-monthly-financial.dto.ts`

**Step 1: Create the DTO**

```typescript
// apps/api/src/monthly-financials/dto/upsert-monthly-financial.dto.ts
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertMonthlyFinancialDto {
  @IsNumber()
  @Type(() => Number)
  revenue: number;

  @IsNumber()
  @Type(() => Number)
  cost: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

**Step 2: Create the service**

```typescript
// apps/api/src/monthly-financials/monthly-financials.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertMonthlyFinancialDto } from './dto/upsert-monthly-financial.dto';
import { Decimal } from '@prisma/client/runtime/library';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MonthlyFinancialsService {
  constructor(private prisma: PrismaService) {}

  async verifyCompanyAccess(companyId: string, userId: string) {
    const membership = await this.prisma.companyMember.findFirst({
      where: { companyId, userId, status: 'ACTIVE' },
    });
    if (!membership) {
      throw new ForbiddenException('You do not have access to this company');
    }
    return membership;
  }

  async getYearData(companyId: string, year: number) {
    const records = await this.prisma.monthlyFinancial.findMany({
      where: { companyId, year },
      orderBy: { month: 'asc' },
    });

    // Return array with all 12 months, filling in missing ones with null values
    const monthsData = [];
    for (let month = 1; month <= 12; month++) {
      const record = records.find((r) => r.month === month);
      if (record) {
        monthsData.push({
          ...record,
          revenue: Number(record.revenue),
          cost: Number(record.cost),
          profit: Number(record.profit),
        });
      } else {
        monthsData.push({
          id: null,
          companyId,
          year,
          month,
          revenue: null,
          cost: null,
          profit: null,
          pdfPath: null,
          notes: null,
        });
      }
    }
    return monthsData;
  }

  async upsertMonth(
    companyId: string,
    year: number,
    month: number,
    dto: UpsertMonthlyFinancialDto,
  ) {
    const profit = dto.revenue - dto.cost;

    return this.prisma.monthlyFinancial.upsert({
      where: {
        companyId_year_month: { companyId, year, month },
      },
      create: {
        companyId,
        year,
        month,
        revenue: new Decimal(dto.revenue),
        cost: new Decimal(dto.cost),
        profit: new Decimal(profit),
        notes: dto.notes,
      },
      update: {
        revenue: new Decimal(dto.revenue),
        cost: new Decimal(dto.cost),
        profit: new Decimal(profit),
        notes: dto.notes,
      },
    });
  }

  async savePdf(
    companyId: string,
    year: number,
    month: number,
    file: Express.Multer.File,
  ) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'financials', companyId, String(year));

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, `${month}.pdf`);
    fs.writeFileSync(filePath, file.buffer);

    // Update record with PDF path
    await this.prisma.monthlyFinancial.upsert({
      where: {
        companyId_year_month: { companyId, year, month },
      },
      create: {
        companyId,
        year,
        month,
        revenue: new Decimal(0),
        cost: new Decimal(0),
        profit: new Decimal(0),
        pdfPath: filePath,
      },
      update: {
        pdfPath: filePath,
      },
    });

    return { pdfPath: filePath };
  }

  async getPdfPath(companyId: string, year: number, month: number) {
    const record = await this.prisma.monthlyFinancial.findUnique({
      where: {
        companyId_year_month: { companyId, year, month },
      },
    });

    if (!record?.pdfPath || !fs.existsSync(record.pdfPath)) {
      throw new NotFoundException('PDF not found');
    }

    return record.pdfPath;
  }

  async deletePdf(companyId: string, year: number, month: number) {
    const record = await this.prisma.monthlyFinancial.findUnique({
      where: {
        companyId_year_month: { companyId, year, month },
      },
    });

    if (record?.pdfPath && fs.existsSync(record.pdfPath)) {
      fs.unlinkSync(record.pdfPath);
    }

    await this.prisma.monthlyFinancial.update({
      where: {
        companyId_year_month: { companyId, year, month },
      },
      data: { pdfPath: null },
    });

    return { success: true };
  }
}
```

**Step 3: Create the controller**

```typescript
// apps/api/src/monthly-financials/monthly-financials.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MonthlyFinancialsService } from './monthly-financials.service';
import { UpsertMonthlyFinancialDto } from './dto/upsert-monthly-financial.dto';
import * as fs from 'fs';

@Controller()
@UseGuards(AuthGuard)
export class MonthlyFinancialsController {
  constructor(private readonly monthlyFinancialsService: MonthlyFinancialsService) {}

  @Get('companies/:companyId/monthly-financials')
  async getYearData(
    @Param('companyId') companyId: string,
    @Query('year', ParseIntPipe) year: number,
    @CurrentUser() userId: string,
  ) {
    await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
    return this.monthlyFinancialsService.getYearData(companyId, year);
  }

  @Put('companies/:companyId/monthly-financials/:year/:month')
  async upsertMonth(
    @Param('companyId') companyId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Body() dto: UpsertMonthlyFinancialDto,
    @CurrentUser() userId: string,
  ) {
    await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
    return this.monthlyFinancialsService.upsertMonth(companyId, year, month, dto);
  }

  @Post('companies/:companyId/monthly-financials/:year/:month/pdf')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(
    @Param('companyId') companyId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() userId: string,
  ) {
    await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
    return this.monthlyFinancialsService.savePdf(companyId, year, month, file);
  }

  @Get('companies/:companyId/monthly-financials/:year/:month/pdf')
  async downloadPdf(
    @Param('companyId') companyId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @CurrentUser() userId: string,
    @Res() res: Response,
  ) {
    await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
    const pdfPath = await this.monthlyFinancialsService.getPdfPath(companyId, year, month);
    const fileStream = fs.createReadStream(pdfPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${month}-${year}.pdf"`);
    fileStream.pipe(res);
  }

  @Delete('companies/:companyId/monthly-financials/:year/:month/pdf')
  async deletePdf(
    @Param('companyId') companyId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @CurrentUser() userId: string,
  ) {
    await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
    return this.monthlyFinancialsService.deletePdf(companyId, year, month);
  }
}
```

**Step 4: Create the module**

```typescript
// apps/api/src/monthly-financials/monthly-financials.module.ts
import { Module } from '@nestjs/common';
import { MonthlyFinancialsController } from './monthly-financials.controller';
import { MonthlyFinancialsService } from './monthly-financials.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MonthlyFinancialsController],
  providers: [MonthlyFinancialsService],
})
export class MonthlyFinancialsModule {}
```

**Step 5: Register module in app.module.ts**

Modify: `apps/api/src/app.module.ts`

Add import:
```typescript
import { MonthlyFinancialsModule } from './monthly-financials/monthly-financials.module';
```

Add to imports array:
```typescript
MonthlyFinancialsModule,
```

**Step 6: Verify backend builds**

Run: `cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/api && npm run build`

Expected: Build succeeds with no errors

**Step 7: Commit**

```bash
git add apps/api/src/monthly-financials/ apps/api/src/app.module.ts
git commit -m "feat: add monthly-financials NestJS module with CRUD and PDF upload"
```

---

### Task 3: Install Recharts in Frontend

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install Recharts**

Run: `cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/web && npm install recharts`

Expected: Package installed successfully

**Step 2: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json
git commit -m "feat: add recharts for financial charts"
```

---

### Task 4: Replace Financials Page with New Implementation

**Files:**
- Modify: `apps/web/app/companies/[companyId]/financials/page.tsx`
- Delete: `apps/web/app/companies/[companyId]/financials/[reportId]/page.tsx` (no longer needed)

**Step 1: Replace the financials page**

```typescript
// apps/web/app/companies/[companyId]/financials/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, Upload, Download, Trash2, FileText, Loader2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface MonthlyData {
  id: string | null;
  companyId: string;
  year: number;
  month: number;
  revenue: number | null;
  cost: number | null;
  profit: number | null;
  pdfPath: string | null;
  notes: string | null;
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FinancialsPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const companyId = params.companyId as string;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState<"monthly" | "quarterly">("monthly");
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ month: number; field: "revenue" | "cost" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [uploadingMonth, setUploadingMonth] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/companies/${companyId}/monthly-financials?year=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setMonthlyData(data);
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, selectedYear, getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (month: number, field: "revenue" | "cost", value: string) => {
    const numValue = parseFloat(value) || 0;
    const currentMonthData = monthlyData.find((m) => m.month === month);

    const revenue = field === "revenue" ? numValue : (currentMonthData?.revenue || 0);
    const cost = field === "cost" ? numValue : (currentMonthData?.cost || 0);

    try {
      const token = await getToken();
      await fetch(
        `${API_URL}/companies/${companyId}/monthly-financials/${selectedYear}/${month}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ revenue, cost }),
        }
      );
      await fetchData();
    } catch (error) {
      console.error("Error saving data:", error);
    }
    setEditingCell(null);
    setEditValue("");
  };

  const handlePdfUpload = async (month: number, file: File) => {
    try {
      setUploadingMonth(month);
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);

      await fetch(
        `${API_URL}/companies/${companyId}/monthly-financials/${selectedYear}/${month}/pdf`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      await fetchData();
    } catch (error) {
      console.error("Error uploading PDF:", error);
    } finally {
      setUploadingMonth(null);
    }
  };

  const handlePdfDownload = async (month: number) => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/companies/${companyId}/monthly-financials/${selectedYear}/${month}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${MONTHS[month - 1]}-${selectedYear}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  const handlePdfDelete = async (month: number) => {
    if (!confirm("Delete this PDF?")) return;
    try {
      const token = await getToken();
      await fetch(
        `${API_URL}/companies/${companyId}/monthly-financials/${selectedYear}/${month}/pdf`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await fetchData();
    } catch (error) {
      console.error("Error deleting PDF:", error);
    }
  };

  // Prepare chart data
  const getChartData = () => {
    if (viewMode === "monthly") {
      return monthlyData.map((m) => ({
        name: MONTHS[m.month - 1].substring(0, 3),
        Revenue: m.revenue || 0,
        Profit: m.profit || 0,
      }));
    } else {
      // Quarterly view
      const quarters = [
        { name: "Q1", months: [1, 2, 3] },
        { name: "Q2", months: [4, 5, 6] },
        { name: "Q3", months: [7, 8, 9] },
        { name: "Q4", months: [10, 11, 12] },
      ];
      return quarters.map((q) => {
        const quarterData = monthlyData.filter((m) => q.months.includes(m.month));
        return {
          name: q.name,
          Revenue: quarterData.reduce((sum, m) => sum + (m.revenue || 0), 0),
          Profit: quarterData.reduce((sum, m) => sum + (m.profit || 0), 0),
        };
      });
    }
  };

  // Calculate totals
  const totalRevenue = monthlyData.reduce((sum, m) => sum + (m.revenue || 0), 0);
  const totalCost = monthlyData.reduce((sum, m) => sum + (m.cost || 0), 0);
  const totalProfit = monthlyData.reduce((sum, m) => sum + (m.profit || 0), 0);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Performance</h1>
          <p className="text-muted-foreground">Monthly revenue, cost, and profit tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Year {selectedYear}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <p className="text-xs text-muted-foreground">Year {selectedYear}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalProfit)}</div>
            <p className="text-xs text-muted-foreground">Year {selectedYear}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance Chart</CardTitle>
              <CardDescription>Revenue and profit comparison</CardDescription>
            </div>
            <div className="flex gap-1 rounded-lg border p-1">
              <Button
                variant={viewMode === "monthly" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("monthly")}
              >
                Monthly
              </Button>
              <Button
                variant={viewMode === "quarterly" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("quarterly")}
              >
                Quarterly
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Revenue" fill="#3b82f6" />
                <Bar dataKey="Profit" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Data Entry Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Data Entry</CardTitle>
          <CardDescription>Click any cell to edit. Profit is calculated automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Month</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead className="w-[150px]">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((data) => (
                  <TableRow key={data.month}>
                    <TableCell className="font-medium">{MONTHS[data.month - 1]}</TableCell>
                    <TableCell
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setEditingCell({ month: data.month, field: "revenue" });
                        setEditValue(String(data.revenue || ""));
                      }}
                    >
                      {editingCell?.month === data.month && editingCell?.field === "revenue" ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleSave(data.month, "revenue", editValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(data.month, "revenue", editValue);
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          autoFocus
                          className="w-32"
                        />
                      ) : (
                        formatCurrency(data.revenue)
                      )}
                    </TableCell>
                    <TableCell
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setEditingCell({ month: data.month, field: "cost" });
                        setEditValue(String(data.cost || ""));
                      }}
                    >
                      {editingCell?.month === data.month && editingCell?.field === "cost" ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleSave(data.month, "cost", editValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(data.month, "cost", editValue);
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          autoFocus
                          className="w-32"
                        />
                      ) : (
                        formatCurrency(data.cost)
                      )}
                    </TableCell>
                    <TableCell className={data.profit !== null && data.profit < 0 ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(data.profit)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {data.pdfPath ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePdfDownload(data.month)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePdfDelete(data.month)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePdfUpload(data.month, file);
                              }}
                            />
                            <Button variant="ghost" size="sm" asChild disabled={uploadingMonth === data.month}>
                              <span>
                                {uploadingMonth === data.month ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </span>
                            </Button>
                          </label>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Delete the old report detail page**

Run: `rm /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/web/app/companies/\[companyId\]/financials/\[reportId\]/page.tsx`
Run: `rmdir /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/web/app/companies/\[companyId\]/financials/\[reportId\]`

**Step 3: Verify frontend builds**

Run: `cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/web && npm run build`

Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add apps/web/app/companies/\[companyId\]/financials/
git commit -m "feat: replace financial reports with monthly performance tracker"
```

---

### Task 5: Final Verification

**Step 1: Run both builds**

Run: `cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/api && npm run build`
Run: `cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/web && npm run build`

Expected: Both build successfully

**Step 2: Create uploads directory**

Run: `mkdir -p /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/api/uploads/financials`

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete monthly financials feature with chart and PDF uploads"
```

> **REQUIRED SUB-SKILL:** Use superpowers:verification-before-completion before claiming the implementation is complete.
