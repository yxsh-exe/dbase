'use client';

import React from 'react';
import { Waypoints, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { deleteRelationshipThunk } from '@/store/thunks/editorThunks';

export function SidebarReferences() {
    const dispatch = useAppDispatch();
    
    const nodes = useAppSelector(state => state.editor.schema.present.nodes);
    const edges = useAppSelector(state => state.editor.schema.present.edges);

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">References</h3>
                    <span className="text-xs font-medium text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">{edges.length} total</span>
                </div>
                <p className="text-xs text-zinc-500">Drag a node handle to another node to create a relationship.</p>
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-2 bg-zinc-950/50">
                {edges.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
                            <Waypoints className="h-6 w-6 text-zinc-600" />
                        </div>
                        <p className="text-sm font-medium text-zinc-300">No references</p>
                    </div>
                ) : (
                    edges.map((edge) => {
                        const sourceNode = nodes.find(n => n.id === edge.source);
                        const targetNode = nodes.find(n => n.id === edge.target);
                        const data = edge.data as any;

                        if (!sourceNode || !targetNode || !data) return null;

                        return (
                            <div key={edge.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg group transition-colors hover:border-zinc-700">
                                <div className="flex items-start justify-between">
                                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-zinc-300 truncate" title={data.sourceTable}>{data.sourceTable}</span>
                                            <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded truncate" title={data.sourceField}>{data.sourceField}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-zinc-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                            <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-zinc-300 truncate" title={data.targetTable}>{data.targetTable}</span>
                                            <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded truncate" title={data.targetField}>{data.targetField}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const fieldToRemove = targetNode.data.fields.find(f => f.name === data.targetField);
                                            dispatch(deleteRelationshipThunk({ edge, foreignKeyField: fieldToRemove, targetTableId: edge.target }));
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-400 rounded hover:bg-red-400/10 transition-all ml-2 shrink-0"
                                        title="Delete Reference"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
