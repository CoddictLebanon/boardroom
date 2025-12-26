import { BaseEdge, EdgeProps } from "reactflow";

export function OrgChartEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
}: EdgeProps) {
  // Calculate the midpoint Y for the horizontal line
  const midY = sourceY + (targetY - sourceY) / 2;

  // Simple clean path: vertical down, horizontal across, vertical down
  const path = `
    M ${sourceX} ${sourceY}
    L ${sourceX} ${midY}
    L ${targetX} ${midY}
    L ${targetX} ${targetY}
  `;

  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerEnd={markerEnd}
    />
  );
}
