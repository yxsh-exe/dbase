'use client';

import React, { useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    MarkerType,
    ConnectionLineType,
    NodeChange,
    EdgeChange,
    Edge,
    Connection,
    applyNodeChanges,
    applyEdgeChanges,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Key, Link as LinkIcon, Fingerprint, Hash } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateSchemaDirectly, setUIState } from '@/store/slices/editorSlice';
import { updateTableThunk, deleteTableThunk, updateFieldThunk, createRelationshipThunk, deleteRelationshipThunk } from '@/store/thunks/editorThunks';

import { EditorHotkeys } from '@/components/editor/EditorHotkeys';
import { ValidationDialog } from '@/components/editor/ValidationDialog';
import { ImportSqlDialog } from '@/components/editor/ImportSqlDialog';
import { TableNode } from '@/components/editor/nodes/TableNode';
import RelationEdge from '@/components/editor/edges/RelationEdge';
import { Field, TableNodeData } from '@/components/editor/nodes/types/Field';

const nodeTypes = {
    table: TableNode,
};

const edgeTypes = {
    relation: RelationEdge,
};

export function EditorCanvas() {
    const dispatch = useAppDispatch();
    
    const nodes = useAppSelector(state => state.editor.schema.present.nodes);
    const edges = useAppSelector(state => state.editor.schema.present.edges);
    const validationErrors = useAppSelector(state => state.editor.ui.validationErrors);
    const isValidationDialogOpen = useAppSelector(state => state.editor.ui.isValidationDialogOpen);

    // Auto-cleanup invalid edges
    React.useEffect(() => {
        const invalidEdges = edges.filter(edge => {
            const destTable = nodes.find(n => n.id === edge.target);
            if (!destTable) return true;
            
            const targetFieldName = (edge.data as any)?.targetField;
            if (!targetFieldName) return true;

            const targetField = destTable.data.fields.find(f => f.name === targetFieldName);
            if (!targetField) return true;
            
            const isForeign = targetField.foreign || (targetField.constraints?.some(c => c.type === 'foreign_key') ?? false);
            if (!isForeign) return true;
            
            const sourceTable = nodes.find(n => n.id === edge.source);
            if (!sourceTable) return true;

            if (targetField.referencedTable !== sourceTable.data.name) return true;
            
            return false;
        });

        if (invalidEdges.length > 0) {
            const validEdges = edges.filter(e => !invalidEdges.includes(e));
            dispatch(updateSchemaDirectly({ edges: validEdges }));
        }
    }, [nodes, edges, dispatch]);

    // Callbacks to pass to nodes
    const handleUpdateTable = useCallback((tableId: string, updatedData: Partial<TableNodeData>) => {
        dispatch(updateTableThunk({ tableId, newData: updatedData }));
    }, [dispatch]);

    const handleRemoveTable = useCallback((tableId: string) => {
        dispatch(deleteTableThunk(tableId));
        toast.success('Table deleted successfully');
    }, [dispatch]);

    const handleAddField = useCallback((tableId: string, newField: Field) => {
        const targetNode = nodes.find(n => n.id === tableId);
        if (!targetNode) return;
        const updatedFields = [...targetNode.data.fields, newField];
        dispatch(updateTableThunk({ tableId, newData: { fields: updatedFields } }));
    }, [dispatch, nodes]);

    const handleRemoveField = useCallback((tableId: string, fieldIndex: number) => {
        const targetNode = nodes.find(n => n.id === tableId);
        if (!targetNode) return;
        
        const fieldToRemove = targetNode.data.fields[fieldIndex];
        const updatedFields = targetNode.data.fields.filter((_, idx) => idx !== fieldIndex);
        
        // If it's a foreign key, remove relationship
        if (fieldToRemove?.foreign) {
            const relatedEdge = edges.find(e => e.target === tableId && (e.data as any)?.targetField === fieldToRemove.name);
            if (relatedEdge) {
                dispatch(deleteRelationshipThunk({ edge: relatedEdge, foreignKeyField: fieldToRemove, targetTableId: tableId }));
                toast.success('Removed foreign key relationship');
                return;
            }
        }
        
        dispatch(updateTableThunk({ tableId, newData: { fields: updatedFields } }));
    }, [dispatch, nodes, edges]);

    const handleUpdateField = useCallback((tableId: string, fieldIndex: number, updatedField: Field) => {
        dispatch(updateFieldThunk({ tableId, fieldIndex, updatedField }));
    }, [dispatch]);

    const handleTableClick = useCallback((tableId: string) => {
        const newNodes = nodes.map(n => ({ ...n, selected: n.id === tableId }));
        dispatch(updateSchemaDirectly({ nodes: newNodes }));
    }, [dispatch, nodes]);

    // Decorate nodes with callbacks
    const nodesWithCallbacks = useMemo(() => {
        return nodes.map((node) => {
            const nodeErrors = (validationErrors || []).filter((e: any) => e.nodeId === node.id);
            return {
                ...node,
                data: {
                    ...node.data,
                    onUpdateTable: handleUpdateTable,
                    onRemoveTable: handleRemoveTable,
                    onAddField: handleAddField,
                    onRemoveField: handleRemoveField,
                    onUpdateField: handleUpdateField,
                    onTableClick: handleTableClick,
                },
                validationErrors: nodeErrors,
            };
        });
    }, [nodes, handleUpdateTable, handleRemoveTable, handleAddField, handleRemoveField, handleUpdateField, handleTableClick, validationErrors]);

    // Handlers
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        const positionChanges = changes.filter(c => c.type === 'position' && c.dragging === false);
        
        if (positionChanges.length > 0) {
            // When drag finishes, we trigger an official history push.
            // For now, apply directly to avoid flooding history
            const newNodes = applyNodeChanges(changes, nodes);
            dispatch(updateSchemaDirectly({ nodes: newNodes as any }));
        } else {
            const newNodes = applyNodeChanges(changes, nodes);
            dispatch(updateSchemaDirectly({ nodes: newNodes as any }));
        }
    }, [dispatch, nodes]);

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        const newEdges = applyEdgeChanges(changes, edges);
        dispatch(updateSchemaDirectly({ edges: newEdges }));
    }, [dispatch, edges]);

    const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
        edgesToDelete.forEach(edge => {
            const targetTableId = edge.target;
            const targetFieldName = (edge.data as any)?.targetField;
            if (!targetTableId || !targetFieldName) return;

            const targetNode = nodes.find(n => n.id === targetTableId);
            if (!targetNode) return;

            const fieldIndex = targetNode.data.fields.findIndex(f => f.name === targetFieldName);
            if (fieldIndex === -1) return;

            const field = targetNode.data.fields[fieldIndex];

            dispatch(deleteRelationshipThunk({ edge, foreignKeyField: field, targetTableId }));
        });
        toast.success('Relationship and foreign key field deleted');
    }, [dispatch, nodes]);

    const handleConnect = useCallback((connection: Connection) => {
        if (!connection.source || !connection.target) return;
        if (connection.source === connection.target) {
            toast.error('Cannot reference a table to itself');
            return;
        }

        const sourceTable = nodes.find(n => n.id === connection.source);
        const destTable = nodes.find(n => n.id === connection.target);
        if (!sourceTable || !destTable) return;

        const sourcePrimaryKey = sourceTable.data.fields.find(f => f.primary);
        if (!sourcePrimaryKey) {
            toast.error('Source table must have a primary key');
            return;
        }

        const fkName = `${sourceTable.data.name.toLowerCase()}_id`;
        if (destTable.data.fields.some(f => f.name === fkName)) {
            toast.error(`Foreign key "${fkName}" already exists`);
            return;
        }

        if (edges.some(e => e.source === connection.source && e.target === connection.target)) {
            toast.error('Reference already exists');
            return;
        }

        const fkField: Field = {
            name: fkName,
            type: sourcePrimaryKey.type,
            length: sourcePrimaryKey.length,
            precision: sourcePrimaryKey.precision,
            scale: sourcePrimaryKey.scale,
            primary: false,
            nullable: false,
            foreign: true,
            unique: false,
            referencedTable: sourceTable.data.name,
            referencedField: sourcePrimaryKey.name,
        };

        const newEdge = {
            id: `ref-${connection.source}-${connection.target}-${Date.now()}`,
            source: connection.source,
            target: connection.target,
            type: 'relation',
            animated: false,
            style: { stroke: '#3f3f46', strokeWidth: 1.5, strokeDasharray: '5,5' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b', width: 10, height: 10 },
            data: {
                sourceField: sourcePrimaryKey.name,
                targetField: fkName,
                sourceTable: sourceTable.data.name,
                targetTable: destTable.data.name,
                sourceTableId: connection.source,
                destinationTableId: connection.target,
                relationship: 'one-to-many',
                referenceType: 'foreign_key',
            },
        };

        dispatch(createRelationshipThunk({ edge: newEdge, foreignKeyField: fkField, targetTableId: connection.target }));
        toast.success(`Created foreign key in ${destTable.data.name}`);
    }, [dispatch, nodes, edges]);

    return (
        <div className="flex-1 relative w-full h-full overflow-hidden">
            <ReactFlowProvider>
                <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center pointer-events-none">
                    <div className="flex items-center gap-5 px-6 py-2.5 rounded-full border border-zinc-800 bg-zinc-950 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
                        <div className="flex items-center gap-2">
                            <Key className="h-3 w-3 text-yellow-400 shrink-0" />
                            <span className="text-[11px] text-zinc-300 font-medium">Primary Key</span>
                        </div>
                        <span className="text-zinc-700">·</span>
                        <div className="flex items-center gap-2">
                            <LinkIcon className="h-3 w-3 text-blue-400 shrink-0" />
                            <span className="text-[11px] text-zinc-300 font-medium">Foreign Key</span>
                        </div>
                        <span className="text-zinc-700">·</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-400 border border-zinc-600 rounded px-1 leading-tight">N</span>
                            <span className="text-[11px] text-zinc-300 font-medium">Nullable</span>
                        </div>
                        <span className="text-zinc-700">·</span>
                        <div className="flex items-center gap-2">
                            <Fingerprint className="h-3 w-3 text-purple-400 shrink-0" />
                            <span className="text-[11px] text-zinc-300 font-medium">Unique</span>
                        </div>
                        <span className="text-zinc-700">·</span>
                        <div className="flex items-center gap-2">
                            <Hash className="h-3 w-3 text-green-400 shrink-0" />
                            <span className="text-[11px] text-zinc-300 font-medium">Identity</span>
                        </div>
                    </div>
                </div>
                
                <ReactFlow
                    nodes={nodesWithCallbacks}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onEdgesDelete={onEdgesDelete}
                    onConnect={handleConnect}
                    nodeTypes={nodeTypes as any}
                    edgeTypes={edgeTypes as any}
                    connectionLineType={ConnectionLineType.SmoothStep}
                    fitView
                    fitViewOptions={{ maxZoom: 1 }}
                    defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                    className="bg-black"
                    minZoom={0.1}
                    maxZoom={2.5}
                    snapToGrid={false}
                    defaultEdgeOptions={{
                        type: 'relation',
                        style: { stroke: '#3f3f46', strokeWidth: 1.5, strokeDasharray: '5,5' },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b', width: 10, height: 10 },
                    }}
                    nodesDraggable={true}
                    nodesConnectable={true}
                    elementsSelectable={true}
                >
                    <Background color="#2d2d2d" gap={24} size={2} />
                    <Controls
                        position="top-right"
                        showInteractive={false}
                        className="!flex !flex-row !bg-zinc-950 !border !border-zinc-800 !rounded-lg !shadow-lg !mt-4 !mr-4 [&>button]:!bg-zinc-950 [&>button]:!border-zinc-800 [&>button]:!border-b-0 [&>button:not(:last-child)]:!border-r [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-900 [&>button:hover]:!text-white [&>button]:!w-8 [&>button]:!h-8"
                    />
                    <MiniMap
                        nodeColor="#1a1a1a"
                        nodeStrokeColor="#3f3f46"
                        nodeBorderRadius={4}
                        maskColor="rgba(0, 0, 0, 0.7)"
                        position="bottom-right"
                        className="!bg-zinc-950 !border !border-zinc-800 !rounded-lg"
                        style={{ width: 140, height: 90, bottom: 36, right: 12 }}
                    />
                </ReactFlow>

                <ValidationDialog
                    isOpen={isValidationDialogOpen}
                    onClose={() => dispatch(setUIState({ isValidationDialogOpen: false }))}
                />
                <ImportSqlDialog />
            </ReactFlowProvider>
        </div>
    );
}
