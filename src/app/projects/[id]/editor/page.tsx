"use client";
import { AddTableDrawer } from '@/components/editor/AddTableDrawer';
import { TableNode, TableNodeProps } from '@/components/editor/nodes/TableNode';
import { Field, TableNodeData } from '@/components/editor/nodes/types/Field';
import { EditorSidebar } from '@/components/editor/Sidebar';
import { ValidationDialog } from '@/components/editor/ValidationDialog';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { Sidebar as ShadcnSidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import {
    CreateRelationshipCommand,
    CreateTableCommand,
    DeleteRelationshipCommand,
    DeleteTableCommand,
    MoveTableCommand,
    UpdateTableCommand,
    useUndo,
} from '@/hooks/useUndo';
import { validateSchema, ValidationResult } from '@/lib/validation';
import { SignedOut, SignInButton } from '@clerk/nextjs';
import {
    applyEdgeChanges,
    applyNodeChanges,
    Background,
    Connection,
    ConnectionLineType,
    Controls,
    Edge,
    EdgeChange,
    MarkerType,
    MiniMap,
    Node,
    NodeChange,
    ReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { BadgeCheck, Database, Diamond, Download, Fingerprint, Hash, Key, Keyboard, LinkIcon, Plus, Redo, Save, Undo } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

const nodeTypes = {
    table: (props: TableNodeProps) => <TableNode {...props} />,
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

    const [isLoading, setIsLoading] = useState(true);
    const [isAddTableOpen, setIsAddTableOpen] = useState(false);
    const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
    const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
    const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
    const [projectName, setProjectName] = useState<string>('Untitled Project');

    // Initialize the undo system
    const {
        state,
        executeCommand,
        undo,
        redo,
        canUndo,
        canRedo,
        updateState
    } = useUndo({
        nodes: [],
        edges: [],
        nextTableId: 1
    });

    const { nodes, edges, nextTableId } = state;

    // Get selected table for delete operations
    const selectedTable = useMemo(() => {
        return nodes.find(node => node.selected);
    }, [nodes]);

    // Export schema function
    const handleExportSchema = useCallback(() => {
        const schemaData = {
            nodes,
            edges,
            metadata: {
                exportedAt: new Date().toISOString(),
                version: '1.0.0',
            },
        };

        const dataStr = JSON.stringify(schemaData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `schema-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Schema exported successfully');
    }, [nodes, edges]);

    // Validation function
    const handleValidateSchema = useCallback(() => {
        const results = validateSchema(nodes);
        setValidationResults(results);
    }, [nodes]);

    // Run validation whenever nodes change
    useEffect(() => {
        if (nodes.length > 0) {
            const results = validateSchema(nodes);
            setValidationResults(results);
        }
    }, [nodes]);


    // Cancel operation function
    const handleCancelOperation = useCallback(() => {
        // Close any open modals/drawers
        setIsAddTableOpen(false);
        setIsShortcutsModalOpen(false);

        // Clear any selections
        const clearedNodes = nodes.map(node => ({ ...node, selected: false }));
        updateState({ ...state, nodes: clearedNodes });
    }, [nodes, state, updateState]);

    // Load schema data
    useEffect(() => {
        const loadParams = async () => {
            const unwrappedParams = await params;
            setIsLoading(true);
            try {
                const response = await fetch(`/api/projects/${unwrappedParams.id}`);
                if (!response.ok) throw new Error('Failed to load schema');

                const project = await response.json();
                // Set the project name
                setProjectName(project.name || 'Untitled Project');

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

                    const processedEdges = (savedEdges || []) as Edge<ReferenceEdgeData>[];
                    const maxId = Math.max(
                        0,
                        ...processedNodes.map((node: Node<TableNodeData>) => parseInt(node.id.split('-')[1] || '0'))
                    );

                    updateState({
                        nodes: processedNodes,
                        edges: processedEdges,
                        nextTableId: maxId + 1
                    });

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
    }, [params, updateState]);

    // Handle node changes (like dragging)
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        const positionChanges = changes.filter(change => change.type === 'position' && change.dragging === false);

        if (positionChanges.length > 0) {
            // Create undo commands for position changes
            positionChanges.forEach(change => {
                if (change.type === 'position' && change.position) {
                    const moveCommand = new MoveTableCommand(
                        change.id,
                        change.position
                    );
                    executeCommand(moveCommand);
                }
            });
        } else {
            // Apply other changes directly (like selection)
            const newNodes = applyNodeChanges(changes, nodes) as Node<TableNodeData>[];
            updateState({ ...state, nodes: newNodes });
        }
    }, [nodes, state, executeCommand, updateState]);

    // Handle edge changes
    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        const newEdges = applyEdgeChanges(changes, edges);
        updateState({ ...state, edges: newEdges });
    }, [edges, state, updateState]);

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

            // Execute create relationship command
            const command = new CreateRelationshipCommand(newEdge, foreignKeyField, destinationTableId);
            executeCommand(command);

            toast.success(`Created foreign key "${foreignKeyFieldName}" in ${destinationTable.data.name}`);
        },
        [nodes, edges, executeCommand]
    );

    const handleTableClick = useCallback(
        (tableId: string) => {
            const newNodes = nodes.map((node) => ({
                ...node,
                selected: node.id === tableId,
            }));
            updateState({ ...state, nodes: newNodes });
        },
        [nodes, state, updateState]
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
            const command = new UpdateTableCommand(tableId, updatedData);
            executeCommand(command);
        },
        [executeCommand]
    );

    const handleRemoveTable = useCallback(
        (tableId: string) => {
            const nodeToDelete = nodes.find((n) => n.id === tableId);
            if (!nodeToDelete) {
                toast.error('Table not found');
                return;
            }

            // Find related edges
            const relatedEdges = edges.filter((e) => e.source === tableId || e.target === tableId);

            const command = new DeleteTableCommand(tableId, nodeToDelete, relatedEdges);
            executeCommand(command);

            toast.success(`Table "${nodeToDelete.data.name}" deleted successfully`);
        },
        [nodes, edges, executeCommand]
    );

    const handleAddField = useCallback(
        (tableId: string, newField: Field) => {
            const currentTable = nodes.find(n => n.id === tableId);
            if (!currentTable) return;

            const updatedData = {
                fields: [...currentTable.data.fields, newField]
            };
            const command = new UpdateTableCommand(tableId, updatedData);
            executeCommand(command);
        },
        [nodes, executeCommand]
    );

    const handleRemoveField = useCallback(
        (tableId: string, fieldIndex: number) => {
            const currentTable = nodes.find(n => n.id === tableId);
            if (!currentTable) return;

            const fieldToRemove = currentTable.data.fields[fieldIndex];
            const updatedFields = currentTable.data.fields.filter((_, index) => index !== fieldIndex);

            // If removing a foreign key field, also remove related edges
            if (fieldToRemove?.foreign) {
                const relatedEdge = edges.find(edge =>
                    edge.target === tableId && edge.data?.targetField === fieldToRemove.name
                );

                if (relatedEdge) {
                    const deleteRelCommand = new DeleteRelationshipCommand(relatedEdge, fieldToRemove, tableId);
                    executeCommand(deleteRelCommand);
                    toast.success(`Removed foreign key "${fieldToRemove.name}" and its relationship`);
                    return;
                }
            }

            const updatedData = {
                fields: updatedFields,
                references: (currentTable.data.references || []).filter(
                    (ref) => ref.foreignKeyField !== fieldToRemove?.name
                )
            };
            const command = new UpdateTableCommand(tableId, updatedData);
            executeCommand(command);
        },
        [nodes, edges, executeCommand]
    );

    const handleUpdateField = useCallback(
        (tableId: string, fieldIndex: number, updatedField: Field) => {
            const currentTable = nodes.find(n => n.id === tableId);
            if (!currentTable) return;

            const updatedFields = currentTable.data.fields.map((field, idx) =>
                idx === fieldIndex ? updatedField : field
            );
            const updatedData = { fields: updatedFields };
            const command = new UpdateTableCommand(tableId, updatedData);
            executeCommand(command);
        },
        [nodes, executeCommand]
    );

    const nodesWithCallbacks = useMemo(() => {
        return nodes.map((node) => {
            // Get validation errors for this specific node
            const nodeErrors = validationResults?.errors.filter(e => e.nodeId === node.id) || [];

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
                validationErrors: nodeErrors
            };
        });
    }, [nodes, handleUpdateTable, handleRemoveTable, handleAddField, handleRemoveField, handleUpdateField, handleTableClick, validationResults]);

    const MAX_TABLES = 50;
    const handleCreateTableFromDrawer = useCallback((table: { name: string; fields: Field[]; foreignKeys?: Array<{ fieldName: string; referencedTable: string; referencedField: string }> }) => {
        if (nodes.length >= MAX_TABLES) {
            toast.error(`Cannot add more than ${MAX_TABLES} tables`);
            return;
        }

        const name = table.name.trim();
        if (!name) {
            toast.error('Table name is required');
            return;
        }
        const isNameUnique = !nodes.some((node) => node.data.name === name);
        if (!isNameUnique) {
            toast.error('Table name must be unique');
            return;
        }

        const newTableId = `table-${nextTableId}`;
        const position = {
            x: Math.random() * window.innerWidth * 0.5 + window.innerWidth * 0.1,
            y: Math.random() * window.innerHeight * 0.5 + window.innerHeight * 0.1,
        };

        const tableData = {
            id: newTableId,
            name,
            fields: table.fields,
            position,
            references: table.foreignKeys?.map(fk => {
                const sourceTable = nodes.find(n => n.data.name === fk.referencedTable);
                return {
                    sourceTableId: sourceTable?.id || '',
                    sourceTableName: fk.referencedTable,
                    foreignKeyField: fk.fieldName,
                    referencedField: fk.referencedField,
                };
            })
        };

        // Create edges for foreign key relationships
        const newEdges: Edge<ReferenceEdgeData>[] = [];
        if (table.foreignKeys && table.foreignKeys.length > 0) {
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
        }

        const command = new CreateTableCommand(tableData, newEdges);
        executeCommand(command);

        if (newEdges.length > 0) {
            toast.success(`Table "${name}" created with ${newEdges.length} foreign key relationship(s)`);
        } else {
            toast.success(`Table "${name}" created`);
        }
    }, [nodes, nextTableId, executeCommand]);

    // Delete selected table function
    const handleDeleteSelected = useCallback(() => {
        if (selectedTable) {
            handleRemoveTable(selectedTable.id);
        } else {
            toast('No table selected for deletion', {
                icon: 'ℹ️',
            });
        }
    }, [selectedTable, handleRemoveTable]);
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
    // Keyboard shortcuts integration - must be after all function definitions
    useKeyboardShortcuts({
        onNewTable: () => setIsAddTableOpen(true),
        onDeleteSelected: handleDeleteSelected,
        onSave: handleSave,
        onExportSchema: handleExportSchema,
        onUndo: undo,
        onRedo: redo,
        onCancelOperation: handleCancelOperation,
        onShowShortcutsHelp: () => setIsShortcutsModalOpen(true),
    });

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
                        // Find the edge and field to remove
                        const edgeToRemove = edges.find(e =>
                            e.target === targetTableId && e.data?.targetField === foreignKeyField
                        );
                        const targetTable = nodes.find(n => n.id === targetTableId);
                        const fieldToRemove = targetTable?.data.fields.find(f => f.name === foreignKeyField);

                        if (edgeToRemove && fieldToRemove) {
                            const command = new DeleteRelationshipCommand(edgeToRemove, fieldToRemove, targetTableId);
                            executeCommand(command);
                        }
                    }}
                />
                {/** Rail removed in hover-to-expand UX */}
            </ShadcnSidebar>
            <ValidationDialog
                isOpen={isValidationDialogOpen}
                onClose={() => setIsValidationDialogOpen(false)}
                onSelectTable={(id: string) => {
                    handleTableClick(id);
                    setIsValidationDialogOpen(false);
                }}
                validationResults={validationResults || undefined}
            />
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

                    {/* Project Name in the center */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 text-xl font-semibold text-zinc-100">
                        {projectName}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Keyboard Shortcuts Help Button */}
                        <button
                            onClick={() => setIsShortcutsModalOpen(true)}
                            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white p-2 transition-colors"
                            title="Show keyboard shortcuts (Ctrl+H)"
                        >
                            <Keyboard className="h-4 w-4" />
                        </button>

                        {/* Validate Schema Button */}
                        <button
                            onClick={() => {
                                handleValidateSchema();
                                setIsValidationDialogOpen(true);
                            }}
                            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white p-2 transition-colors"
                            title="Validate schema"
                        >
                            <BadgeCheck className="h-4 w-4" />
                        </button>

                        {/* Export Schema Button */}
                        <button
                            onClick={handleExportSchema}
                            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white p-2 transition-colors"
                            title="Export schema (Shift+E)"
                        >
                            <Download className="h-4 w-4" />
                        </button>

                        {/* Undo/Redo Buttons */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={undo}
                                disabled={!canUndo}
                                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 text-white p-2 transition-colors"
                                title="Undo (Shift+Z)"
                            >
                                <Undo className="h-4 w-4" />
                            </button>
                            <button
                                onClick={redo}
                                disabled={!canRedo}
                                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 text-white p-2 transition-colors"
                                title="Redo (Shift+Y)"
                            >
                                <Redo className="h-4 w-4" />
                            </button>
                        </div>

                        <button
                            onClick={() => setIsAddTableOpen(true)}
                            className="rounded-full bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 font-medium flex items-center gap-2 transition-colors"
                            title="Add new table (Shift+N)"
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
                        {/* Save Schema button removed */}
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

                <KeyboardShortcutsModal
                    isOpen={isShortcutsModalOpen}
                    onClose={() => setIsShortcutsModalOpen(false)}
                />
            </SidebarInset>
        </SidebarProvider>
    );
}