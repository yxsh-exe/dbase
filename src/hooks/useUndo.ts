import { useCallback, useRef, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { TableNodeData, Field, TableReference } from '@/components/editor/nodes/types/Field';

// Define the state interface for the editor
export interface EditorState {
  nodes: Node<TableNodeData>[];
  edges: Edge[];
  nextTableId: number;
}

// Command interface
export interface Command {
  name: string;
  execute(currentState: EditorState): EditorState;
  undo(currentState: EditorState): EditorState;
}

// History state
interface HistoryState {
  past: EditorState[];
  present: EditorState;
  future: EditorState[];
}

// Undo hook
export function useUndo(initialState: EditorState) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialState,
    future: [],
  });

  // Reference to prevent infinite loops
  const isExecutingRef = useRef(false);

  const executeCommand = useCallback((command: Command) => {
    if (isExecutingRef.current) return;

    isExecutingRef.current = true;

    setHistory((prevHistory) => {
      const newState = command.execute(prevHistory.present);

      return {
        past: [...prevHistory.past, prevHistory.present],
        present: newState,
        future: [], // Clear future when executing new command
      };
    });

    isExecutingRef.current = false;
  }, []);

  const undo = useCallback(() => {
    if (isExecutingRef.current) return;

    isExecutingRef.current = true;

    setHistory((prevHistory) => {
      if (prevHistory.past.length === 0) {
        isExecutingRef.current = false;
        return prevHistory;
      }

      const previous = prevHistory.past[prevHistory.past.length - 1];
      const newPast = prevHistory.past.slice(0, prevHistory.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [prevHistory.present, ...prevHistory.future],
      };
    });

    isExecutingRef.current = false;
  }, []);

  const redo = useCallback(() => {
    if (isExecutingRef.current) return;

    isExecutingRef.current = true;

    setHistory((prevHistory) => {
      if (prevHistory.future.length === 0) {
        isExecutingRef.current = false;
        return prevHistory;
      }

      const next = prevHistory.future[0];
      const newFuture = prevHistory.future.slice(1);

      return {
        past: [...prevHistory.past, prevHistory.present],
        present: next,
        future: newFuture,
      };
    });

    isExecutingRef.current = false;
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Force state update (for when external state changes)
  const updateState = useCallback((newState: EditorState) => {
    if (isExecutingRef.current) return;

    setHistory((prevHistory) => ({
      ...prevHistory,
      present: newState,
    }));
  }, []);

  return {
    state: history.present,
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    updateState,
  };
}

// Command implementations
export class CreateTableCommand implements Command {
  name = 'Create Table';

  constructor(
    private tableData: {
      id: string;
      name: string;
      fields: Field[];
      position: { x: number; y: number };
      references?: TableReference[];
      color?: string; // Add color property
    },
    private edges: Edge[] = [],
  ) {}

  execute(currentState: EditorState): EditorState {
    const newNode: Node<TableNodeData> = {
      id: this.tableData.id,
      type: 'table',
      position: this.tableData.position,
      data: {
        name: this.tableData.name,
        fields: this.tableData.fields,
        references: this.tableData.references || [],
        color: this.tableData.color, // Include color if provided
      },
    };

    return {
      ...currentState,
      nodes: [...currentState.nodes, newNode],
      edges: [...currentState.edges, ...this.edges],
      nextTableId: currentState.nextTableId + 1,
    };
  }

  undo(currentState: EditorState): EditorState {
    return {
      ...currentState,
      nodes: currentState.nodes.filter((node) => node.id !== this.tableData.id),
      edges: currentState.edges.filter(
        (edge) =>
          !this.edges.some((e) => e.id === edge.id) &&
          edge.source !== this.tableData.id &&
          edge.target !== this.tableData.id,
      ),
      nextTableId: currentState.nextTableId - 1,
    };
  }
}

export class DeleteTableCommand implements Command {
  name = 'Delete Table';

  constructor(
    private tableId: string,
    private tableData?: Node<TableNodeData>,
    private relatedEdges: Edge[] = [],
  ) {}

  execute(currentState: EditorState): EditorState {
    // Store the table data and related edges for undo
    if (!this.tableData) {
      this.tableData = currentState.nodes.find((n) => n.id === this.tableId);
      this.relatedEdges = currentState.edges.filter(
        (e) => e.source === this.tableId || e.target === this.tableId,
      );
    }

    // Remove foreign key fields from other tables
    const updatedNodes = currentState.nodes
      .filter((n) => n.id !== this.tableId)
      .map((node) => {
        const updatedFields = node.data.fields.filter(
          (field) => !(field.foreign && field.referencedTable === this.tableData?.data.name),
        );
        const updatedReferences = (node.data.references || []).filter(
          (ref) => ref.sourceTableId !== this.tableId,
        );

        if (
          updatedFields.length !== node.data.fields.length ||
          updatedReferences.length !== (node.data.references || []).length
        ) {
          return {
            ...node,
            data: {
              ...node.data,
              fields: updatedFields,
              references: updatedReferences,
            },
          };
        }
        return node;
      });

    return {
      ...currentState,
      nodes: updatedNodes,
      edges: currentState.edges.filter(
        (e) => e.source !== this.tableId && e.target !== this.tableId,
      ),
    };
  }

  undo(currentState: EditorState): EditorState {
    if (!this.tableData) return currentState;

    return {
      ...currentState,
      nodes: [...currentState.nodes, this.tableData],
      edges: [...currentState.edges, ...this.relatedEdges],
    };
  }
}

export class UpdateTableCommand implements Command {
  name = 'Update Table';
  private oldNodesState?: Record<string, Node<TableNodeData>>;
  private oldEdgesState?: Record<string, Edge>;

  constructor(
    private tableId: string,
    private newData: Partial<TableNodeData>,
  ) {}

  execute(currentState: EditorState): EditorState {
    const targetNode = currentState.nodes.find(n => n.id === this.tableId);
    if (!targetNode) return currentState;

    if (!this.oldNodesState) {
      this.oldNodesState = {};
      this.oldEdgesState = {};
    }

    if (!this.oldNodesState[this.tableId]) {
      this.oldNodesState[this.tableId] = { ...targetNode };
    }

    let updatedNodes = [...currentState.nodes];
    let updatedEdges = [...currentState.edges];

    const oldTableName = targetNode.data.name;
    const newTableName = this.newData.name;
    const isTableNameChanged = newTableName && newTableName !== oldTableName;

    // 1. Update the target node itself
    updatedNodes = updatedNodes.map((node) => {
      if (node.id === this.tableId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...this.newData,
          },
        };
      }
      return node;
    });

    // 2. Cascade table name changes
    if (isTableNameChanged) {
      // Update edges
      updatedEdges = updatedEdges.map(edge => {
        let changed = false;
        let newEdgeData = { ...(edge.data as any) };
        if (edge.source === this.tableId) {
          newEdgeData.sourceTable = newTableName;
          changed = true;
        }
        if (edge.target === this.tableId) {
          newEdgeData.targetTable = newTableName;
          changed = true;
        }
        if (changed) {
          if (!this.oldEdgesState![edge.id]) this.oldEdgesState![edge.id] = { ...edge };
          return { ...edge, data: newEdgeData };
        }
        return edge;
      });

      // Update referencedTable in other nodes' fields
      updatedNodes = updatedNodes.map(node => {
        if (node.id === this.tableId) return node; // already updated

        let nodeChanged = false;
        const newFields = node.data.fields.map(field => {
          if (field.foreign && field.referencedTable === oldTableName) {
            nodeChanged = true;
            
            let newFieldName = field.name;
            const oldDefaultFkName = `${oldTableName.toLowerCase()}_id`;
            const newDefaultFkName = `${newTableName!.toLowerCase()}_id`;
            
            if (field.name.toLowerCase() === oldDefaultFkName) {
                newFieldName = newDefaultFkName;
            } else if (field.name.includes(oldTableName)) {
                newFieldName = field.name.replace(oldTableName, newTableName!);
            } else if (field.name.includes(oldTableName.toLowerCase())) {
                newFieldName = field.name.replace(oldTableName.toLowerCase(), newTableName!.toLowerCase());
            } else {
                newFieldName = newDefaultFkName;
            }

            if (newFieldName !== field.name) {
               updatedEdges = updatedEdges.map(edge => {
                  if (edge.target === node.id && (edge.data as any)?.targetField === field.name) {
                     if (!this.oldEdgesState![edge.id]) this.oldEdgesState![edge.id] = { ...edge };
                     return { ...edge, data: { ...(edge.data as any), targetField: newFieldName } };
                  }
                  return edge;
               });
            }

            return { ...field, referencedTable: newTableName, name: newFieldName };
          }
          return field;
        });

        if (nodeChanged) {
          if (!this.oldNodesState![node.id]) this.oldNodesState![node.id] = { ...node };
          return {
            ...node,
            data: { ...node.data, fields: newFields }
          };
        }
        return node;
      });
    }

    return {
      ...currentState,
      nodes: updatedNodes,
      edges: updatedEdges,
    };
  }

  undo(currentState: EditorState): EditorState {
    if (!this.oldNodesState || !this.oldEdgesState) return currentState;

    const oldNodesState = this.oldNodesState;
    const oldEdgesState = this.oldEdgesState;

    const updatedNodes = currentState.nodes.map(node => {
      if (oldNodesState[node.id]) {
        return oldNodesState[node.id];
      }
      return node;
    });

    const updatedEdges = currentState.edges.map(edge => {
      if (oldEdgesState[edge.id]) {
        return oldEdgesState[edge.id];
      }
      return edge;
    });

    return {
      ...currentState,
      nodes: updatedNodes,
      edges: updatedEdges,
    };
  }
}

