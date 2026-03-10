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

  constructor(
    private tableId: string,
    private newData: Partial<TableNodeData>,
    private oldData?: Partial<TableNodeData>,
  ) {}

  execute(currentState: EditorState): EditorState {
    return {
      ...currentState,
      nodes: currentState.nodes.map((node) => {
        if (node.id === this.tableId) {
          // Store old data for undo
          if (!this.oldData) {
            this.oldData = { ...node.data };
          }
          return {
            ...node,
            data: {
              ...node.data,
              ...this.newData,
            },
          };
        }
        return node;
      }),
    };
  }

  undo(currentState: EditorState): EditorState {
    if (!this.oldData) return currentState;

    return {
      ...currentState,
      nodes: currentState.nodes.map((node) => {
        if (node.id === this.tableId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...this.oldData,
            },
          };
        }
        return node;
      }),
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
