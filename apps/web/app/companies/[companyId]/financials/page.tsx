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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ month: number; field: "revenue" | "cost" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [uploadingMonth, setUploadingMonth] = useState<number | null>(null);

  // Generate empty month data as fallback
  const getEmptyMonthsData = useCallback((): MonthlyData[] => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: null,
      companyId,
      year: selectedYear,
      month: i + 1,
      revenue: null,
      cost: null,
      profit: null,
      pdfPath: null,
      notes: null,
    }));
  }, [companyId, selectedYear]);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsInitialLoading(true);
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/companies/${companyId}/monthly-financials?year=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Ensure we always have 12 months of data
        if (Array.isArray(data) && data.length === 12) {
          setMonthlyData(data);
        } else {
          setMonthlyData(getEmptyMonthsData());
        }
      } else {
        // If API fails, show empty rows so user can still enter data
        setMonthlyData(getEmptyMonthsData());
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
      // On error, show empty rows so user can still enter data
      setMonthlyData(getEmptyMonthsData());
    } finally {
      if (showLoading) setIsInitialLoading(false);
    }
  }, [companyId, selectedYear, getToken, getEmptyMonthsData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (month: number, field: "revenue" | "cost", value: string) => {
    const numValue = parseFloat(value) || 0;
    const currentMonthData = monthlyData.find((m) => m.month === month);

    const revenue = field === "revenue" ? numValue : (currentMonthData?.revenue || 0);
    const cost = field === "cost" ? numValue : (currentMonthData?.cost || 0);
    const profit = revenue - cost;

    // Optimistic update - update local state immediately
    setMonthlyData((prev) =>
      prev.map((m) =>
        m.month === month ? { ...m, revenue, cost, profit } : m
      )
    );
    setEditingCell(null);
    setEditValue("");

    // Then sync with server in background (no loading state)
    try {
      setIsSaving(true);
      const token = await getToken();
      const response = await fetch(
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

      // If server returns updated data, use it (in case profit calculation differs)
      if (response.ok) {
        const savedData = await response.json();
        setMonthlyData((prev) =>
          prev.map((m) =>
            m.month === month ? { ...m, ...savedData } : m
          )
        );
      }
    } catch (error) {
      console.error("Error saving data:", error);
      // On error, refetch to restore correct state
      await fetchData(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePdfUpload = async (month: number, file: File) => {
    try {
      setUploadingMonth(month);
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/companies/${companyId}/monthly-financials/${selectedYear}/${month}/pdf`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      // Optimistic update for PDF path
      if (response.ok) {
        const data = await response.json();
        setMonthlyData((prev) =>
          prev.map((m) =>
            m.month === month ? { ...m, pdfPath: data.pdfPath } : m
          )
        );
      }
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

    // Optimistic update - remove PDF path immediately
    setMonthlyData((prev) =>
      prev.map((m) =>
        m.month === month ? { ...m, pdfPath: null } : m
      )
    );

    try {
      const token = await getToken();
      await fetch(
        `${API_URL}/companies/${companyId}/monthly-financials/${selectedYear}/${month}/pdf`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      console.error("Error deleting PDF:", error);
      // On error, refetch to restore correct state
      await fetchData(false);
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
          {isInitialLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? null)} />
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
          {isInitialLoading ? (
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
