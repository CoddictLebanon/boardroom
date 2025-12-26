# Team / Org Chart Module

## Overview

The Team module provides an interactive organizational chart canvas for visualizing company structure. Users can create roles, define reporting relationships, and arrange them in a hierarchical tree layout.

## Database Schema

```prisma
model OrgRole {
  id              String          @id @default(cuid())
  companyId       String
  parentId        String?

  title           String          // Role title (required)
  personName      String?         // Person name (optional - vacant if null)
  responsibilities String?        // Markdown text
  department      String?
  employmentType  EmploymentType?

  positionX       Float           @default(0)  // Canvas X position
  positionY       Float           @default(0)  // Canvas Y position

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  company         Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  parent          OrgRole?        @relation("OrgHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children        OrgRole[]       @relation("OrgHierarchy")

  @@index([companyId])
  @@index([parentId])
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACTOR
}
```

## API Endpoints

```
GET    /api/v1/companies/:companyId/org-roles
POST   /api/v1/companies/:companyId/org-roles
GET    /api/v1/companies/:companyId/org-roles/:id
PUT    /api/v1/companies/:companyId/org-roles/:id
DELETE /api/v1/companies/:companyId/org-roles/:id
PUT    /api/v1/companies/:companyId/org-roles/positions  (batch update positions)
```

**Create/Update Role:**
```json
{
  "title": "Chief Product Officer",
  "personName": "John Doe",
  "department": "Product",
  "employmentType": "FULL_TIME",
  "responsibilities": "Lead product strategy...",
  "parentId": "cmj..."
}
```

**Batch Update Positions:**
```json
{
  "positions": [
    { "id": "cmj...", "x": 100, "y": 200 },
    { "id": "cmj...", "x": 400, "y": 200 }
  ]
}
```

## Permissions

| Action | Required Permission |
|--------|-------------------|
| View org chart | `team.view` |
| Create role | `team.create` |
| Edit role | `team.edit` |
| Delete role | `team.delete` |

## Frontend Implementation

### Technology Stack

- **React Flow** - Canvas rendering, pan/zoom, node management
- **Dagre** - Automatic tree layout algorithm
- **Custom Edge Component** - Org chart style connections

### Key Files

- `apps/web/app/companies/[companyId]/team/page.tsx` - Main page
- `apps/web/app/companies/[companyId]/team/org-role-node.tsx` - Node component
- `apps/web/app/companies/[companyId]/team/org-chart-edge.tsx` - Edge component
- `apps/web/lib/api/org-roles.ts` - API client functions

### Interactive Mode

The canvas has two modes controlled by a lock/unlock toggle in the bottom-left controls:

**View Mode (Default - Locked):**
- Pan and zoom only
- Click nodes to view details
- No edit/delete buttons visible
- Nodes cannot be dragged

**Edit Mode (Unlocked):**
- All view mode features
- Edit/delete buttons appear on nodes
- "Add Report" button on each node
- Nodes can be dragged to reposition
- Auto-arrange button available

### Node Component (`OrgRoleNode`)

**Fixed-size boxes** ensure consistent appearance:
- Width: 224px (`w-56`)
- Min-height: 140px (view mode) / 180px (edit mode)

**Always displayed fields with placeholders:**
- Title (required, no placeholder needed)
- Department → "No department" if empty
- Person name → "Vacant" badge if empty
- Employment type → "Unspecified" if empty

**Conditional elements:**
- Edit/delete buttons: Only in edit mode
- "Add Report" button: Only in edit mode

### Edge Component (`OrgChartEdge`)

Custom edge drawing for clean org chart lines:

```
Parent
   |
   |  (vertical down)
   |
   +---- (horizontal) ----+
                          |
                          |  (vertical down)
                          |
                        Child
```

Path formula:
```typescript
const midY = sourceY + (targetY - sourceY) / 2;
const path = `
  M ${sourceX} ${sourceY}
  L ${sourceX} ${midY}
  L ${targetX} ${midY}
  L ${targetX} ${targetY}
`;
```

### Auto-Arrange Algorithm

Uses **dagre** library for tree layout, then post-processes for visual balance.

**Dagre Configuration:**
```typescript
g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 200 });
```
- `rankdir: "TB"` - Top to bottom layout
- `nodesep: 80` - Horizontal spacing between siblings
- `ranksep: 200` - Vertical spacing between levels

**Post-Processing - Equal Horizontal Lines:**

For parents with exactly 2 children (one left, one right of parent):
1. Find the child that's further from parent
2. Move the closer child (and its entire subtree) to match that distance
3. Process top-to-bottom so parent positions are finalized first

```typescript
// Only equalize when:
// - Exactly 2 children
// - One on left, one on right of parent
if (children.length !== 2) return;
if (child1IsLeft === child2IsLeft) return; // Both same side

// Move closer child's subtree to match further child's offset
const maxOffset = Math.max(offset1, offset2);
moveSubtree(closerChild.id, deltaX);
```

**Why subtree movement matters:**
When moving a child node, ALL its descendants must move by the same amount. Otherwise, edges from that child to its own children will be misaligned.

### Auto-Arrange Triggers

Auto-arrange runs automatically after:
1. Creating a new role
2. Editing an existing role
3. Deleting a role

Implementation uses `pendingAutoArrange` state flag:
```typescript
setPendingAutoArrange(true);
loadRoles();

// Effect triggers auto-arrange when roles finish loading
useEffect(() => {
  if (pendingAutoArrange && !loading && roles.length > 0) {
    setPendingAutoArrange(false);
    setTimeout(() => handleAutoArrange(), 200);
  }
}, [pendingAutoArrange, loading, roles.length]);
```

### Position Persistence

Positions are saved to database in two scenarios:

1. **Manual drag** - `onNodeDragStop` saves individual node position
2. **Auto-arrange** - `updateOrgRolePositions` batch saves all positions

After auto-arrange, `loadRoles()` is called to sync frontend state with database.

## Technical Notes

### ID Format
- All IDs are **CUIDs** (e.g., `cmjiveiwo001g2vlnnttmwtd7`)
- NOT UUIDs - do not use UUID validators

### Node Dimensions
Keep these constants in sync across files:
- Node width: 224px
- Node height: 180px (used in dagre layout)

### Delete Behavior
When a role is deleted, its children are **moved to the deleted role's parent** (not deleted). This preserves the org structure.

## Common Issues & Solutions

### Issue: Nodes overlap after auto-arrange
**Cause:** Node dimensions in dagre config don't match actual rendered size
**Solution:** Ensure `nodeWidth` and `nodeHeight` in `handleAutoArrange` match the CSS

### Issue: Horizontal lines unequal length
**Cause:** The equalization only works for parents with exactly 2 children, one on each side
**Solution:** This is intentional - for 3+ children, dagre's natural spacing is used

### Issue: Positions not persisting after refresh
**Cause:** `updateOrgRolePositions` API call may have failed silently
**Solution:** Check browser console for errors, verify API endpoint is working

### Issue: Interactive toggle shows wrong state
**Cause:** React Flow's internal state not synced with component state
**Solution:** Ensure `nodesDraggable`, `nodesConnectable`, and `elementsSelectable` all use `interactiveMode`

## Related Documentation

- React Flow: https://reactflow.dev/docs
- Dagre: https://github.com/dagrejs/dagre