export class UpdateFieldCommand implements Command {
  name = 'Update Field';
  private oldNodesState?: Record<string, Node<TableNodeData>>;
  private oldEdgesState?: Record<string, Edge>;

  constructor(
    private tableId: string,
    private fieldIndex: number,
    private updatedField: Field,
  ) {}

  execute(currentState: EditorState): EditorState {
    const targetNode = currentState.nodes.find(n => n.id === this.tableId);
    if (!targetNode) return currentState;

    if (!this.oldNodesState) {
      this.oldNodesState = {};
      this.oldEdgesState = {};
    }

    if (!this.oldNodesState[this.tableId]) {
      this.oldNodesState[this.tableId] = { ...targetNode };
    }

    let updatedNodes = [...currentState.nodes];
    let updatedEdges = [...currentState.edges];

    const oldField = targetNode.data.fields[this.fieldIndex];
    if (!oldField) return currentState; // Should not happen

    const newField = this.updatedField;
    const nameChanged = oldField.name !== newField.name;
    const typeChanged = oldField.type !== newField.type || oldField.length !== newField.length || oldField.precision !== newField.precision || oldField.scale !== newField.scale;

    // 1. Update the target node itself
    updatedNodes = updatedNodes.map((node) => {
      if (node.id === this.tableId) {
        const newFields = [...node.data.fields];
        newFields[this.fieldIndex] = newField;
        return {
          ...node,
          data: {
            ...node.data,
            fields: newFields,
          },
        };
      }
      return node;
    });

    // 2. Cascade field changes
    if (nameChanged || typeChanged) {
      const outgoingEdges = currentState.edges.filter(e => e.source === this.tableId);
      const relatedEdges = outgoingEdges.filter(e => (e.data as any)?.sourceField === oldField.name);

      if (relatedEdges.length > 0) {
        relatedEdges.forEach(edge => {
          // Update the edge data if name changed
          if (nameChanged) {
            updatedEdges = updatedEdges.map(e => {
              if (e.id === edge.id) {
                if (!this.oldEdgesState![e.id]) this.oldEdgesState![e.id] = { ...e };
                return { ...e, data: { ...(e.data as any), sourceField: newField.name } };
              }
              return e;
            });
          }

          // Update the referencing field in the target node
          updatedNodes = updatedNodes.map(node => {
            if (node.id === edge.target) {
              const targetFieldName = (edge.data as any)?.targetField;
              let nodeChanged = false;
              const updatedTargetFields = node.data.fields.map(tf => {
                if (tf.name === targetFieldName) {
                  nodeChanged = true;
                  let changedTF = { ...tf };
                  if (nameChanged) changedTF.referencedField = newField.name;
                  if (typeChanged) {
                    changedTF.type = newField.type;
                    changedTF.length = newField.length;
                    changedTF.precision = newField.precision;
                    changedTF.scale = newField.scale;
                  }
                  return changedTF;
                }
                return tf;
              });

              if (nodeChanged) {
                if (!this.oldNodesState![node.id]) this.oldNodesState![node.id] = { ...node };
                return {
                  ...node,
                  data: { ...node.data, fields: updatedTargetFields }
                };
              }
            }
            return node;
          });
        });
      }
    }

    return {
      ...currentState,
      nodes: updatedNodes,
      edges: updatedEdges,
    };
  }

