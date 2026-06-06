import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
  useReactFlow,
} from '@xyflow/react';
import { TableNodeData } from '../nodes/types/Field';

export default function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  source,
  target,
  data
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { getNode } = useReactFlow();
  const sourceNode = getNode(source);
  const targetNode = getNode(target);

  const sourceData = sourceNode?.data as TableNodeData | undefined;
  const targetData = targetNode?.data as TableNodeData | undefined;

  let isDotted = false;

  if (sourceData && targetData && data) {
    const sourceField = sourceData.fields.find(f => f.name === data.sourceField);
    const targetField = targetData.fields.find(f => f.name === data.targetField);

    if (sourceField && targetField) {
       const sourceHasKey = sourceField.primary || sourceField.foreign;
       const targetHasKey = targetField.primary || targetField.foreign;
       if (sourceHasKey || targetHasKey) {
           isDotted = true;
       }
    }
  }

  return (
    <>
      <BaseEdge 
          path={edgePath} 
          markerEnd={markerEnd} 
          style={{
              ...style,
              strokeWidth: 1.5,
              strokeDasharray: isDotted ? '5,5' : 'none',
              stroke: '#94a3b8' // Using a slightly lighter stroke so it's visible, or keep '#3f3f46'
          }} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${sourceX + 15}px,${sourceY}px)`,
            pointerEvents: 'all',
          }}
          className="bg-zinc-800 border border-zinc-600 rounded-full w-[18px] h-[18px] flex items-center justify-center text-[9px] text-zinc-300 font-bold z-20 shadow-sm"
        >
          1
        </div>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${targetX - 15}px,${targetY}px)`,
            pointerEvents: 'all',
          }}
          className="bg-zinc-800 border border-zinc-600 rounded-full w-[18px] h-[18px] flex items-center justify-center text-[9px] text-zinc-300 font-bold z-20 shadow-sm"
        >
          N
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
