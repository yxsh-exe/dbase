'use client';

import React, { useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUIState, updateSchemaDirectly } from '@/store/slices/editorSlice';
import { createTableThunk } from '@/store/thunks/editorThunks';

import { SidebarTableNode } from './SidebarTableNode';

export function SidebarTables() {
    const dispatch = useAppDispatch();
    
    const nodes = useAppSelector(state => state.editor.schema.present.nodes);
    const tableQuery = useAppSelector(state => state.editor.ui.tableQuery);
    const [activeId, setActiveId] = React.useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const filteredNodes = useMemo(() => {
        if (!tableQuery) return nodes;
        return nodes.filter((n) =>
            n.data.name.toLowerCase().includes(tableQuery.toLowerCase())
        );
    }, [nodes, tableQuery]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = nodes.findIndex((n) => n.id === active.id);
            const newIndex = nodes.findIndex((n) => n.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const newNodes = [...nodes];
                const [movedNode] = newNodes.splice(oldIndex, 1);
                newNodes.splice(newIndex, 0, movedNode);
                dispatch(updateSchemaDirectly({ nodes: newNodes }));
            }
        }
    };

    const handleAddTable = () => {
        const newTableId = `table_${Date.now()}`;
        dispatch(createTableThunk({
            id: newTableId,
            name: `table_${nodes.length + 1}`,
            fields: [
                {
                    name: 'id',
                    type: 'bigint',
                    primary: true,
                    unique: false,
                    nullable: false,
                    foreign: false,
                    constraints: [],
                }
            ],
            position: { x: 100, y: 100 },
        }));
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search & Actions Header */}
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">Tables</h3>
                    <button
                        onClick={handleAddTable}
                        className="flex items-center justify-center h-7 w-7 rounded bg-pink-500/10 text-pink-400 hover:bg-pink-500 hover:text-white transition-transform hover:scale-[1.05] active:scale-95 ease-[cubic-bezier(0.23,1,0.32,1)] duration-150"
                        title="Add Table"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
                
                <div className="relative group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-pink-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search tables..."
                        value={tableQuery}
                        onChange={(e) => dispatch(setUIState({ tableQuery: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 bg-zinc-950/50">
                {nodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
                            <Plus className="h-6 w-6 text-zinc-600" />
                        </div>
                        <p className="text-sm font-medium text-zinc-300">No tables yet</p>
                        <p className="text-xs text-zinc-500 mt-1">Click the + button to create your first table</p>
                    </div>
                ) : filteredNodes.length === 0 ? (
                    <p className="text-center text-sm text-zinc-500 mt-4">No tables found</p>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <SortableContext items={filteredNodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {filteredNodes.map((node) => (
                                    <SidebarTableNode
                                        key={node.id}
                                        tableId={node.id}
                                        tableData={node.data}
                                        isSelected={node.selected || false}
                                        onSelect={() => {
                                            const newNodes = nodes.map(n => ({ ...n, selected: n.id === node.id }));
                                            dispatch(updateSchemaDirectly({ nodes: newNodes }));
                                        }}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                        <DragOverlay>
                            {activeId ? (
                                <SidebarTableNode
                                    tableId={activeId}
                                    tableData={nodes.find(n => n.id === activeId)!.data}
                                    isSelected={true}
                                    onSelect={() => {}}
                                    isOverlay={true}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>
        </div>
    );
}
