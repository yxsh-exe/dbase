'use client';

import React, { useCallback } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { undo, redo, setUIState } from '@/store/slices/editorSlice';
import { deleteTableThunk } from '@/store/thunks/editorThunks';
import { toast } from 'react-hot-toast';

interface EditorHotkeysProps {
    onSave: () => void;
    onExportSchema: () => void;
}

export function EditorHotkeys({ onSave, onExportSchema }: EditorHotkeysProps) {
    const dispatch = useAppDispatch();
    const nodes = useAppSelector(state => state.editor.schema.present.nodes);
    
    const handleDeleteSelected = useCallback(() => {
        const selectedTable = nodes.find(node => node.selected);
        if (selectedTable) {
            dispatch(deleteTableThunk(selectedTable.id));
            toast.success(`Table deleted successfully`);
        } else {
            toast('No table selected for deletion', { icon: 'ℹ️' });
        }
    }, [dispatch, nodes]);

    const handleCancelOperation = useCallback(() => {
        dispatch(setUIState({ isShortcutsModalOpen: false, isValidationDialogOpen: false }));
    }, [dispatch]);

    useKeyboardShortcuts({
        onDeleteSelected: handleDeleteSelected,
        onSave,
        onExportSchema,
        onUndo: () => dispatch(undo()),
        onRedo: () => dispatch(redo()),
        onCancelOperation: handleCancelOperation,
        onShowShortcutsHelp: () => dispatch(setUIState({ isShortcutsModalOpen: true })),
    });

    return null; // This component handles side effects only
}
