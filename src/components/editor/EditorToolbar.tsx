'use client';

import React from 'react';
import { BadgeCheck, Download, Upload, Keyboard, Redo, Undo, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { MysqlLogo, PostgresLogo, SqliteLogo, MsSqlLogo } from '@/components/Logos';
import { Database } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { undo, redo, setUIState } from '@/store/slices/editorSlice';

const ProjectIcon = ({ type, className }: { type?: string | null, className?: string }) => {
    switch (type) {
        case 'MySQL': return <MysqlLogo className={className} />;
        case 'PostgreSQL': return <PostgresLogo className={className} />;
        case 'SQLite': return <SqliteLogo className={className} />;
        case 'SQL Server': return <MsSqlLogo className={className} />;
        default: return <Database className={className} />;
    }
};

interface EditorToolbarProps {
    projectId: string;
    onValidateSchema: () => void;
    onExportSchema: () => void;
}

export function EditorToolbar({ projectId, onValidateSchema, onExportSchema }: EditorToolbarProps) {
    const dispatch = useAppDispatch();

    // Selectors
    const nodes = useAppSelector(state => state.editor.schema.present.nodes);
    const edges = useAppSelector(state => state.editor.schema.present.edges);
    const canUndo = useAppSelector(state => state.editor.schema.past.length > 0);
    const canRedo = useAppSelector(state => state.editor.schema.future.length > 0);

    const isEditingTitle = useAppSelector(state => state.editor.ui.isEditingTitle);
    const projectName = useAppSelector(state => state.editor.ui.projectName);
    const projectType = useAppSelector(state => state.editor.ui.projectType);

    // Editing State (local to component for fast typing)
    const [editTitleValue, setEditTitleValue] = React.useState(projectName);

    React.useEffect(() => {
        setEditTitleValue(projectName);
    }, [projectName]);

    return (
        <header className="sticky top-0 border-b border-zinc-800 bg-zinc-950 px-4 py-2 z-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link
                    href="/projects"
                    className="flex items-center justify-center h-7 w-7 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 hover:scale-95 transition-transform ease-[cubic-bezier(0.23,1,0.32,1)] duration-150 mr-1 ml-[11px]"
                    title="Back to Projects"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Link>
                <Link href="/projects" className="flex items-center gap-2 transition-transform hover:scale-95 ease-[cubic-bezier(0.23,1,0.32,1)] duration-150">
                    <span className="text-lg font-bold text-white">DBase</span>
                </Link>
                <div className="h-5 w-px bg-zinc-800" />
                <div className="text-xs text-zinc-500 flex gap-4 font-medium">
                    <span>{nodes.length} Table{nodes.length !== 1 ? 's' : ''}</span>
                    <span>{edges.length} Reference{edges.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Center — Project Name */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
                {isEditingTitle ? (
                    <input
                        autoFocus
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onBlur={async () => {
                            dispatch(setUIState({ isEditingTitle: false }));
                            const newName = editTitleValue.trim();
                            if (newName && newName !== projectName) {
                                dispatch(setUIState({ projectName: newName }));
                                try {
                                    await fetch(`/api/projects/${projectId}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ name: newName }),
                                    });
                                    toast.success('Project name updated');
                                } catch (error) {
                                    toast.error('Failed to update project name');
                                    // Revert
                                    dispatch(setUIState({ projectName }));
                                }
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-sm font-semibold text-white outline-none focus:border-zinc-500 text-center w-[200px]"
                    />
                ) : (
                    <div
                        className="flex items-center gap-1.5 cursor-pointer hover:bg-zinc-800/50 px-2 py-1 rounded transition-transform hover:scale-[0.98] ease-[cubic-bezier(0.23,1,0.32,1)] duration-150 group"
                        onClick={() => {
                            setEditTitleValue(projectName);
                            dispatch(setUIState({ isEditingTitle: true }));
                        }}
                        title="Click to edit project name"
                    >
                        <ProjectIcon type={projectType} className="h-5 w-5 text-zinc-400 group-hover:text-white transition-colors" />
                        <span className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">
                            {projectName}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1.5">
                {/* Keyboard Shortcuts */}
                <button
                    onClick={() => dispatch(setUIState({ isShortcutsModalOpen: true }))}
                    className="rounded-md bg-zinc-900 text-zinc-400 p-1.5 border border-zinc-800 transition-transform hover:scale-[0.97] ease-[cubic-bezier(0.23,1,0.32,1)] duration-150"
                    title="Keyboard shortcuts (Ctrl+H)"
                >
                    <Keyboard className="h-3.5 w-3.5" />
                </button>

                {/* Validate */}
                <button
                    onClick={onValidateSchema}
                    className="rounded-md bg-zinc-900 text-zinc-400 p-1.5 border border-zinc-800 transition-transform hover:scale-[0.97] ease-[cubic-bezier(0.23,1,0.32,1)] duration-150"
                    title="Validate schema"
                >
                    <BadgeCheck className="h-3.5 w-3.5" />
                </button>

                {/* Import */}
                <button
                    onClick={() => dispatch(setUIState({ isImportDialogOpen: true }))}
                    className="rounded-md bg-zinc-900 text-zinc-400 p-1.5 border border-zinc-800 transition-transform hover:scale-[0.97] ease-[cubic-bezier(0.23,1,0.32,1)] duration-150"
                    title="Import SQL Schema"
                >
                    <Upload className="h-3.5 w-3.5" />
                </button>

                {/* Export */}
                <button
                    onClick={onExportSchema}
                    className="rounded-md bg-zinc-900 text-zinc-400 p-1.5 border border-zinc-800 transition-transform hover:scale-[0.97] ease-[cubic-bezier(0.23,1,0.32,1)] duration-150"
                    title="Export schema (Shift+E)"
                >
                    <Download className="h-3.5 w-3.5" />
                </button>

                <div className="h-5 w-px bg-zinc-800 mx-0.5" />

                {/* Undo/Redo */}
                <button
                    onClick={() => dispatch(undo())}
                    disabled={!canUndo}
                    className="rounded-md bg-zinc-900 text-zinc-400 p-1.5 border border-zinc-800 transition-transform hover:scale-[0.97] ease-[cubic-bezier(0.23,1,0.32,1)] duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={() => dispatch(redo())}
                    disabled={!canRedo}
                    className="rounded-md bg-zinc-900 text-zinc-400 p-1.5 border border-zinc-800 transition-transform hover:scale-[0.97] ease-[cubic-bezier(0.23,1,0.32,1)] duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    title="Redo (Ctrl+Y)"
                >
                    <Redo className="h-3.5 w-3.5" />
                </button>
            </div>
        </header>
    );
}
