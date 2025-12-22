"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, Loader2, Calendar } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { usePermission } from "@/lib/permissions";
import type { OkrPeriod, Objective, KeyResult, MetricType } from "@/lib/types";
import {
  getOkrPeriods,
  createOkrPeriod,
  updateOkrPeriod,
  closeOkrPeriod,
  reopenOkrPeriod,
  deleteOkrPeriod,
  createObjective,
  updateObjective,
  deleteObjective,
  createKeyResult,
  updateKeyResult,
  deleteKeyResult,
  type CreateOkrPeriodData,
  type CreateObjectiveData,
  type CreateKeyResultData,
} from "@/lib/api/okrs";

// Helper functions
function formatMetricValue(value: number, metricType: MetricType): string {
  switch (metricType) {
    case "PERCENTAGE":
      return `${value}%`;
    case "CURRENCY":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case "BOOLEAN":
      return value >= 1 ? "Done" : "Pending";
    case "NUMERIC":
    default:
      return String(value);
  }
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Progress calculation functions (match backend logic)
function calculateKeyResultProgress(kr: KeyResult): number {
  const start = kr.startValue;
  const target = kr.targetValue;
  const current = kr.currentValue;

  // Boolean type: 0% or 100%
  if (kr.metricType === "BOOLEAN") {
    return current >= 1 ? 100 : 0;
  }

  const range = target - start;
  if (range === 0) return current >= target ? 100 : 0;

  let progress: number;
  if (kr.inverse) {
    // Lower is better
    progress = ((start - current) / (start - target)) * 100;
  } else {
    // Higher is better
    progress = ((current - start) / (target - start)) * 100;
  }

  // Clamp between 0 and 100
  return Math.min(100, Math.max(0, progress));
}

function calculateObjectiveProgress(keyResults: KeyResult[]): number {
  if (keyResults.length === 0) return 0;
  const sum = keyResults.reduce((acc, kr) => acc + calculateKeyResultProgress(kr), 0);
  return sum / keyResults.length;
}

function calculatePeriodScore(objectives: Objective[]): number {
  if (objectives.length === 0) return 0;
  const sum = objectives.reduce((acc, obj) => {
    const objProgress = calculateObjectiveProgress(obj.keyResults || []);
    return acc + objProgress;
  }, 0);
  return sum / objectives.length;
}

// Recalculate all progress values for a period
function recalculatePeriodProgress(period: OkrPeriod): OkrPeriod {
  const objectives = (period.objectives || []).map((obj) => {
    const keyResults = (obj.keyResults || []).map((kr) => ({
      ...kr,
      progress: calculateKeyResultProgress(kr),
    }));
    return {
      ...obj,
      keyResults,
      progress: calculateObjectiveProgress(keyResults),
    };
  });
  return {
    ...period,
    objectives,
    score: calculatePeriodScore(objectives),
  };
}

export default function OKRsPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const companyId = params.companyId as string;

  // Permission checks
  const canView = usePermission("okrs.view");
  const canCreate = usePermission("okrs.create");
  const canEdit = usePermission("okrs.edit");
  const canDelete = usePermission("okrs.delete");
  const canClose = usePermission("okrs.close");

  // State management
  const [periods, setPeriods] = useState<OkrPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());

  // Dialog states
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [objectiveDialogOpen, setObjectiveDialogOpen] = useState(false);
  const [keyResultDialogOpen, setKeyResultDialogOpen] = useState(false);

  // Form states
  const [periodForm, setPeriodForm] = useState<CreateOkrPeriodData & { id?: string }>({
    name: "",
    startDate: "",
    endDate: "",
  });
  const [objectiveForm, setObjectiveForm] = useState<CreateObjectiveData & { id?: string }>({
    title: "",
  });
  const [keyResultForm, setKeyResultForm] = useState<
    CreateKeyResultData & { id?: string; objectiveId?: string }
  >({
    title: "",
    metricType: "NUMERIC",
    startValue: 0,
    targetValue: 100,
    currentValue: 0,
    inverse: false,
  });

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    krId: string;
    field: "currentValue" | "comment";
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Load periods
  const loadPeriods = useCallback(async () => {
    if (!canView) return;

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const data = await getOkrPeriods(companyId, token);
      setPeriods(data);

      // Auto-select first open period or most recent
      if (data.length > 0 && !selectedPeriodId) {
        const openPeriod = data.find((p) => p.status === "OPEN");
        setSelectedPeriodId(openPeriod?.id || data[0].id);
      }
    } catch (error) {
      console.error("Error loading periods:", error);
    } finally {
      setLoading(false);
    }
  }, [companyId, getToken, canView, selectedPeriodId]);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  // Get selected period
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  // Period CRUD operations
  const handleCreatePeriod = async () => {
    // Validate form
    if (!periodForm.name.trim()) {
      alert("Please enter a period name");
      return;
    }
    if (!periodForm.startDate || !periodForm.endDate) {
      alert("Please select start and end dates");
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        alert("Authentication error. Please sign in again.");
        return;
      }

      // Convert dates to ISO format
      const data = {
        name: periodForm.name.trim(),
        startDate: new Date(periodForm.startDate).toISOString(),
        endDate: new Date(periodForm.endDate).toISOString(),
      };

      const newPeriod = await createOkrPeriod(companyId, data, token);
      setPeriods([...periods, newPeriod]);
      setSelectedPeriodId(newPeriod.id);
      setPeriodDialogOpen(false);
      setPeriodForm({ name: "", startDate: "", endDate: "" });
    } catch (error) {
      console.error("Error creating period:", error);
      alert(error instanceof Error ? error.message : "Failed to create period");
    }
  };

  const handleUpdatePeriod = async () => {
    if (!periodForm.id) return;

    try {
      const token = await getToken();
      if (!token) {
        alert("Authentication error. Please sign in again.");
        return;
      }

      const { id, ...formData } = periodForm;
      // Convert dates to ISO format if provided
      const data = {
        name: formData.name?.trim() || undefined,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      };

      const updated = await updateOkrPeriod(companyId, id, data, token);
      setPeriods(periods.map((p) => (p.id === id ? updated : p)));
      setPeriodDialogOpen(false);
      setPeriodForm({ name: "", startDate: "", endDate: "" });
    } catch (error) {
      console.error("Error updating period:", error);
      alert(error instanceof Error ? error.message : "Failed to update period");
    }
  };

  const handleClosePeriod = async (periodId: string) => {
    if (!confirm("Close this period? You can reopen it later.")) return;

    try {
      const token = await getToken();
      if (!token) return;

      const updated = await closeOkrPeriod(companyId, periodId, token);
      setPeriods(periods.map((p) => (p.id === periodId ? updated : p)));
    } catch (error) {
      console.error("Error closing period:", error);
    }
  };

  const handleReopenPeriod = async (periodId: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const updated = await reopenOkrPeriod(companyId, periodId, token);
      setPeriods(periods.map((p) => (p.id === periodId ? updated : p)));
    } catch (error) {
      console.error("Error reopening period:", error);
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    if (!confirm("Delete this period and all its objectives? This cannot be undone.")) return;

    try {
      const token = await getToken();
      if (!token) return;

      await deleteOkrPeriod(companyId, periodId, token);
      setPeriods(periods.filter((p) => p.id !== periodId));
      if (selectedPeriodId === periodId) {
        setSelectedPeriodId(periods[0]?.id || null);
      }
    } catch (error) {
      console.error("Error deleting period:", error);
    }
  };

  // Objective CRUD operations
  const handleCreateObjective = async () => {
    if (!selectedPeriodId) return;

    try {
      const token = await getToken();
      if (!token) return;

      const newObjective = await createObjective(companyId, selectedPeriodId, objectiveForm, token);
      setPeriods(
        periods.map((p) =>
          p.id === selectedPeriodId
            ? { ...p, objectives: [...(p.objectives || []), newObjective] }
            : p
        )
      );
      setObjectiveDialogOpen(false);
      setObjectiveForm({ title: "" });
    } catch (error) {
      console.error("Error creating objective:", error);
    }
  };

  const handleUpdateObjective = async () => {
    if (!selectedPeriodId || !objectiveForm.id) return;

    try {
      const token = await getToken();
      if (!token) return;

      const { id, ...data } = objectiveForm;
      const updated = await updateObjective(companyId, selectedPeriodId, id, data, token);
      setPeriods(
        periods.map((p) =>
          p.id === selectedPeriodId
            ? {
                ...p,
                objectives: (p.objectives || []).map((obj) => (obj.id === id ? updated : obj)),
              }
            : p
        )
      );
      setObjectiveDialogOpen(false);
      setObjectiveForm({ title: "" });
    } catch (error) {
      console.error("Error updating objective:", error);
    }
  };

  const handleDeleteObjective = async (objectiveId: string) => {
    if (!selectedPeriodId) return;
    if (!confirm("Delete this objective and all its key results? This cannot be undone.")) return;

    try {
      const token = await getToken();
      if (!token) return;

      await deleteObjective(companyId, selectedPeriodId, objectiveId, token);
      setPeriods(
        periods.map((p) =>
          p.id === selectedPeriodId
            ? { ...p, objectives: (p.objectives || []).filter((obj) => obj.id !== objectiveId) }
            : p
        )
      );
    } catch (error) {
      console.error("Error deleting objective:", error);
    }
  };

  // Key Result CRUD operations
  const handleCreateKeyResult = async () => {
    if (!selectedPeriodId || !keyResultForm.objectiveId) return;

    try {
      const token = await getToken();
      if (!token) return;

      const { objectiveId, id, ...data } = keyResultForm;
      const newKR = await createKeyResult(companyId, selectedPeriodId, objectiveId, data, token);

      setPeriods(
        periods.map((p) => {
          if (p.id !== selectedPeriodId) return p;
          const updatedPeriod = {
            ...p,
            objectives: (p.objectives || []).map((obj) =>
              obj.id === objectiveId
                ? { ...obj, keyResults: [...(obj.keyResults || []), newKR] }
                : obj
            ),
          };
          return recalculatePeriodProgress(updatedPeriod);
        })
      );
      setKeyResultDialogOpen(false);
      setKeyResultForm({
        title: "",
        metricType: "NUMERIC",
        startValue: 0,
        targetValue: 100,
        currentValue: 0,
        inverse: false,
      });
    } catch (error) {
      console.error("Error creating key result:", error);
    }
  };

  const handleUpdateKeyResult = async () => {
    if (!selectedPeriodId || !keyResultForm.objectiveId || !keyResultForm.id) return;

    try {
      const token = await getToken();
      if (!token) return;

      const { objectiveId, id, ...data } = keyResultForm;
      const updated = await updateKeyResult(companyId, selectedPeriodId, objectiveId, id, data, token);

      setPeriods(
        periods.map((p) => {
          if (p.id !== selectedPeriodId) return p;
          const updatedPeriod = {
            ...p,
            objectives: (p.objectives || []).map((obj) =>
              obj.id === objectiveId
                ? {
                    ...obj,
                    keyResults: (obj.keyResults || []).map((kr) => (kr.id === id ? updated : kr)),
                  }
                : obj
            ),
          };
          return recalculatePeriodProgress(updatedPeriod);
        })
      );
      setKeyResultDialogOpen(false);
      setKeyResultForm({
        title: "",
        metricType: "NUMERIC",
        startValue: 0,
        targetValue: 100,
        currentValue: 0,
        inverse: false,
      });
    } catch (error) {
      console.error("Error updating key result:", error);
    }
  };

  const handleDeleteKeyResult = async (objectiveId: string, keyResultId: string) => {
    if (!selectedPeriodId) return;
    if (!confirm("Delete this key result? This cannot be undone.")) return;

    try {
      const token = await getToken();
      if (!token) return;

      await deleteKeyResult(companyId, selectedPeriodId, objectiveId, keyResultId, token);
      setPeriods(
        periods.map((p) => {
          if (p.id !== selectedPeriodId) return p;
          const updatedPeriod = {
            ...p,
            objectives: (p.objectives || []).map((obj) =>
              obj.id === objectiveId
                ? { ...obj, keyResults: (obj.keyResults || []).filter((kr) => kr.id !== keyResultId) }
                : obj
            ),
          };
          return recalculatePeriodProgress(updatedPeriod);
        })
      );
    } catch (error) {
      console.error("Error deleting key result:", error);
    }
  };

  // Inline editing for key results
  const handleInlineEdit = async (
    objectiveId: string,
    keyResultId: string,
    field: "currentValue" | "comment",
    value: string
  ) => {
    if (!selectedPeriodId) return;

    try {
      const token = await getToken();
      if (!token) return;

      const data = field === "currentValue" ? { currentValue: parseFloat(value) || 0 } : { comment: value };
      const updated = await updateKeyResult(companyId, selectedPeriodId, objectiveId, keyResultId, data, token);

      setPeriods(
        periods.map((p) => {
          if (p.id !== selectedPeriodId) return p;
          const updatedPeriod = {
            ...p,
            objectives: (p.objectives || []).map((obj) =>
              obj.id === objectiveId
                ? {
                    ...obj,
                    keyResults: (obj.keyResults || []).map((kr) =>
                      kr.id === keyResultId ? updated : kr
                    ),
                  }
                : obj
            ),
          };
          return recalculatePeriodProgress(updatedPeriod);
        })
      );
      setEditingCell(null);
      setEditValue("");
    } catch (error) {
      console.error("Error updating key result:", error);
    }
  };

  // Toggle objective expansion
  const toggleObjective = (objectiveId: string) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(objectiveId)) {
      newExpanded.delete(objectiveId);
    } else {
      newExpanded.add(objectiveId);
    }
    setExpandedObjectives(newExpanded);
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">You do not have permission to view OKRs.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const daysRemaining = selectedPeriod ? getDaysRemaining(selectedPeriod.endDate) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OKRs</h1>
          <p className="text-muted-foreground">Objectives and Key Results tracking</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setPeriodForm({ name: "", startDate: "", endDate: "" });
              setPeriodDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Period
          </Button>
        )}
      </div>

      {periods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No OKR periods yet.</p>
            {canCreate && (
              <Button
                onClick={() => {
                  setPeriodForm({ name: "", startDate: "", endDate: "" });
                  setPeriodDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Period
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Period Selector */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Select value={selectedPeriodId || ""} onValueChange={setSelectedPeriodId}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((period) => (
                        <SelectItem key={period.id} value={period.id}>
                          <div className="flex items-center gap-2">
                            <span>{period.name}</span>
                            <Badge variant={period.status === "OPEN" ? "default" : "secondary"}>
                              {period.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedPeriod && (
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPeriodForm({
                            id: selectedPeriod.id,
                            name: selectedPeriod.name,
                            startDate: selectedPeriod.startDate.split("T")[0],
                            endDate: selectedPeriod.endDate.split("T")[0],
                          });
                          setPeriodDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canClose && selectedPeriod.status === "OPEN" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClosePeriod(selectedPeriod.id)}
                      >
                        Close Period
                      </Button>
                    )}
                    {canClose && selectedPeriod.status === "CLOSED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReopenPeriod(selectedPeriod.id)}
                      >
                        Reopen Period
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePeriod(selectedPeriod.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            {selectedPeriod && (
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(selectedPeriod.startDate).toLocaleDateString()} -{" "}
                        {new Date(selectedPeriod.endDate).toLocaleDateString()}
                      </span>
                      <span className="ml-4">
                        {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Period ended"}
                      </span>
                    </div>
                    <div className="text-sm font-medium">
                      Overall Score: {Math.round(selectedPeriod.score)}%
                    </div>
                  </div>
                  <Progress value={selectedPeriod.score} />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Objectives Table */}
          {selectedPeriod && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Objectives</CardTitle>
                    <CardDescription>Track progress across all objectives and key results</CardDescription>
                  </div>
                  {canCreate && selectedPeriod.status === "OPEN" && (
                    <Button
                      onClick={() => {
                        setObjectiveForm({ title: "" });
                        setObjectiveDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Objective
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedPeriod.objectives || selectedPeriod.objectives.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No objectives yet. Add one to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-[120px]">Progress</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPeriod.objectives.map((objective) => (
                        <>
                          <TableRow key={objective.id}>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => toggleObjective(objective.id)}
                              >
                                {expandedObjectives.has(objective.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium">{objective.title}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={objective.progress} className="w-20" />
                                <span className="text-sm">{Math.round(objective.progress)}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {canEdit && selectedPeriod.status === "OPEN" && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => {
                                      setObjectiveForm({
                                        id: objective.id,
                                        title: objective.title,
                                      });
                                      setObjectiveDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {canCreate && selectedPeriod.status === "OPEN" && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => {
                                      setKeyResultForm({
                                        objectiveId: objective.id,
                                        title: "",
                                        metricType: "NUMERIC",
                                        startValue: 0,
                                        targetValue: 100,
                                        currentValue: 0,
                                        inverse: false,
                                      });
                                      setKeyResultDialogOpen(true);
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && selectedPeriod.status === "OPEN" && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleDeleteObjective(objective.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedObjectives.has(objective.id) &&
                            objective.keyResults &&
                            objective.keyResults.length > 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="bg-muted/30">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Key Result</TableHead>
                                        <TableHead className="w-[100px]">Start</TableHead>
                                        <TableHead className="w-[100px]">Target</TableHead>
                                        <TableHead className="w-[100px]">Current</TableHead>
                                        <TableHead className="w-[120px]">Progress</TableHead>
                                        <TableHead className="w-[200px]">Comment</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {objective.keyResults.map((kr) => (
                                        <TableRow key={kr.id}>
                                          <TableCell>{kr.title}</TableCell>
                                          <TableCell>{formatMetricValue(kr.startValue, kr.metricType)}</TableCell>
                                          <TableCell>{formatMetricValue(kr.targetValue, kr.metricType)}</TableCell>
                                          <TableCell
                                            className={
                                              canEdit && selectedPeriod.status === "OPEN"
                                                ? "cursor-pointer hover:bg-muted/50"
                                                : ""
                                            }
                                            onClick={() => {
                                              if (canEdit && selectedPeriod.status === "OPEN") {
                                                setEditingCell({ krId: kr.id, field: "currentValue" });
                                                setEditValue(String(kr.currentValue));
                                              }
                                            }}
                                          >
                                            {editingCell?.krId === kr.id &&
                                            editingCell?.field === "currentValue" ? (
                                              kr.metricType === "BOOLEAN" ? (
                                                <Select
                                                  value={editValue === "1" ? "done" : "pending"}
                                                  onValueChange={(value) => {
                                                    const numValue = value === "done" ? "1" : "0";
                                                    handleInlineEdit(
                                                      objective.id,
                                                      kr.id,
                                                      "currentValue",
                                                      numValue
                                                    );
                                                  }}
                                                >
                                                  <SelectTrigger className="w-24" autoFocus>
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="pending">Pending</SelectItem>
                                                    <SelectItem value="done">Done</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              ) : (
                                                <Input
                                                  type="number"
                                                  value={editValue}
                                                  onChange={(e) => setEditValue(e.target.value)}
                                                  onBlur={() =>
                                                    handleInlineEdit(
                                                      objective.id,
                                                      kr.id,
                                                      "currentValue",
                                                      editValue
                                                    )
                                                  }
                                                  onKeyDown={(e) => {
                                                    if (e.key === "Enter")
                                                      handleInlineEdit(
                                                        objective.id,
                                                        kr.id,
                                                        "currentValue",
                                                        editValue
                                                      );
                                                    if (e.key === "Escape") setEditingCell(null);
                                                  }}
                                                  autoFocus
                                                  className="w-24"
                                                />
                                              )
                                            ) : (
                                              formatMetricValue(kr.currentValue, kr.metricType)
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <Progress value={kr.progress} className="w-16" />
                                              <span className="text-sm">{Math.round(kr.progress)}%</span>
                                            </div>
                                          </TableCell>
                                          <TableCell
                                            className={
                                              canEdit && selectedPeriod.status === "OPEN"
                                                ? "cursor-pointer hover:bg-muted/50"
                                                : ""
                                            }
                                            onClick={() => {
                                              if (canEdit && selectedPeriod.status === "OPEN") {
                                                setEditingCell({ krId: kr.id, field: "comment" });
                                                setEditValue(kr.comment || "");
                                              }
                                            }}
                                          >
                                            {editingCell?.krId === kr.id && editingCell?.field === "comment" ? (
                                              <Input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={() =>
                                                  handleInlineEdit(objective.id, kr.id, "comment", editValue)
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter")
                                                    handleInlineEdit(objective.id, kr.id, "comment", editValue);
                                                  if (e.key === "Escape") setEditingCell(null);
                                                }}
                                                autoFocus
                                                className="w-full"
                                              />
                                            ) : (
                                              <span className="text-sm text-muted-foreground">
                                                {kr.comment || "-"}
                                              </span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-1">
                                              {canEdit && selectedPeriod.status === "OPEN" && (
                                                <Button
                                                  variant="ghost"
                                                  size="icon-sm"
                                                  onClick={() => {
                                                    setKeyResultForm({
                                                      id: kr.id,
                                                      objectiveId: objective.id,
                                                      title: kr.title,
                                                      metricType: kr.metricType,
                                                      startValue: kr.startValue,
                                                      targetValue: kr.targetValue,
                                                      currentValue: kr.currentValue,
                                                      inverse: kr.inverse,
                                                      comment: kr.comment || undefined,
                                                    });
                                                    setKeyResultDialogOpen(true);
                                                  }}
                                                >
                                                  <Pencil className="h-4 w-4" />
                                                </Button>
                                              )}
                                              {canDelete && selectedPeriod.status === "OPEN" && (
                                                <Button
                                                  variant="ghost"
                                                  size="icon-sm"
                                                  onClick={() => handleDeleteKeyResult(objective.id, kr.id)}
                                                >
                                                  <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                              )}
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableCell>
                              </TableRow>
                            )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Period Dialog */}
      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{periodForm.id ? "Edit Period" : "Create New Period"}</DialogTitle>
            <DialogDescription>
              Define the time frame for this OKR period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="period-name">Period Name</Label>
              <Input
                id="period-name"
                placeholder="e.g., Q1 2024"
                value={periodForm.name}
                onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="period-start">Start Date</Label>
              <Input
                id="period-start"
                type="date"
                value={periodForm.startDate}
                onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="period-end">End Date</Label>
              <Input
                id="period-end"
                type="date"
                value={periodForm.endDate}
                onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={periodForm.id ? handleUpdatePeriod : handleCreatePeriod}>
              {periodForm.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Objective Dialog */}
      <Dialog open={objectiveDialogOpen} onOpenChange={setObjectiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{objectiveForm.id ? "Edit Objective" : "Create New Objective"}</DialogTitle>
            <DialogDescription>
              Define a high-level goal for this period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="objective-title">Objective Title</Label>
              <Input
                id="objective-title"
                placeholder="e.g., Increase customer satisfaction"
                value={objectiveForm.title}
                onChange={(e) => setObjectiveForm({ ...objectiveForm, title: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjectiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={objectiveForm.id ? handleUpdateObjective : handleCreateObjective}>
              {objectiveForm.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Result Dialog */}
      <Dialog open={keyResultDialogOpen} onOpenChange={setKeyResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{keyResultForm.id ? "Edit Key Result" : "Create New Key Result"}</DialogTitle>
            <DialogDescription>
              Define a measurable result that contributes to the objective.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="kr-title">Key Result Title</Label>
              <Input
                id="kr-title"
                placeholder="e.g., Achieve 90% satisfaction rating"
                value={keyResultForm.title}
                onChange={(e) => setKeyResultForm({ ...keyResultForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="kr-metric-type">Metric Type</Label>
              <Select
                value={keyResultForm.metricType}
                onValueChange={(value: MetricType) => {
                  // Set appropriate defaults when switching to BOOLEAN
                  if (value === "BOOLEAN") {
                    setKeyResultForm({
                      ...keyResultForm,
                      metricType: value,
                      startValue: 0,
                      targetValue: 1,
                      currentValue: (keyResultForm.currentValue ?? 0) >= 1 ? 1 : 0,
                    });
                  } else {
                    setKeyResultForm({ ...keyResultForm, metricType: value });
                  }
                }}
              >
                <SelectTrigger id="kr-metric-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NUMERIC">Numeric</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="CURRENCY">Currency</SelectItem>
                  <SelectItem value="BOOLEAN">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {keyResultForm.metricType === "BOOLEAN" ? (
              <div>
                <Label htmlFor="kr-status">Status</Label>
                <Select
                  value={(keyResultForm.currentValue ?? 0) >= 1 ? "done" : "pending"}
                  onValueChange={(value) =>
                    setKeyResultForm({
                      ...keyResultForm,
                      currentValue: value === "done" ? 1 : 0,
                      startValue: 0,
                      targetValue: 1,
                    })
                  }
                >
                  <SelectTrigger id="kr-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="kr-start">Start Value</Label>
                    <Input
                      id="kr-start"
                      type="number"
                      value={keyResultForm.startValue}
                      onChange={(e) =>
                        setKeyResultForm({ ...keyResultForm, startValue: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="kr-target">Target Value</Label>
                    <Input
                      id="kr-target"
                      type="number"
                      value={keyResultForm.targetValue}
                      onChange={(e) =>
                        setKeyResultForm({ ...keyResultForm, targetValue: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="kr-current">Current Value</Label>
                    <Input
                      id="kr-current"
                      type="number"
                      value={keyResultForm.currentValue}
                      onChange={(e) =>
                        setKeyResultForm({ ...keyResultForm, currentValue: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="kr-inverse"
                    checked={keyResultForm.inverse}
                    onChange={(e) => setKeyResultForm({ ...keyResultForm, inverse: e.target.checked })}
                  />
                  <Label htmlFor="kr-inverse">Inverse (lower is better)</Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKeyResultDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={keyResultForm.id ? handleUpdateKeyResult : handleCreateKeyResult}>
              {keyResultForm.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
