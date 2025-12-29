"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Plus, Trash2, ArrowLeft, Pencil,
  Calendar, CheckSquare, FileText, FolderOpen,
  DollarSign, Users, Building2, Target
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface Permission {
  id: string;
  code: string;
  area: string;
  action: string;
  description: string;
}

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
}

interface PermissionsData {
  allPermissions: Permission[];
  systemRoles: Record<string, Record<string, boolean>>;
  customRoles: CustomRole[];
}

const AREA_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  meetings: { label: "Meetings", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
  action_items: { label: "Action Items", icon: CheckSquare, color: "text-green-600", bg: "bg-green-50" },
  resolutions: { label: "Resolutions", icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
  documents: { label: "Documents", icon: FolderOpen, color: "text-amber-600", bg: "bg-amber-50" },
  financials: { label: "Financials", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  okrs: { label: "OKRs", icon: Target, color: "text-orange-600", bg: "bg-orange-50" },
  members: { label: "Members", icon: Users, color: "text-rose-600", bg: "bg-rose-50" },
  company: { label: "Company", icon: Building2, color: "text-slate-600", bg: "bg-slate-50" },
};

const ACTION_LABELS: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  complete: "Mark Complete",
  start_live: "Start Live Session",
  change_status: "Change Status",
  upload: "Upload",
  download: "Download",
  manage_pdfs: "Manage PDFs",
  invite: "Invite Members",
  remove: "Remove Members",
  change_roles: "Change Roles",
  view_settings: "View Settings",
  edit_settings: "Edit Settings",
  close: "Close/Reopen Period",
};

export default function PermissionsPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  const [data, setData] = useState<PermissionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("ADMIN");
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, boolean>>>({});

  // Custom role dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit custom role dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDescription, setEditRoleDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const fetchPermissions = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const permData = await response.json();
        console.log("Permissions data:", permData);
        setData(permData);
      } else if (response.status === 403) {
        alert("Only company owners can manage permissions");
        router.push(`/companies/${companyId}/settings`);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [companyId]);

  const getPermissionValue = (roleKey: string, permCode: string): boolean => {
    // Check pending changes first
    if (pendingChanges[roleKey]?.[permCode] !== undefined) {
      return pendingChanges[roleKey][permCode];
    }

    // Then check actual data
    if (!data) return false;

    if (["ADMIN", "BOARD_MEMBER", "OBSERVER"].includes(roleKey)) {
      return data.systemRoles[roleKey]?.[permCode] ?? false;
    } else {
      const customRole = data.customRoles.find((r) => r.id === roleKey);
      return customRole?.permissions[permCode] ?? false;
    }
  };

  const handlePermissionChange = (roleKey: string, permCode: string, value: boolean) => {
    setPendingChanges((prev) => ({
      ...prev,
      [roleKey]: {
        ...(prev[roleKey] || {}),
        [permCode]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    try {
      setIsSaving(true);
      const token = await getToken();

      for (const [roleKey, permissions] of Object.entries(pendingChanges)) {
        const isSystemRole = ["ADMIN", "BOARD_MEMBER", "OBSERVER"].includes(roleKey);

        await fetch(`${API_URL}/companies/${companyId}/permissions`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: isSystemRole ? roleKey : undefined,
            customRoleId: isSystemRole ? undefined : roleKey,
            permissions,
          }),
        });
      }

      setPendingChanges({});
      await fetchPermissions();
    } catch (error) {
      console.error("Error saving permissions:", error);
      alert("Failed to save permissions. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;

    try {
      setIsCreating(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies/${companyId}/custom-roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDescription.trim() || undefined,
        }),
      });

      if (response.ok) {
        const newRole = await response.json();
        setCreateDialogOpen(false);
        setNewRoleName("");
        setNewRoleDescription("");
        await fetchPermissions();
        setActiveTab(newRole.id);
      } else {
        const error = await response.json();
        alert(error.message || "Failed to create role");
      }
    } catch (error) {
      console.error("Error creating role:", error);
      alert("Failed to create role. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role? This cannot be undone.")) return;

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/custom-roles/${roleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok || response.status === 204) {
        setActiveTab("ADMIN");
        await fetchPermissions();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to delete role");
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      alert("Failed to delete role. Please try again.");
    }
  };

  const openEditDialog = (roleId: string) => {
    const role = data?.customRoles.find((r) => r.id === roleId);
    if (role) {
      setEditingRoleId(roleId);
      setEditRoleName(role.name);
      setEditRoleDescription(role.description || "");
      setEditDialogOpen(true);
    }
  };

  const handleEditRole = async () => {
    if (!editingRoleId || !editRoleName.trim()) return;

    try {
      setIsEditing(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/custom-roles/${editingRoleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editRoleName.trim(),
          description: editRoleDescription.trim() || undefined,
        }),
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setEditingRoleId(null);
        setEditRoleName("");
        setEditRoleDescription("");
        await fetchPermissions();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  // Group permissions by area
  const permissionsByArea = data?.allPermissions.reduce((acc, perm) => {
    if (!acc[perm.area]) acc[perm.area] = [];
    acc[perm.area].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

  // Sort areas in preferred order
  const sortedAreas = Object.keys(AREA_CONFIG).filter(area => permissionsByArea[area]);

  const hasChanges = Object.keys(pendingChanges).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allTabs = [
    { key: "ADMIN", label: "Admin", description: "Full access except role management" },
    { key: "BOARD_MEMBER", label: "Board Member", description: "Can view, create, and edit" },
    { key: "OBSERVER", label: "Observer", description: "View-only access" },
    ...(data?.customRoles.map((r) => ({
      key: r.id,
      label: r.name,
      description: r.description || "Custom role"
    })) || []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/companies/${companyId}/settings`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Role Permissions</h1>
            <p className="text-muted-foreground">
              Configure what each role can do. Owner always has full access.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Custom Role
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          {allTabs.slice(0, 3).map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="px-6">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {allTabs.length > 3 && (
          <TabsList className="mt-2 grid w-full grid-cols-3 lg:ml-2 lg:mt-0 lg:w-auto lg:inline-flex">
            {allTabs.slice(3).map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="px-6">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        {allTabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="mt-6">
            {/* Edit and Delete buttons for custom roles */}
            {!["ADMIN", "BOARD_MEMBER", "OBSERVER"].includes(tab.key) && (
              <div className="mb-4 flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{tab.label}</p>
                  <p className="text-sm text-muted-foreground">{tab.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(tab.key)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRole(tab.key)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            )}

            {/* Permission Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {sortedAreas.map((area) => {
                const config = AREA_CONFIG[area];
                const Icon = config.icon;
                const permissions = permissionsByArea[area];

                return (
                  <Card key={area} className="overflow-hidden">
                    <CardHeader className={`${config.bg} py-3`}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${config.color}`} />
                        <CardTitle className="text-base">{config.label}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {permissions.map((perm) => (
                          <div key={perm.code} className="flex items-center space-x-3">
                            <Checkbox
                              id={`${tab.key}-${perm.code}`}
                              checked={getPermissionValue(tab.key, perm.code)}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(tab.key, perm.code, !!checked)
                              }
                            />
                            <label
                              htmlFor={`${tab.key}-${perm.code}`}
                              className="flex-1 cursor-pointer select-none text-sm"
                            >
                              {ACTION_LABELS[perm.action] || perm.action}
                            </label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Custom Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>
              Create a new role with custom permissions. You can configure permissions after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g., Auditor, Secretary"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-description">Description (optional)</Label>
              <Textarea
                id="role-description"
                placeholder="Brief description of this role..."
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={isCreating || !newRoleName.trim()}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Custom Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Custom Role</DialogTitle>
            <DialogDescription>
              Update the name and description for this role.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-role-name">Role Name</Label>
              <Input
                id="edit-role-name"
                placeholder="e.g., Auditor, Secretary"
                value={editRoleName}
                onChange={(e) => setEditRoleName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role-description">Description (optional)</Label>
              <Textarea
                id="edit-role-description"
                placeholder="Brief description of this role..."
                value={editRoleDescription}
                onChange={(e) => setEditRoleDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRole} disabled={isEditing || !editRoleName.trim()}>
              {isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
