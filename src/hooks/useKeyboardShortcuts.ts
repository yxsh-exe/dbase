import { useHotkeys } from 'react-hotkeys-hook';
import { useCallback } from 'react';

export interface KeyboardShortcutsActions {
  onNewTable: () => void;
  onDeleteSelected: () => void;
  onSave: () => void;
  onExportSchema: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCancelOperation: () => void;
  onShowShortcutsHelp: () => void;
}

export interface KeyboardShortcut {
  keys: string;
  description: string;
  category: 'General' | 'Table Operations' | 'Editing';
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { keys: 'n', description: 'Create new table', category: 'Table Operations' },
  { keys: 'delete', description: 'Delete selected table/field', category: 'Table Operations' },
  { keys: 'ctrl+s', description: 'Save project', category: 'General' },
  { keys: 'ctrl+e', description: 'Export schema', category: 'General' },
  { keys: 'ctrl+z', description: 'Undo', category: 'Editing' },
  { keys: 'ctrl+y', description: 'Redo', category: 'Editing' },
  { keys: 'escape', description: 'Cancel current operation', category: 'General' },
  { keys: 'ctrl+h', description: 'Show keyboard shortcuts help', category: 'General' },
];

export function useKeyboardShortcuts(actions: KeyboardShortcutsActions) {
  const {
    onNewTable,
    onDeleteSelected,
    onSave,
    onExportSchema,
    onUndo,
    onRedo,
    onCancelOperation,
    onShowShortcutsHelp,
  } = actions;

  // New table
  useHotkeys(
    'n',
    useCallback((event) => {
      event.preventDefault();
      onNewTable();
    }, [onNewTable]),
    {
      enableOnFormTags: false,
      description: 'Create new table',
    }
  );

  // Delete selected
  useHotkeys(
    'delete',
    useCallback((event) => {
      // Only trigger if not in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      event.preventDefault();
      onDeleteSelected();
    }, [onDeleteSelected]),
    {
      enableOnFormTags: false,
      description: 'Delete selected table/field',
    }
  );

  // Save project
  useHotkeys(
    'ctrl+s',
    useCallback((event) => {
      event.preventDefault();
      onSave();
    }, [onSave]),
    {
      enableOnFormTags: true,
      description: 'Save project',
    }
  );

  // Export schema
  useHotkeys(
    'ctrl+e',
    useCallback((event) => {
      event.preventDefault();
      onExportSchema();
    }, [onExportSchema]),
    {
      enableOnFormTags: false,
      description: 'Export schema',
    }
  );

  // Undo
  useHotkeys(
    'ctrl+z',
    useCallback((event) => {
      event.preventDefault();
      onUndo();
    }, [onUndo]),
    {
      enableOnFormTags: false,
      description: 'Undo',
    }
  );

  // Redo
  useHotkeys(
    'ctrl+y',
    useCallback((event) => {
      event.preventDefault();
      onRedo();
    }, [onRedo]),
    {
      enableOnFormTags: false,
      description: 'Redo',
    }
  );


  // Cancel operation
  useHotkeys(
    'escape',
    useCallback((event) => {
      event.preventDefault();
      onCancelOperation();
    }, [onCancelOperation]),
    {
      enableOnFormTags: true,
      description: 'Cancel current operation',
    }
  );

  // Show shortcuts help
  useHotkeys(
    'ctrl+h',
    useCallback((event) => {
      event.preventDefault();
      onShowShortcutsHelp();
    }, [onShowShortcutsHelp]),
    {
      enableOnFormTags: false,
      description: 'Show keyboard shortcuts help',
    }
  );

  return {
    shortcuts: KEYBOARD_SHORTCUTS,
  };
}