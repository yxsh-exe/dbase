'use client';

import React, { useEffect, useCallback, use, useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { EditorSidebar } from '@/components/editor/Sidebar';
import { ValidationDialog } from '@/components/editor/ValidationDialog';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { redirect } from 'next/navigation';
import { useSession } from '@/components/AuthProvider';
import { validateSchema } from '@/lib/validation';
import { toast } from 'react-hot-toast';
import { ReactFlowProvider } from '@xyflow/react';

// Extracted Components
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { EditorHotkeys } from '@/components/editor/EditorHotkeys';

// Redux
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUIState, initializeSchema, updateSchemaDirectly } from '@/store/slices/editorSlice';

export default function ModernSchemaEditor({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use
    const unwrappedParams = use(params);
    const dispatch = useAppDispatch();
    
    // UI Selectors
    const isLoading = useAppSelector(state => state.editor.ui.isLoading);
    const isValidationDialogOpen = useAppSelector(state => state.editor.ui.isValidationDialogOpen);
    const isShortcutsModalOpen = useAppSelector(state => state.editor.ui.isShortcutsModalOpen);
    const projectName = useAppSelector(state => state.editor.ui.projectName);
    const validationErrors = useAppSelector(state => state.editor.ui.validationErrors);
    
    // Schema Selectors
    const nodes = useAppSelector(state => state.editor.schema.present.nodes);
    const edges = useAppSelector(state => state.editor.schema.present.edges);

    const { data: session } = useSession();

    // Initial load
    useEffect(() => {
        const loadProject = async () => {
            dispatch(setUIState({ isLoading: true }));
            try {
                const response = await fetch(`/api/projects/${unwrappedParams.id}`);
                if (!response.ok) throw new Error('Failed to load schema');

                const project = await response.json();
                
                dispatch(setUIState({
                    projectName: project.name || 'Untitled Project',
                    projectType: project.type || null,
                }));

                if (project.schema) {
                    const { nodes: savedNodes, edges: savedEdges } = project.schema;

                    const processedNodes = savedNodes.map((node: any) => ({
                        ...node,
                        type: 'table',
                        data: {
                            ...node.data,
                            color: node.data.color,
                            fields: node.data.fields.map((field: any) => ({
                                ...field,
                                primary: !!field.primary,
                                nullable: field.nullable !== false,
                                foreign: !!field.foreign,
                                unique: !!field.unique,
                            })),
                        },
                    }));

                    const processedEdges = (savedEdges || []).map((edge: any) => ({
                        ...edge,
                        type: 'relation'
                    }));

                    const maxId = Math.max(
                        0,
                        ...processedNodes.map((node: any) => parseInt(node.id.split('-')[1] || '0'))
                    );

                    dispatch(initializeSchema({
                        nodes: processedNodes,
                        edges: processedEdges,
                        nextTableId: maxId + 1,
                    }));
                }
            } catch (error) {
                console.error('Error loading schema:', error);
                toast.error('Failed to load schema');
            } finally {
                dispatch(setUIState({ isLoading: false }));
            }
        };
        loadProject();
    }, [unwrappedParams.id, dispatch]);

    // Validation
    const handleValidateSchema = useCallback(() => {
        const results = validateSchema(nodes);
        dispatch(setUIState({ validationErrors: results?.errors || [] }));
        dispatch(setUIState({ isValidationDialogOpen: true }));
    }, [nodes, dispatch]);

    // Export
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

    // Save
    const handleSave = useCallback(async () => {
        try {
            const response = await fetch(`/api/projects/${unwrappedParams.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: projectName,
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

            toast.success('Project saved successfully');
        } catch (error) {
            console.error('Error saving schema:', error);
            toast.error('Failed to save schema');
        }
    }, [nodes, edges, unwrappedParams.id, projectName]);

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
                <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="text-sm font-medium text-zinc-400">Loading schema...</span>
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen={true}>
            <ValidationDialog
                isOpen={isValidationDialogOpen}
                onClose={() => dispatch(setUIState({ isValidationDialogOpen: false }))}
                onSelectTable={(id: string) => {
                    const newNodes = nodes.map(n => ({ ...n, selected: n.id === id }));
                    dispatch(updateSchemaDirectly({ nodes: newNodes }));
                    dispatch(setUIState({ isValidationDialogOpen: false }));
                }}
                validationResults={{ errors: validationErrors || [], warnings: [] } as any}
            />

            <KeyboardShortcutsModal
                isOpen={isShortcutsModalOpen}
                onClose={() => dispatch(setUIState({ isShortcutsModalOpen: false }))}
            />

            <EditorHotkeys 
                onSave={handleSave} 
                onExportSchema={handleExportSchema} 
            />

            {/* Floating sidebar — self-contained, overlaid on canvas */}
            <EditorSidebar />

            <div className="flex flex-col w-full h-screen bg-zinc-950 text-zinc-100">
                <EditorToolbar 
                    projectId={unwrappedParams.id}
                    onValidateSchema={handleValidateSchema}
                    onExportSchema={handleExportSchema}
                />

                <ReactFlowProvider>
                    <EditorCanvas />
                </ReactFlowProvider>
            </div>
        </SidebarProvider>
    );
}