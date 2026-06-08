'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUIState, executeSchemaUpdate } from '@/store/slices/editorSlice';
import { parseSqlToNodes } from '@/lib/parsers/sqlToNodes';
import toast from 'react-hot-toast';

export function ImportSqlDialog() {
    const dispatch = useAppDispatch();
    const isOpen = useAppSelector(state => state.editor.ui.isImportDialogOpen);
    const existingNodes = useAppSelector(state => state.editor.schema.present.nodes);
    const existingEdges = useAppSelector(state => state.editor.schema.present.edges);

    const [sqlCode, setSqlCode] = useState('');
    const [dialect, setDialect] = useState('postgresql');
    const [merge, setMerge] = useState(false);

    const handleImport = () => {
        try {
            if (!sqlCode.trim()) {
                toast.error('SQL code is empty');
                return;
            }
            
            const { nodes, edges } = parseSqlToNodes(sqlCode, dialect, merge);
            
            let finalNodes = nodes;
            let finalEdges = edges;

            if (merge) {
                // Find non-conflicting nodes (simple append logic)
                const newNodes = nodes.filter(n => !existingNodes.some(en => en.data.name === n.data.name));
                finalNodes = [...existingNodes, ...newNodes];
                
                // Append edges
                finalEdges = [...existingEdges, ...edges.filter(e => !existingEdges.some(ee => ee.id === e.id))];
            }
            
            dispatch(executeSchemaUpdate({
                nodes: finalNodes,
                edges: finalEdges,
                nextTableId: finalNodes.length + 1
            }));
            
            toast.success('SQL Imported Successfully!');
            dispatch(setUIState({ isImportDialogOpen: false }));
            setSqlCode('');
        } catch (error: any) {
            console.error('Import Error:', error);
            toast.error(`Failed to parse SQL: ${error.message}`);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => dispatch(setUIState({ isImportDialogOpen: open }))}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-[90vw] max-w-[800px] translate-x-[-50%] translate-y-[-50%] rounded-xl bg-zinc-950 p-6 shadow-2xl border border-zinc-800 flex flex-col max-h-[85vh]">
                    <div className="flex items-center justify-between mb-4">
                        <Dialog.Title className="text-xl font-semibold text-white">Import SQL Schema</Dialog.Title>
                        <Dialog.Close className="text-zinc-400 hover:text-white">
                            <X className="h-5 w-5" />
                        </Dialog.Close>
                    </div>

                    <div className="flex gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-zinc-400">Dialect:</label>
                            <select
                                value={dialect}
                                onChange={(e) => setDialect(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 text-sm text-white rounded p-1 outline-none"
                            >
                                <option value="postgresql">PostgreSQL</option>
                                <option value="mysql">MySQL</option>
                                <option value="mariadb">MariaDB</option>
                                <option value="sqlite">SQLite</option>
                            </select>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-400">
                            <input
                                type="checkbox"
                                checked={merge}
                                onChange={(e) => setMerge(e.target.checked)}
                                className="rounded bg-zinc-900 border-zinc-700"
                            />
                            Merge with existing canvas
                        </label>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col relative min-h-[300px]">
                        <textarea
                            value={sqlCode}
                            onChange={(e) => setSqlCode(e.target.value)}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 font-mono focus:outline-none focus:border-zinc-700 resize-none"
                            placeholder="Paste your CREATE TABLE statements here..."
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <Dialog.Close asChild>
                            <button className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors">
                                Cancel
                            </button>
                        </Dialog.Close>
                        <button
                            onClick={handleImport}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors flex items-center gap-2"
                        >
                            <Check className="h-4 w-4" />
                            Import Schema
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
