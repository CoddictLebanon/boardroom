"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  ControlButton,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { OrgChartEdge } from "./org-chart-edge";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, GitBranch } from "lucide-react";
import dagre from "dagre";
import { usePermission } from "@/lib/permissions";
import { OrgRole, CreateOrgRoleInput, UpdateOrgRoleInput, EmploymentType } from "@/lib/types";
import {
  getOrgRoles,
  createOrgRole,
  updateOrgRole,
  deleteOrgRole,
  updateOrgRolePositions,
} from "@/lib/api/org-roles";
import { OrgRoleNode } from "./org-role-node";

const nodeTypes: NodeTypes = {
  orgRole: OrgRoleNode,
};

const edgeTypes: EdgeTypes = {
  orgChart: OrgChartEdge,
};

function TeamPageContent() {
  const params = useParams();
  const companyId = params.companyId as string;
  const { getToken } = useAuth();
  const { fitView } = useReactFlow();

  const canView = usePermission("team.view");
  const canCreate = usePermission("team.create");
  const canEdit = usePermission("team.edit");
  const canDelete = usePermission("team.delete");

  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [pendingAutoArrange, setPendingAutoArrange] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<OrgRole | null>(null);
  const [formData, setFormData] = useState<CreateOrgRoleInput>({
    title: "",
    personName: "",
    responsibilities: "",
    department: "",
    employmentType: undefined,
    parentId: undefined,
  });
  const [saving, setSaving] = useState(false);
  const [arranging, setArranging] = useState(false);

  // View dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingRole, setViewingRole] = useState<OrgRole | null>(null);

  // Load roles
  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const data = await getOrgRoles(companyId, token);
      setRoles(data);
    } catch (error) {
      console.error("Failed to load org roles:", error);
    } finally {
      setLoading(false);
    }
  }, [companyId, getToken]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Dialog handlers
  const openCreateDialog = useCallback((parentId?: string) => {
    setEditingRole(null);
    setFormData({
      title: "",
      personName: "",
      responsibilities: "",
      department: "",
      employmentType: undefined,
      parentId,
    });
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((role: OrgRole) => {
    setEditingRole(role);
    setFormData({
      title: role.title,
      personName: role.personName || "",
      responsibilities: role.responsibilities || "",
      department: role.department || "",
      employmentType: role.employmentType || undefined,
      parentId: role.parentId || undefined,
    });
    setDialogOpen(true);
  }, []);

  const openViewDialog = useCallback((role: OrgRole) => {
    setViewingRole(role);
    setViewDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this role? Child roles will be moved to the parent.")) return;

    try {
      const token = await getToken();
      if (!token) return;
      await deleteOrgRole(companyId, id, token);
      // Flag to auto-arrange after roles are loaded
      setPendingAutoArrange(true);
      loadRoles();
    } catch (error) {
      console.error("Failed to delete role:", error);
    }
  }, [companyId, getToken, loadRoles]);

  // Convert roles to React Flow nodes and edges
  useEffect(() => {
    if (roles.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes: Node[] = roles.map((role, index) => ({
      id: role.id,
      type: "orgRole",
      position: {
        x: role.positionX ?? (index % 4) * 280,
        y: role.positionY ?? Math.floor(index / 4) * 180,
      },
      draggable: interactiveMode,
      data: {
        role,
        onView: () => openViewDialog(role),
        onEdit: interactiveMode && canEdit ? () => openEditDialog(role) : undefined,
        onDelete: interactiveMode && canDelete ? () => handleDelete(role.id) : undefined,
        onAddChild: interactiveMode && canCreate ? () => openCreateDialog(role.id) : undefined,
      },
    }));

    // Adjust child positions so siblings are equidistant from parent (equal horizontal lines)
    // Process from top to bottom so parent positions are finalized before processing children
    const nodeWidth = 224;

    // Helper to get all descendants of a node
    const getDescendants = (nodeId: string): string[] => {
      const children = roles.filter(r => r.parentId === nodeId);
      const descendants: string[] = [];
      children.forEach(child => {
        descendants.push(child.id);
        descendants.push(...getDescendants(child.id));
      });
      return descendants;
    };

    // Helper to move a node and all its descendants by deltaX
    const moveSubtree = (nodeId: string, deltaX: number) => {
      const node = newNodes.find(n => n.id === nodeId);
      if (node) {
        node.position.x += deltaX;
      }
      const descendants = getDescendants(nodeId);
      descendants.forEach(descId => {
        const descNode = newNodes.find(n => n.id === descId);
        if (descNode) {
          descNode.position.x += deltaX;
        }
      });
    };

    // Sort roles by depth (top-level first) to process parents before children
    const getDepth = (roleId: string): number => {
      const role = roles.find(r => r.id === roleId);
      if (!role || !role.parentId) return 0;
      return 1 + getDepth(role.parentId);
    };
    const sortedRoles = [...roles].sort((a, b) => getDepth(a.id) - getDepth(b.id));

    sortedRoles.forEach((parent) => {
      const parentNode = newNodes.find(n => n.id === parent.id);
      if (!parentNode) return;

      const children = roles.filter(r => r.parentId === parent.id);
      if (children.length !== 2) return; // Only equalize when exactly 2 children

      const parentCenterX = parentNode.position.x + nodeWidth / 2;

      // Get child positions
      const childNodes = children.map(child => ({
        child,
        node: newNodes.find(n => n.id === child.id)
      })).filter(c => c.node);

      if (childNodes.length !== 2) return;

      const [child1, child2] = childNodes;
      const center1 = child1.node!.position.x + nodeWidth / 2;
      const center2 = child2.node!.position.x + nodeWidth / 2;

      // Only equalize if one is on left and one is on right of parent
      const child1IsLeft = center1 < parentCenterX;
      const child2IsLeft = center2 < parentCenterX;

      if (child1IsLeft === child2IsLeft) return; // Both on same side, don't adjust

      // Find max offset and equalize
      const offset1 = Math.abs(center1 - parentCenterX);
      const offset2 = Math.abs(center2 - parentCenterX);
      const maxOffset = Math.max(offset1, offset2);

      // Move the closer child to match the further one
      childNodes.forEach(({ child, node }) => {
        if (!node) return;
        const centerX = node.position.x + nodeWidth / 2;
        const isLeft = centerX < parentCenterX;
        const currentOffset = Math.abs(centerX - parentCenterX);

        if (currentOffset < maxOffset - 1) {
          const targetCenterX = isLeft ? parentCenterX - maxOffset : parentCenterX + maxOffset;
          const deltaX = targetCenterX - centerX;
          moveSubtree(child.id, deltaX);
        }
      });
    });

    // Recenter the entire tree after all adjustments
    // Find the bounding box and center horizontally
    if (newNodes.length > 0) {
      let minX = Infinity;
      let maxX = -Infinity;
      newNodes.forEach(node => {
        minX = Math.min(minX, node.position.x);
        maxX = Math.max(maxX, node.position.x + nodeWidth);
      });
      const centerX = (minX + maxX) / 2;
      const shiftX = -centerX; // Shift so center is at x=0

      newNodes.forEach(node => {
        node.position.x += shiftX;
      });
    }

    const newEdges: Edge[] = roles
      .filter((role) => role.parentId)
      .map((role) => ({
        id: `${role.parentId}-${role.id}`,
        source: role.parentId!,
        target: role.id,
        type: "orgChart",
        animated: false,
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      }));

    setNodes(newNodes);
    setEdges(newEdges);

    // Fit view after initial load
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [roles, canEdit, canDelete, canCreate, interactiveMode, setNodes, setEdges, fitView, openViewDialog, openEditDialog, handleDelete, openCreateDialog]);

  // Handle node drag end - save positions
  const onNodeDragStop = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      try {
        const token = await getToken();
        if (!token) return;
        await updateOrgRole(companyId, node.id, {
          positionX: node.position.x,
          positionY: node.position.y,
        }, token);
      } catch (error) {
        console.error("Failed to save position:", error);
      }
    },
    [companyId, getToken]
  );

  const handleSave = async () => {
    if (!formData.title.trim()) return;

    try {
      setSaving(true);
      const token = await getToken();
      if (!token) return;

      // Clean data - remove empty strings, convert to undefined
      const cleanData = {
        title: formData.title.trim(),
        personName: formData.personName?.trim() || undefined,
        responsibilities: formData.responsibilities?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        employmentType: formData.employmentType || undefined,
        parentId: formData.parentId || undefined,
      };

      if (editingRole) {
        await updateOrgRole(companyId, editingRole.id, cleanData as UpdateOrgRoleInput, token);
      } else {
        await createOrgRole(companyId, cleanData as CreateOrgRoleInput, token);
      }

      setDialogOpen(false);
      // Flag to auto-arrange after roles are loaded
      setPendingAutoArrange(true);
      loadRoles();
    } catch (error) {
      console.error("Failed to save role:", error);
      alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Auto-arrange nodes in a tree layout using dagre
  const handleAutoArrange = useCallback(async () => {
    if (roles.length === 0) return;

    try {
      setArranging(true);

      // Create a new dagre graph
      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 200 });
      g.setDefaultEdgeLabel(() => ({}));

      // Node dimensions
      const nodeWidth = 224; // w-56 = 14rem = 224px
      const nodeHeight = 180; // Fixed height for consistent sizing

      // Add nodes to the graph
      roles.forEach((role) => {
        g.setNode(role.id, { width: nodeWidth, height: nodeHeight });
      });

      // Add edges to the graph (parent -> child)
      roles.forEach((role) => {
        if (role.parentId) {
          g.setEdge(role.parentId, role.id);
        }
      });

      // Run the layout algorithm
      dagre.layout(g);

      // Get positions from dagre
      const positionMap = new Map<string, { x: number; y: number }>();
      roles.forEach((role) => {
        const node = g.node(role.id);
        if (node) {
          positionMap.set(role.id, { x: node.x, y: node.y });
        }
      });

      // Helper to check if a role has descendants
      const hasDescendants = (roleId: string): boolean => {
        return roles.some(r => r.parentId === roleId);
      };

      // Helper to get all descendants of a role
      const getAllDescendants = (roleId: string): string[] => {
        const children = roles.filter(r => r.parentId === roleId);
        const descendants: string[] = [];
        children.forEach(child => {
          descendants.push(child.id);
          descendants.push(...getAllDescendants(child.id));
        });
        return descendants;
      };

      // Helper to move a subtree by deltaX
      const moveSubtreeX = (roleId: string, deltaX: number) => {
        const pos = positionMap.get(roleId);
        if (pos) pos.x += deltaX;
        getAllDescendants(roleId).forEach(descId => {
          const descPos = positionMap.get(descId);
          if (descPos) descPos.x += deltaX;
        });
      };

      // Reorder siblings: nodes with children in middle, leafs on sides
      // Process top-down so parent reordering happens before children
      const getDepth = (roleId: string): number => {
        const role = roles.find(r => r.id === roleId);
        if (!role || !role.parentId) return 0;
        return 1 + getDepth(role.parentId);
      };
      const sortedByDepth = [...roles].sort((a, b) => getDepth(a.id) - getDepth(b.id));

      sortedByDepth.forEach((parent) => {
        const children = roles.filter(r => r.parentId === parent.id);
        if (children.length < 2) return;

        // Get current X positions of children
        const childData = children.map(c => ({
          role: c,
          x: positionMap.get(c.id)?.x || 0,
          hasChildren: hasDescendants(c.id)
        })).sort((a, b) => a.x - b.x);

        // Get the X slots (current positions sorted)
        const xSlots = childData.map(c => c.x);

        // Separate into branching and leaf nodes (preserve their relative order)
        const branchingNodes = childData.filter(c => c.hasChildren);
        const leafNodes = childData.filter(c => !c.hasChildren);

        // Desired order: left leafs, middle branching, right leafs
        const leftLeafCount = Math.floor(leafNodes.length / 2);
        const leftLeafs = leafNodes.slice(0, leftLeafCount);
        const rightLeafs = leafNodes.slice(leftLeafCount);
        const desiredOrder = [...leftLeafs, ...branchingNodes, ...rightLeafs];

        // Move each subtree to its new slot
        desiredOrder.forEach((item, index) => {
          const currentX = positionMap.get(item.role.id)?.x || 0;
          const targetX = xSlots[index];
          const deltaX = targetX - currentX;
          if (Math.abs(deltaX) > 1) {
            moveSubtreeX(item.role.id, deltaX);
          }
        });
      });

      // Convert to final positions (top-left corner)
      const newPositions: { id: string; x: number; y: number }[] = [];
      positionMap.forEach((pos, id) => {
        newPositions.push({
          id,
          x: pos.x - nodeWidth / 2,
          y: pos.y - nodeHeight / 2,
        });
      });

      // Update local nodes immediately for visual feedback
      setNodes((nds) =>
        nds.map((node) => {
          const newPos = newPositions.find((p) => p.id === node.id);
          if (newPos) {
            return { ...node, position: { x: newPos.x, y: newPos.y } };
          }
          return node;
        })
      );

      // Fit view to show all nodes
      setTimeout(() => fitView({ padding: 0.2 }), 50);

      // Save positions to database
      const token = await getToken();
      if (token) {
        await updateOrgRolePositions(companyId, newPositions, token);
        // Reload roles to sync state with database
        await loadRoles();
      }
    } catch (error) {
      console.error("Failed to auto-arrange:", error);
      alert(`Failed to arrange: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setArranging(false);
    }
  }, [roles, companyId, getToken, setNodes, fitView, loadRoles]);

  // Auto-arrange after creating a new role
  useEffect(() => {
    if (pendingAutoArrange && !loading && roles.length > 0) {
      setPendingAutoArrange(false);
      // Small delay to ensure nodes are rendered
      setTimeout(() => {
        handleAutoArrange();
      }, 200);
    }
  }, [pendingAutoArrange, loading, roles.length, handleAutoArrange]);

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">You don&apos;t have permission to view the org chart.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">Organization structure</p>
        </div>
        {canCreate && (
          <Button onClick={() => openCreateDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        )}
      </div>

      {/* Canvas */}
      <Card className="h-full">
        <CardContent className="p-0 h-full">
          {roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-muted-foreground mb-4">No roles yet. Create your first role to start building your org chart.</p>
              {canCreate && (
                <Button onClick={() => openCreateDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Role
                </Button>
              )}
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={onNodeDragStop}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodesDraggable={interactiveMode}
              nodesConnectable={interactiveMode}
              elementsSelectable={interactiveMode}
              fitView
              minZoom={0.1}
              maxZoom={2}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            >
              <Controls showInteractive={canEdit} onInteractiveChange={(interactive) => setInteractiveMode(interactive)}>
                {canEdit && (
                  <ControlButton onClick={handleAutoArrange} disabled={arranging} title="Auto Arrange">
                    {arranging ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GitBranch className="h-4 w-4" />
                    )}
                  </ControlButton>
                )}
              </Controls>
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            </ReactFlow>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Role Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Engineering Lead"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="personName">Person Name</Label>
              <Input
                id="personName"
                value={formData.personName}
                onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                placeholder="Leave empty for vacant role"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Engineering"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employmentType">Employment Type</Label>
              <Select
                value={formData.employmentType || ""}
                onValueChange={(v) => setFormData({ ...formData, employmentType: v as EmploymentType || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full-time</SelectItem>
                  <SelectItem value="PART_TIME">Part-time</SelectItem>
                  <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parentId">Reports To</Label>
              <Select
                value={formData.parentId || "none"}
                onValueChange={(v) => setFormData({ ...formData, parentId: v === "none" ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root)</SelectItem>
                  {roles
                    .filter((r) => r.id !== editingRole?.id)
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="responsibilities">Responsibilities</Label>
              <Textarea
                id="responsibilities"
                value={formData.responsibilities}
                onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                placeholder="Key responsibilities..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.title.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRole ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Role Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewingRole?.title}</DialogTitle>
          </DialogHeader>
          {viewingRole && (
            <div className="space-y-4">
              {viewingRole.department && (
                <div>
                  <Label className="text-muted-foreground text-xs">Department</Label>
                  <p className="font-medium">{viewingRole.department}</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground text-xs">Person</Label>
                <p className="font-medium">{viewingRole.personName || <span className="text-muted-foreground italic">Vacant</span>}</p>
              </div>

              {viewingRole.employmentType && (
                <div>
                  <Label className="text-muted-foreground text-xs">Employment Type</Label>
                  <p className="font-medium">
                    {viewingRole.employmentType === "FULL_TIME" && "Full-time"}
                    {viewingRole.employmentType === "PART_TIME" && "Part-time"}
                    {viewingRole.employmentType === "CONTRACTOR" && "Contractor"}
                  </p>
                </div>
              )}

              {viewingRole.parentId && (
                <div>
                  <Label className="text-muted-foreground text-xs">Reports To</Label>
                  <p className="font-medium">
                    {roles.find((r) => r.id === viewingRole.parentId)?.title || "Unknown"}
                  </p>
                </div>
              )}

              {viewingRole.responsibilities && (
                <div>
                  <Label className="text-muted-foreground text-xs">Responsibilities</Label>
                  <p className="whitespace-pre-wrap text-sm mt-1">{viewingRole.responsibilities}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {canEdit && (
              <Button onClick={() => {
                setViewDialogOpen(false);
                if (viewingRole) openEditDialog(viewingRole);
              }}>
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TeamPage() {
  return (
    <ReactFlowProvider>
      <TeamPageContent />
    </ReactFlowProvider>
  );
}
