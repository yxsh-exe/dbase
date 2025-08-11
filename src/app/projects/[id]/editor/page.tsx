"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    addEdge,
    Background,
    ConnectionLineType,
    Connection,
    Controls,
    Edge,
    MarkerType,
    MiniMap,
    Node,
    ReactFlow,
    useEdgesState,
    useNodesState,
} from '@xyflow/react';
import { toast } from 'react-hot-toast';
import '@xyflow/react/dist/style.css';
import { Database, Plus, Save } from 'lucide-react';
import { TableNode } from '@/components/editor/nodes/TableNode';
import { Field, TableNodeData } from '@/components/editor/nodes/types/Field';
import { AddTableDrawer } from '@/components/editor/AddTableDrawer';
import { Key, Hash, Fingerprint, Diamond } from 'lucide-react';
import { EditorSidebar } from '@/components/editor/Sidebar';
import { SidebarProvider, Sidebar as ShadcnSidebar, SidebarInset } from '@/components/ui/sidebar';

const nodeTypes = {
    table: TableNode,
} as const;

export default function ModernSchemaEditor({ params }: { params: Promise<{ id: string }> }) {
    type ReferenceEdgeData = {
        sourceField: string;
        targetField: string;
        sourceTable: string;
        targetTable: string;
        sourceTableId: string;
        destinationTableId: string;
        relationship: 'one-to-many' | string;
        referenceType: 'foreign_key' | string;
    };

    const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ReferenceEdgeData>>([]);
    const [nextTableId, setNextTableId] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddTableOpen, setIsAddTableOpen] = useState(false);

    // Resolve params asynchronously
    useEffect(() => {
        const loadParams = async () => {
            const unwrappedParams = await params;
            setIsLoading(true);
            try {
                const response = await fetch(`/api/projects/${unwrappedParams.id}`);
                if (!response.ok) throw new Error('Failed to load schema');

                const project = await response.json();
                if (project.schema) {
                    const { nodes: savedNodes, edges: savedEdges } = project.schema;

                    const processedNodes = savedNodes.map((node: Node<TableNodeData>) => ({
                        ...node,
                        type: 'table',
                        data: {
                            ...node.data,
                            fields: node.data.fields.map((field: Field) => ({
                                ...field,
                                primary: !!field.primary,
                                nullable: field.nullable !== false,
                                foreign: !!field.foreign,
                                unique: !!field.unique,
                            })),
                        },
                    }));

                    setNodes(processedNodes);
                    const processedEdges = (savedEdges || []) as Edge<ReferenceEdgeData>[];
                    setEdges(processedEdges);

                    const maxId = Math.max(
                        0,
                        ...processedNodes.map((node: Node<TableNodeData>) => parseInt(node.id.split('-')[1] || '0'))
                    );
                    setNextTableId(maxId + 1);

                    toast.success('Schema loaded successfully');
                }
            } catch (error) {
                console.error('Error loading schema:', error);
                toast.error('Failed to load schema');
            } finally {
                setIsLoading(false);
            }
        };
        loadParams();
    }, [params, setNodes, setEdges]);



    const createTableReference = useCallback(
        (sourceTableId: string, destinationTableId: string) => {
            if (sourceTableId === destinationTableId) {
                toast.error('Cannot reference a table to itself');
                return;
            }

            const sourceTable = nodes.find((node) => node.id === sourceTableId);
            const destinationTable = nodes.find((node) => node.id === destinationTableId);

            if (!sourceTable || !destinationTable) {
                toast.error('Source or destination table not found');
                return;
            }

            const sourcePrimaryKey = sourceTable.data.fields.find((field) => field.primary);
            if (!sourcePrimaryKey) {
                toast.error('Source table must have a primary key');
                return;
            }

            // Create foreign key field name: source_table_name + "_id"
            const foreignKeyFieldName = `${sourceTable.data.name.toLowerCase()}_id`;

            // Check if foreign key already exists
            const existingForeignKey = destinationTable.data.fields.find(
                (field) => field.name === foreignKeyFieldName
            );

            if (existingForeignKey) {
                toast.error(`Foreign key "${foreignKeyFieldName}" already exists in ${destinationTable.data.name}`);
                return;
            }

            // Prevent duplicate edges between the same tables
            const duplicateEdge = edges.some((e) =>
                e.source === sourceTableId &&
                e.target === destinationTableId
            );
            if (duplicateEdge) {
                toast.error('Reference already exists between these tables');
                return;
            }

            // Create the foreign key field
            const foreignKeyField: Field = {
                name: foreignKeyFieldName,
                type: sourcePrimaryKey.type,
                length: sourcePrimaryKey.length,
                precision: sourcePrimaryKey.precision,
                scale: sourcePrimaryKey.scale,
                primary: false,
                nullable: true,
                foreign: true,
                unique: false,
                referencedTable: sourceTable.data.name,
                referencedField: sourcePrimaryKey.name,
            };

            // Add foreign key field to destination table
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id !== destinationTableId) return node;

                    return {
                        ...node,
                        data: {
                            ...node.data,
                            fields: [...node.data.fields, foreignKeyField],
                            references: [
                                ...(node.data.references || []),
                                {
                                    sourceTableId,
                                    sourceTableName: sourceTable.data.name,
                                    foreignKeyField: foreignKeyFieldName,
                                    referencedField: sourcePrimaryKey.name,
                                },
                            ],
                        },
                    };
                })
            );

            // Create edge from source primary key to destination foreign key
            const newEdge: Edge<ReferenceEdgeData> = {
                id: `ref-${sourceTableId}-${destinationTableId}-${Date.now()}`,
                source: sourceTableId,
                target: destinationTableId,
                type: 'smoothstep',
                animated: true,
                style: {
                    stroke: '#ffffff',
                    strokeWidth: 2,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#ffffff',
                    width: 12,
                    height: 12,
                },
                data: {
                    sourceField: sourcePrimaryKey.name,
                    targetField: foreignKeyFieldName,
                    sourceTable: sourceTable.data.name,
                    targetTable: destinationTable.data.name,
                    sourceTableId,
                    destinationTableId,
                    relationship: 'one-to-many',
                    referenceType: 'foreign_key',
                },
            };

            setEdges((eds) => addEdge(newEdge, eds));
            toast.success(`Created foreign key "${foreignKeyFieldName}" in ${destinationTable.data.name}`);
        },
        [nodes, edges, setNodes, setEdges]
    );

    const handleTableClick = useCallback(
        (tableId: string) => {
            setNodes((nds) =>
                nds.map((node) => ({
                    ...node,
                    selected: node.id === tableId,
                }))
            );
        },
        [setNodes]
    );

    const handleConnect = useCallback(
        (connection: Connection) => {
            if (connection.source && connection.target) {
                createTableReference(connection.source, connection.target);
            }
        },
        [createTableReference]
    );

    const handleUpdateTable = useCallback(
        (tableId: string, updatedData: Partial<TableNodeData>) => {
            setNodes((nds) =>
                nds.map((node) =>
                    node.id === tableId
                        ? {
                            ...node,
                            data: {
                                ...node.data,
                                ...updatedData,
                            },
                        }
                        : node
                )
            );
        },
        [setNodes]
    );

    const handleRemoveTable = useCallback(
        (tableId: string) => {
            const nodeToDelete = nodes.find((n) => n.id === tableId);
            const deletedTableName = nodeToDelete?.data.name;

            // 1) Remove the node itself and cascade-clean remaining nodes
            setNodes((existingNodes) => {
                const remainingNodes = existingNodes.filter((n) => n.id !== tableId);

                return remainingNodes.map((n) => {
                    let updatedFields = n.data.fields;
                    let updatedReferences = n.data.references || [];

                    // Remove references pointing to the deleted source table
                    const foreignKeyFieldsToRemove = new Set<string>();
                    updatedReferences = updatedReferences.filter((ref) => {
                        const shouldRemove =
                            ref.sourceTableId === tableId ||
                            (deletedTableName ? ref.sourceTableName === deletedTableName : false);
                        if (shouldRemove) foreignKeyFieldsToRemove.add(ref.foreignKeyField);
                        return !shouldRemove;
                    });

                    // Remove FK fields that correspond to removed references
                    if (foreignKeyFieldsToRemove.size > 0) {
                        updatedFields = updatedFields.filter((f) => !foreignKeyFieldsToRemove.has(f.name));
                    }

                    // Safety: also remove any FK fields that explicitly reference the deleted table by name
                    if (deletedTableName) {
                        updatedFields = updatedFields.filter(
                            (f) => !(f.foreign && f.referencedTable === deletedTableName)
                        );
                    }

                    return {
                        ...n,
                        data: {
                            ...n.data,
                            fields: updatedFields,
                            references: updatedReferences,
                        },
                    };
                });
            });

            // 2) Remove edges connected to the deleted table
            setEdges((eds) => eds.filter((edge) => edge.source !== tableId && edge.target !== tableId));

            toast.success('Table removed and related references cleaned up');
        },
        [nodes, setEdges, setNodes]
    );

    const handleAddField = useCallback(
        (tableId: string, newField: Field) => {
            setNodes((nds) =>
                nds.map((node) =>
                    node.id === tableId
                        ? {
                            ...node,
                            data: {
                                ...node.data,
                                fields: [...node.data.fields, newField],
                            },
                        }
                        : node
                )
            );
        },
        [setNodes]
    );

    const handleRemoveField = useCallback(
        (tableId: string, fieldIndex: number) => {
            const fieldToRemove = nodes.find((n) => n.id === tableId)?.data.fields[fieldIndex];

            // If removing a foreign key field, also remove the corresponding edge
            if (fieldToRemove?.foreign) {
                setEdges((eds) =>
                    eds.filter((edge: Edge<ReferenceEdgeData>) => {
                        return !(
                            edge.target === tableId &&
                            edge.data?.targetField === fieldToRemove?.name
                        );
                    })
                );
            }

            setNodes((nds) => {
                const updatedNodes = nds.map((node) => {
                    if (node.id !== tableId) return node;
                    const updatedFields = node.data.fields.filter((_, index) => index !== fieldIndex);

                    // Remove references related to this field
                    const updatedReferences = (node.data.references || []).filter(
                        (ref) => ref.foreignKeyField !== fieldToRemove?.name
                    );

                    return updatedFields.length === 0
                        ? null
                        : {
                            ...node,
                            data: {
                                ...node.data,
                                fields: updatedFields,
                                references: updatedReferences,
                            },
                        };
                }).filter((node): node is Node<TableNodeData> => node !== null);
                return updatedNodes;
            });

            if (fieldToRemove?.foreign) {
                toast.success(`Removed foreign key "${fieldToRemove.name}" and its relationship`);
            }
        },
        [setNodes, setEdges, nodes]
    );

    const handleUpdateField = useCallback(
        (tableId: string, fieldIndex: number, updatedField: Field) => {
            setNodes((nds) =>
                nds.map((node) =>
                    node.id === tableId
                        ? {
                            ...node,
                            data: {
                                ...node.data,
                                fields: node.data.fields.map((field, idx) => (idx === fieldIndex ? updatedField : field)),
                            },
                        }
                        : node
                )
            );
        },
        [setNodes]
    );

    const nodesWithCallbacks = useMemo(() => {
        return nodes.map((node) => ({
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
        }));
    }, [nodes, handleUpdateTable, handleRemoveTable, handleAddField, handleRemoveField, handleUpdateField, handleTableClick]);

    const MAX_TABLES = 50;
    const handleCreateTableFromDrawer = useCallback((table: { name: string; fields: Field[] }) => {
        if (nodes.length >= MAX_TABLES) {
            toast.error(`Cannot add more than ${MAX_TABLES} tables`);
            return;
        }

        const name = table.name.trim();
        if (!name) {
            toast.error('Table name must be unique');
            return;
        }
        const isNameUnique = !nodes.some((node) => node.data.name === name);
        if (!isNameUnique) {
            toast.error('Table name must be unique');
            return;
        }

        const newNode: Node<TableNodeData> = {
            id: `table-${nextTableId}`,
            type: 'table',
            position: {
                x: Math.random() * window.innerWidth * 0.5 + window.innerWidth * 0.1,
                y: Math.random() * window.innerHeight * 0.5 + window.innerHeight * 0.1,
            },
            data: {
                name,
                fields: table.fields,
            },
        };

        setNodes((nds) => nds.concat(newNode));
        setNextTableId((prev) => prev + 1);
        toast.success(`Table "${name}" created`);
    }, [nodes, nextTableId, setNodes]);

    // Edge removal is handled implicitly when deleting foreign key fields

    const handleSave = useCallback(async () => {
        try {
            const unwrappedParams = await params;
            const response = await fetch(`/api/projects/${unwrappedParams.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    schema: {
                        nodes,
                        edges,
                        metadata: {
                            lastModified: new Date().toISOString(),
                        },
                    },
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save schema');
            }

            toast.success('Schema saved successfully');
        } catch (error) {
            console.error('Error saving schema:', error);
            toast.error('Failed to save schema');
        }
    }, [nodes, edges, params]);

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
                <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span className="font-medium">Loading schema...</span>
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen={false}>
            <ShadcnSidebar collapsible="icon">
                <EditorSidebar
                    nodes={nodesWithCallbacks}
                    edges={edges}
                    onSelectTable={(id: string) => handleTableClick(id)}
                    onRemoveConnection={(targetTableId: string, foreignKeyField: string) => {
                        // Remove matching edge(s)
                        setEdges((eds) => eds.filter((e) => !(e.target === targetTableId && e.data?.targetField === foreignKeyField)));

                        // Remove FK field and reference entry from target table
                        setNodes((nds) => nds.map((n) => {
                            if (n.id !== targetTableId) return n;
                            const fieldIndex = n.data.fields.findIndex((f) => f.name === foreignKeyField);
                            if (fieldIndex === -1) return n;
                            const updatedFields = n.data.fields.filter((_, idx) => idx !== fieldIndex);
                            const updatedReferences = (n.data.references || []).filter((r) => r.foreignKeyField !== foreignKeyField);
                            return {
                                ...n,
                                data: {
                                    ...n.data,
                                    fields: updatedFields,
                                    references: updatedReferences,
                                },
                            };
                        }));
                    }}
                />
                {/** Rail removed in hover-to-expand UX */}
            </ShadcnSidebar>
            <SidebarInset className="bg-zinc-950 text-zinc-100 font-mono">
                <header className="sticky top-0 mx-4 mt-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 z-20 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Database className="h-6 w-6 text-white" />
                            <h1 className="text-2xl font-bold">Modeler</h1>
                        </div>
                        <div className="text-sm text-zinc-300 flex gap-6 font-medium">
                            <span className="uppercase tracking-wide">{nodes.length} Table{nodes.length !== 1 ? 's' : ''}</span>
                            <span className="uppercase tracking-wide">{edges.length} Reference{edges.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsAddTableOpen(true)}
                            className="rounded-full bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 font-medium flex items-center gap-2 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Add Table
                        </button>
                        <button
                            onClick={handleSave}
                            className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 font-medium flex items-center gap-2 transition-colors"
                        >
                            <Save className="h-4 w-4" />
                            Save Schema
                        </button>
                    </div>
                </header>
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodesWithCallbacks}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={handleConnect}
                        nodeTypes={nodeTypes}
                        connectionLineType={ConnectionLineType.SmoothStep}
                        fitView
                        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                        className="bg-zinc-950"
                        minZoom={0.2}
                        maxZoom={2}
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            style: {
                                stroke: '#ffffff',
                                strokeWidth: 2,
                            },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: '#ffffff',
                            },
                        }}
                        nodesDraggable={true}
                        nodesConnectable={true}
                        elementsSelectable={true}
                    >
                        <Background color="#3f3f46" gap={20} size={2} />
                        <Controls position="bottom-left" className="bg-zinc-900 text-black pb-[15px]" />
                        <MiniMap
                            nodeColor="#18181b"
                            nodeStrokeColor="#ffffff"
                            nodeBorderRadius={0}
                            maskColor="rgba(0, 0, 0, 0.6)"
                            position="bottom-right"
                            className="bg-zinc-900 border"
                        />
                    </ReactFlow>
                </div>
                <div className="absolute bottom-0 left-0  flex justify-center px-1 py-2 shadow-md bg-zinc-900 w-full z-10">
                    <ul className="flex flex-wrap items-center justify-center gap-4">
                        <li className="flex items-center text-xs font-mono gap-1 text-zinc-300">
                            <Key className="h-4 w-4 flex-shrink-0 text-zinc-300" />
                            Primary key
                        </li>
                        <li className="flex items-center text-xs font-mono gap-1 text-zinc-300">
                            <Hash className="h-4 w-4 flex-shrink-0 text-zinc-300" />
                            Identity
                        </li>
                        <li className="flex items-center text-xs font-mono gap-1 text-zinc-300">
                            <Fingerprint className="h-4 w-4 flex-shrink-0 text-zinc-300" />
                            Unique
                        </li>
                        <li className="flex items-center text-xs font-mono gap-1 text-zinc-300">
                            <Diamond className="h-4 w-4 flex-shrink-0 text-zinc-300" />
                            Nullable
                        </li>
                        <li className="flex items-center text-xs font-mono gap-1 text-zinc-300">
                            <Diamond className="h-4 w-4 flex-shrink-0 text-zinc-300 fill-current" />
                            Non-Nullable
                        </li>
                    </ul>
                </div>
                <AddTableDrawer
                    open={isAddTableOpen}
                    onOpenChange={setIsAddTableOpen}
                    onCreate={handleCreateTableFromDrawer}
                />
            </SidebarInset>
        </SidebarProvider>
    );
}