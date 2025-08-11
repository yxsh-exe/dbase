import { useCallback } from 'react';
import { Edge, Node } from '@xyflow/react';
import { TableNodeData } from '../types/schema';

export function useSaveSchema(projectId: string) {
  const saveSchema = useCallback(
    async (nodes: Node<TableNodeData>[], edges: Edge[]) => {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            schema: { nodes, edges },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save schema');
        }

        return await response.json();
      } catch (error) {
        console.error('Error saving schema:', error);
        throw error;
      }
    },
    [projectId],
  );

  return saveSchema;
}
