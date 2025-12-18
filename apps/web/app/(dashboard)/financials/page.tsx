"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, TrendingUp, TrendingDown, Plus, FileText, Loader2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useCurrentCompany } from "@/lib/hooks/use-current-company";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type ReportType = "PROFIT_LOSS" | "BALANCE_SHEET" | "CASH_FLOW" | "BUDGET_VS_ACTUAL" | "CUSTOM";

export default function FinancialsPage() {
  const { getToken } = useAuth();
  const { currentCompany } = useCurrentCompany();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("PROFIT_LOSS");
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString());
  const [period, setPeriod] = useState("Q4");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setReportType("PROFIT_LOSS");
    setFiscalYear(new Date().getFullYear().toString());
    setPeriod("Q4");
  };

  const handleSubmit = async () => {
    if (!currentCompany) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies/${currentCompany.id}/financial-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: reportType,
          fiscalYear: parseInt(fiscalYear),
          period,
          data: {}, // Empty data object for now - can be expanded later
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create report");
      }

      resetForm();
      setDialogOpen(false);
      alert("Financial report created successfully!");
    } catch (error) {
      console.error("Error creating report:", error);
      alert("Failed to create report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground">
            View and manage financial reports
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,234,567</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              +12% from last quarter
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$876,543</div>
            <div className="flex items-center text-xs text-red-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              +5% from last quarter
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$358,024</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              +18% from last quarter
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Position</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,456,789</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              Strong liquidity
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Financial reports by period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium">Q4 2024 - Profit & Loss</h4>
                  <p className="text-sm text-muted-foreground">
                    Fiscal Year 2024 | October - December
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Final</Badge>
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">Q4 2024 - Balance Sheet</h4>
                  <p className="text-sm text-muted-foreground">
                    Fiscal Year 2024 | As of December 31
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Final</Badge>
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                  <FileText className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium">2025 Budget vs Actual</h4>
                  <p className="text-sm text-muted-foreground">
                    Fiscal Year 2025 | In Progress
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Draft</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Report Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Financial Report</DialogTitle>
            <DialogDescription>
              Create a new financial report.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROFIT_LOSS">Profit & Loss</SelectItem>
                  <SelectItem value="BALANCE_SHEET">Balance Sheet</SelectItem>
                  <SelectItem value="CASH_FLOW">Cash Flow</SelectItem>
                  <SelectItem value="BUDGET_VS_ACTUAL">Budget vs Actual</SelectItem>
                  <SelectItem value="CUSTOM">Custom Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="year">Fiscal Year</Label>
                <Input
                  id="year"
                  type="number"
                  min="1900"
                  max="2100"
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="period">Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                    <SelectItem value="Q2">Q2 (Apr-Jun)</SelectItem>
                    <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                    <SelectItem value="Q4">Q4 (Oct-Dec)</SelectItem>
                    <SelectItem value="Annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
