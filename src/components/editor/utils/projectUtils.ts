import { Edge, Node } from '@xyflow/react';
import type { TableNodeData } from '../nodes/types/Field';

export interface SavedProjectData {
  nodes: Node<TableNodeData>[];
  edges: Edge[];
  metadata: { created: string };
}

export function saveProject(nodes: Node<TableNodeData>[], edges: Edge[]): SavedProjectData {
  const projectData: SavedProjectData = {
    nodes,
    edges,
    metadata: {
      created: new Date().toISOString(),
    },
  };
  localStorage.setItem('db-schema', JSON.stringify(projectData));
  return projectData;
}

export function loadProject(): SavedProjectData | null {
  const savedData = localStorage.getItem('db-schema');
  if (!savedData) return null;
  return JSON.parse(savedData) as SavedProjectData;
}
