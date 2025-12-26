import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, User } from "lucide-react";
import { OrgRole } from "@/lib/types";

interface OrgRoleNodeData {
  role: OrgRole;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddChild?: () => void;
}

export const OrgRoleNode = memo(({ data }: NodeProps<OrgRoleNodeData>) => {
  const { role, onView, onEdit, onDelete, onAddChild } = data;
  const isInteractive = onEdit || onDelete || onAddChild;

  const employmentLabel = {
    FULL_TIME: "Full-time",
    PART_TIME: "Part-time",
    CONTRACTOR: "Contractor",
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />

      <Card
        className="w-56 shadow-md hover:shadow-lg transition-shadow border-2 border-slate-200 bg-slate-50 cursor-pointer"
        onClick={onView}
      >
        <CardContent className={`p-3 text-center flex flex-col ${isInteractive ? "min-h-[180px]" : "min-h-[140px]"}`}>
          {/* Action buttons - only show when interactive */}
          {isInteractive && (
            <div className="flex justify-center gap-1 mb-1">
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          {/* Role title */}
          <h3 className="font-bold text-base text-slate-800 truncate">{role.title}</h3>

          {/* Department - always show */}
          <p className="text-xs text-muted-foreground truncate mb-2">
            {role.department || "No department"}
          </p>

          {/* Person */}
          <div className="flex flex-col items-center gap-1 flex-1 justify-center">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="h-5 w-5 text-slate-500" />
            </div>
            {role.personName ? (
              <p className="text-sm font-medium truncate max-w-full">{role.personName}</p>
            ) : (
              <Badge variant="outline" className="text-xs">Vacant</Badge>
            )}
          </div>

          {/* Employment type - always show */}
          <div className="flex justify-center mt-2">
            <Badge variant="secondary" className="text-xs">
              {role.employmentType ? employmentLabel[role.employmentType] : "Unspecified"}
            </Badge>
          </div>

          {/* Add child button - only show when interactive */}
          {onAddChild && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs mt-2"
              onClick={(e) => { e.stopPropagation(); onAddChild(); }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Report
            </Button>
          )}
        </CardContent>
      </Card>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </>
  );
});

OrgRoleNode.displayName = "OrgRoleNode";