  undo(currentState: EditorState): EditorState {
    if (!this.oldNodesState || !this.oldEdgesState) return currentState;

    const oldNodesState = this.oldNodesState;
    const oldEdgesState = this.oldEdgesState;

    const updatedNodes = currentState.nodes.map(node => {
      if (oldNodesState[node.id]) {
        return oldNodesState[node.id];
      }
      return node;
    });

    const updatedEdges = currentState.edges.map(edge => {
      if (oldEdgesState[edge.id]) {
        return oldEdgesState[edge.id];
      }
      return edge;
    });

    return {
      ...currentState,
      nodes: updatedNodes,
      edges: updatedEdges,
    };
  }
}

export class MoveTableCommand implements Command {
  name = 'Move Table';

  constructor(
    private tableId: string,
    private newPosition: { x: number; y: number },
    private oldPosition?: { x: number; y: number },
  ) {}

  execute(currentState: EditorState): EditorState {
    return {
      ...currentState,
      nodes: currentState.nodes.map((node) => {
        if (node.id === this.tableId) {
          // Store old position for undo
          if (!this.oldPosition) {
            this.oldPosition = { ...node.position };
          }
          return {
            ...node,
            position: this.newPosition,
          };
        }
        return node;
      }),
    };
  }

  undo(currentState: EditorState): EditorState {
    if (!this.oldPosition) return currentState;

    return {
      ...currentState,
      nodes: currentState.nodes.map((node) => {
        if (node.id === this.tableId) {
          return {
            ...node,
            position: this.oldPosition!,
          };
        }
        return node;
      }),
    };
  }
}

