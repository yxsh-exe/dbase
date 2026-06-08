import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Node, Edge } from '@xyflow/react';
import type { TableNodeData, Field, TableReference } from '@/components/editor/nodes/types/Field';

export interface EditorSchemaState {
    nodes: Node<TableNodeData>[];
    edges: Edge[];
    nextTableId: number;
}

export interface EditorUIState {
    isCollapsed: boolean;
    activeTab: 'tables' | 'refs' | 'code';
    codeSubTab: 'sql' | 'prisma' | 'drizzle';
    tableQuery: string;
    expandedTables: string[]; // Using arrays instead of Sets for Redux serializability
    expandedSections: Record<string, string[]>;
    projectName: string;
    projectType: string | null;
    isLoading: boolean;
    isEditingTitle: boolean;
    isValidationDialogOpen: boolean;
    isShortcutsModalOpen: boolean;
    isImportDialogOpen: boolean;
    validationErrors: any[];
}

export interface EditorState {
    schema: {
        past: EditorSchemaState[];
        present: EditorSchemaState;
        future: EditorSchemaState[];
    };
    ui: EditorUIState;
}

const initialSchemaState: EditorSchemaState = {
    nodes: [],
    edges: [],
    nextTableId: 1,
};

const initialUIState: EditorUIState = {
    isCollapsed: false,
    activeTab: 'tables',
    codeSubTab: 'sql',
    tableQuery: '',
    expandedTables: [],
    expandedSections: {},
    projectName: 'Untitled Project',
    projectType: null,
    isLoading: true,
    isEditingTitle: false,
    isValidationDialogOpen: false,
    isShortcutsModalOpen: false,
    isImportDialogOpen: false,
    validationErrors: [],
};

const initialState: EditorState = {
    schema: {
        past: [],
        present: initialSchemaState,
        future: [],
    },
    ui: initialUIState,
};

const MAX_HISTORY = 50;

// Helper to push history
const pushHistory = (state: EditorState, newPresent: EditorSchemaState) => {
    state.schema.past.push(state.schema.present);
    if (state.schema.past.length > MAX_HISTORY) {
        state.schema.past.shift();
    }
    state.schema.present = newPresent;
    state.schema.future = [];
};

export const editorSlice = createSlice({
    name: 'editor',
    initialState,
    reducers: {
        // UI Actions
        setUIState(state, action: PayloadAction<Partial<EditorUIState>>) {
            state.ui = { ...state.ui, ...action.payload };
        },
        toggleSidebar(state) {
            state.ui.isCollapsed = !state.ui.isCollapsed;
        },
        toggleTableExpanded(state, action: PayloadAction<string>) {
            const tableId = action.payload;
            const index = state.ui.expandedTables.indexOf(tableId);
            if (index > -1) {
                state.ui.expandedTables.splice(index, 1);
            } else {
                state.ui.expandedTables.push(tableId);
            }
        },
        toggleSectionExpanded(state, action: PayloadAction<{ tableId: string; section: string }>) {
            const { tableId, section } = action.payload;
            if (!state.ui.expandedSections[tableId]) {
                state.ui.expandedSections[tableId] = [];
            }
            const index = state.ui.expandedSections[tableId].indexOf(section);
            if (index > -1) {
                state.ui.expandedSections[tableId].splice(index, 1);
            } else {
                state.ui.expandedSections[tableId].push(section);
            }
        },

        // Schema Actions (with History)
        initializeSchema(state, action: PayloadAction<EditorSchemaState>) {
            state.schema.present = action.payload;
            state.schema.past = [];
            state.schema.future = [];
        },
        updateSchemaDirectly(state, action: PayloadAction<Partial<EditorSchemaState>>) {
            // Update without pushing history (e.g. selection changes)
            state.schema.present = { ...state.schema.present, ...action.payload };
        },
        executeSchemaUpdate(state, action: PayloadAction<EditorSchemaState>) {
            pushHistory(state, action.payload);
        },
        undo(state) {
            if (state.schema.past.length === 0) return;
            const previous = state.schema.past.pop();
            state.schema.future.unshift(state.schema.present);
            state.schema.present = previous!;
        },
        redo(state) {
            if (state.schema.future.length === 0) return;
            const next = state.schema.future.shift();
            state.schema.past.push(state.schema.present);
            state.schema.present = next!;
        },
    },
});

export const {
    setUIState,
    toggleSidebar,
    toggleTableExpanded,
    toggleSectionExpanded,
    initializeSchema,
    updateSchemaDirectly,
    executeSchemaUpdate,
    undo,
    redo,
} = editorSlice.actions;

export default editorSlice.reducer;
