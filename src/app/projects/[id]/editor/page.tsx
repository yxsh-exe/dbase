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
import { Database, LinkIcon, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import { TableNode } from '@/components/editor/nodes/TableNode';
import { Field, TableNodeData } from '@/components/editor/nodes/types/Field';
import { AddTableDrawer } from '@/components/editor/AddTableDrawer';
import { Key, Hash, Fingerprint, Diamond } from 'lucide-react';
import { EditorSidebar } from '@/components/editor/Sidebar';
import { SidebarProvider, Sidebar as ShadcnSidebar, SidebarInset } from '@/components/ui/sidebar';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

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

            if (!nodeToDelete) {
                toast.error('Table not found');
                return;
            }

            // Collect information about what will be cleaned up
            const cleanupSummary = {
                removedFields: [] as string[],
                removedReferences: [] as string[],
                affectedTables: [] as string[]
            };

            // 1) Remove the node itself and cascade-clean remaining nodes
            setNodes((existingNodes) => {
                const remainingNodes = existingNodes.filter((n) => n.id !== tableId);

                return remainingNodes.map((n) => {
                    let updatedFields = n.data.fields;
                    let updatedReferences = n.data.references || [];
                    let hasChanges = false;

                    // Remove references pointing to the deleted source table
                    const foreignKeyFieldsToRemove = new Set<string>();
                    const originalReferencesLength = updatedReferences.length;
                    
                    updatedReferences = updatedReferences.filter((ref) => {
                        const shouldRemove =
                            ref.sourceTableId === tableId ||
                            (deletedTableName ? ref.sourceTableName === deletedTableName : false);
                        if (shouldRemove) {
                            foreignKeyFieldsToRemove.add(ref.foreignKeyField);
                            cleanupSummary.removedReferences.push(`${n.data.name}.${ref.foreignKeyField} → ${deletedTableName}`);
                        }
                        return !shouldRemove;
                    });

                    if (updatedReferences.length !== originalReferencesLength) {
                        hasChanges = true;
                    }

                    // Remove FK fields that correspond to removed references
                    if (foreignKeyFieldsToRemove.size > 0) {
                        const originalFieldsLength = updatedFields.length;
                        updatedFields = updatedFields.filter((f) => {
                            const shouldRemove = foreignKeyFieldsToRemove.has(f.name);
                            if (shouldRemove) {
                                cleanupSummary.removedFields.push(`${n.data.name}.${f.name}`);
                            }
                            return !shouldRemove;
                        });
                        
                        if (updatedFields.length !== originalFieldsLength) {
                            hasChanges = true;
                        }
                    }

                    // Safety: also remove any FK fields that explicitly reference the deleted table by name
                    if (deletedTableName) {
                        const fieldsBeforeCleanup = updatedFields.length;
                        updatedFields = updatedFields.filter((f) => {
                            const shouldRemove = f.foreign && f.referencedTable === deletedTableName;
                            if (shouldRemove) {
                                cleanupSummary.removedFields.push(`${n.data.name}.${f.name} (orphaned FK)`);
                            }
                            return !shouldRemove;
                        });

                        if (updatedFields.length !== fieldsBeforeCleanup) {
                            hasChanges = true;
                        }
                    }

                    // Enhanced constraint cleanup - remove foreign key constraints that reference deleted table
                    updatedFields = updatedFields.map(field => {
                        if (field.constraints) {
                            const originalConstraints = field.constraints.length;
                            const cleanedConstraints = field.constraints.filter(constraint => {
                                const shouldRemove = constraint.type === 'foreign_key' &&
                                                   constraint.referencedTable === deletedTableName;
                                if (shouldRemove) {
                                    cleanupSummary.removedReferences.push(`${n.data.name}.${field.name} constraint → ${deletedTableName}`);
                                }
                                return !shouldRemove;
                            });

                            if (cleanedConstraints.length !== originalConstraints) {
                                hasChanges = true;
                                return { ...field, constraints: cleanedConstraints };
                            }
                        }
                        return field;
                    });

                    if (hasChanges && !cleanupSummary.affectedTables.includes(n.data.name)) {
                        cleanupSummary.affectedTables.push(n.data.name);
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
            const removedEdges = edges.filter((edge) => edge.source === tableId || edge.target === tableId);
            setEdges((eds) => eds.filter((edge) => edge.source !== tableId && edge.target !== tableId));

            // 3) Show detailed cleanup summary
            let successMessage = `Table "${deletedTableName}" deleted successfully`;
            if (cleanupSummary.affectedTables.length > 0) {
                successMessage += `\n\nCascade cleanup completed:`;
                
                if (cleanupSummary.removedFields.length > 0) {
                    successMessage += `\n• Removed ${cleanupSummary.removedFields.length} foreign key field(s)`;
                }
                
                if (cleanupSummary.removedReferences.length > 0) {
                    successMessage += `\n• Removed ${cleanupSummary.removedReferences.length} relationship(s)`;
                }
                
                if (removedEdges.length > 0) {
                    successMessage += `\n• Removed ${removedEdges.length} visual connection(s)`;
                }

                successMessage += `\n• Affected tables: ${cleanupSummary.affectedTables.join(', ')}`;
            }

            toast.success(successMessage, { duration: 6000 });
        },
        [nodes, edges, setEdges, setNodes]
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
    const handleCreateTableFromDrawer = useCallback((table: { name: string; fields: Field[]; foreignKeys?: Array<{ fieldName: string; referencedTable: string; referencedField: string }> }) => {
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

        const newTableId = `table-${nextTableId}`;
        const newNode: Node<TableNodeData> = {
            id: newTableId,
            type: 'table',
            position: {
                x: Math.random() * window.innerWidth * 0.5 + window.innerWidth * 0.1,
                y: Math.random() * window.innerHeight * 0.5 + window.innerHeight * 0.1,
            },
            data: {
                name,
                fields: table.fields,
                references: table.foreignKeys?.map(fk => {
                    const sourceTable = nodes.find(n => n.data.name === fk.referencedTable);
                    return {
                        sourceTableId: sourceTable?.id || '',
                        sourceTableName: fk.referencedTable,
                        foreignKeyField: fk.fieldName,
                        referencedField: fk.referencedField,
                    };
                }) || []
            },
        };

        setNodes((nds) => nds.concat(newNode));

        // Create edges for foreign key relationships
        if (table.foreignKeys && table.foreignKeys.length > 0) {
            const newEdges: Edge<ReferenceEdgeData>[] = [];
            
            table.foreignKeys.forEach(fk => {
                const sourceTable = nodes.find(n => n.data.name === fk.referencedTable);
                if (sourceTable) {
                    const newEdge: Edge<ReferenceEdgeData> = {
                        id: `ref-${sourceTable.id}-${newTableId}-${Date.now()}-${fk.fieldName}`,
                        source: sourceTable.id,
                        target: newTableId,
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
                            sourceField: fk.referencedField,
                            targetField: fk.fieldName,
                            sourceTable: fk.referencedTable,
                            targetTable: name,
                            sourceTableId: sourceTable.id,
                            destinationTableId: newTableId,
                            relationship: 'one-to-many',
                            referenceType: 'foreign_key',
                        },
                    };
                    newEdges.push(newEdge);
                }
            });

            if (newEdges.length > 0) {
                setEdges((eds) => [...eds, ...newEdges]);
                toast.success(`Table "${name}" created with ${newEdges.length} foreign key relationship(s)`);
            } else {
                toast.success(`Table "${name}" created`);
            }
        } else {
            toast.success(`Table "${name}" created`);
        }

        setNextTableId((prev) => prev + 1);
    }, [nodes, nextTableId, setNodes, setEdges]);

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
                        <Link href="/" className="flex items-center gap-2 hover:opacity-90">
                            <Database className="h-6 w-6 text-blue-400" />
                            <span className="text-2xl font-bold">DBase</span>
                        </Link>
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
                            <Plus className="h-4 w-4 text-green-400" />
                            Add Table
                        </button>
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 font-medium flex items-center gap-2 transition-colors">
                                    <Save className="h-4 w-4 text-white" />
                                    Log in to save
                                </button>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
                            <button
                                onClick={handleSave}
                                className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 font-medium flex items-center gap-2 transition-colors"
                            >
                                <Save className="h-4 w-4 text-white" />
                                Save Schema
                            </button>
                        </SignedIn>
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
                            <Key className="h-4 w-4 flex-shrink-0 text-yellow-400" />
                            Primary key
                        </li>
                        <li className="flex items-center text-xs font-mono gap-1 text-zinc-300">
                            <LinkIcon className="h-4 w-4 flex-shrink-0 text-blue-400" />
                            Foreign key
                        </li>

                        <li className="flex items-center text-xs font-mono gap-1 text-zinc-300">
                            <Hash className="h-4 w-4 flex-shrink-0 text-green-400" />
                            Identity
                        </li>
                        <li className="flex items-center text-xs font-mono gap-1 text-zinc-300">
                            <Fingerprint className="h-4 w-4 flex-shrink-0 text-purple-400" />
                            Unique
                        </li>
                        <li className="flex items-center text-xs font-mono gap-1 text-zinc-300">
                            <Diamond className="h-4 w-4 flex-shrink-0 text-zinc-300" />
                            Nullable
                        </li>
                        <li className="flex items-center text-xs font-mono gap-1 text-zinc-300">
                            <Diamond className="h-4 w-4 flex-shrink-0 text-red-400 fill-current" />
                            Non-Nullable
                        </li>
                    </ul>
                </div>
                <AddTableDrawer
                    open={isAddTableOpen}
                    onOpenChange={setIsAddTableOpen}
                    onCreate={handleCreateTableFromDrawer}
                    availableTables={nodes}
                />
            </SidebarInset>
        </SidebarProvider>
    );
}