export class CreateRelationshipCommand implements Command {
  name = 'Create Relationship';

  constructor(
    private edge: Edge,
    private foreignKeyField?: Field,
    private targetTableId?: string,
  ) {}

  execute(currentState: EditorState): EditorState {
    let updatedNodes = currentState.nodes;

    // Add foreign key field if specified
    if (this.foreignKeyField && this.targetTableId) {
      updatedNodes = currentState.nodes.map((node) => {
        if (node.id === this.targetTableId) {
          return {
            ...node,
            data: {
              ...node.data,
              fields: [...node.data.fields, this.foreignKeyField as Field],
            },
          };
        }
        return node;
      });
    }

    return {
      ...currentState,
      nodes: updatedNodes,
      edges: [...currentState.edges, this.edge],
    };
  }

  undo(currentState: EditorState): EditorState {
    let updatedNodes = currentState.nodes;

    // Remove foreign key field if it was added
    if (this.foreignKeyField && this.targetTableId) {
      updatedNodes = currentState.nodes.map((node) => {
        if (node.id === this.targetTableId) {
          return {
            ...node,
            data: {
              ...node.data,
              fields: node.data.fields.filter((f) => f.name !== this.foreignKeyField!.name),
            },
          };
        }
        return node;
      });
    }

    return {
      ...currentState,
      nodes: updatedNodes,
      edges: currentState.edges.filter((e) => e.id !== this.edge.id),
    };
  }
}

export class DeleteRelationshipCommand implements Command {
  name = 'Delete Relationship';

  constructor(
    private edge: Edge,
    private foreignKeyField?: Field,
    private targetTableId?: string,
  ) {}

  execute(currentState: EditorState): EditorState {
    let updatedNodes = currentState.nodes;

    // Remove foreign key field if specified
    if (this.foreignKeyField && this.targetTableId) {
      updatedNodes = currentState.nodes.map((node) => {
        if (node.id === this.targetTableId) {
          return {
            ...node,
            data: {
              ...node.data,
              fields: node.data.fields.filter((f) => f.name !== this.foreignKeyField!.name),
            },
          };
        }
        return node;
      });
    }

    return {
      ...currentState,
      nodes: updatedNodes,
      edges: currentState.edges.filter((e) => e.id !== this.edge.id),
    };
  }

  undo(currentState: EditorState): EditorState {
    let updatedNodes = currentState.nodes;

    // Add back foreign key field if it was removed
    if (this.foreignKeyField && this.targetTableId) {
      updatedNodes = currentState.nodes.map((node) => {
        if (node.id === this.targetTableId) {
          return {
            ...node,
            data: {
              ...node.data,
              fields: [...node.data.fields, this.foreignKeyField as Field],
            },
          };
        }
        return node;
      });
    }

    return {
      ...currentState,
      nodes: updatedNodes,
      edges: [...currentState.edges, this.edge],
    };
  }
}
