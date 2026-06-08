import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { executeSchemaUpdate, EditorSchemaState, setUIState } from '../slices/editorSlice';
import type { Node, Edge, MarkerType } from '@xyflow/react';
import type { TableNodeData, Field, TableReference } from '@/components/editor/nodes/types/Field';

// Thunks to replace the command pattern in useUndo

export const createTableThunk = createAsyncThunk(
    'editor/createTable',
    (
        payload: {
            id: string;
            name: string;
            fields: Field[];
            position: { x: number; y: number };
            references?: TableReference[];
            color?: string;
            newEdges?: Edge[];
        },
        { getState, dispatch }
    ) => {
        const state = getState() as RootState;
        const currentSchema = state.editor.schema.present;

        const newNode: Node<TableNodeData> = {
            id: payload.id,
            type: 'table',
            position: payload.position,
            data: {
                name: payload.name,
                fields: payload.fields,
                references: payload.references || [],
                color: payload.color,
            },
        };

        const newSchema: EditorSchemaState = {
            ...currentSchema,
            nodes: [...currentSchema.nodes, newNode],
            edges: [...currentSchema.edges, ...(payload.newEdges || [])],
            nextTableId: currentSchema.nextTableId + 1,
        };

        dispatch(executeSchemaUpdate(newSchema));
    }
);

export const deleteTableThunk = createAsyncThunk(
    'editor/deleteTable',
    (tableId: string, { getState, dispatch }) => {
        const state = getState() as RootState;
        const currentSchema = state.editor.schema.present;
        const tableData = currentSchema.nodes.find((n) => n.id === tableId);
        
        if (!tableData) return;

        // Remove foreign key fields from other tables
        const updatedNodes = currentSchema.nodes
            .filter((n) => n.id !== tableId)
            .map((node) => {
                const updatedFields = node.data.fields.filter(
                    (field) => !(field.foreign && field.referencedTable === tableData.data.name)
                );
                const updatedReferences = (node.data.references || []).filter(
                    (ref) => ref.sourceTableId !== tableId
                );

                if (
                    updatedFields.length !== node.data.fields.length ||
                    updatedReferences.length !== (node.data.references || []).length
                ) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            fields: updatedFields,
                            references: updatedReferences,
                        },
                    };
                }
                return node;
            });

        const newSchema: EditorSchemaState = {
            ...currentSchema,
            nodes: updatedNodes,
            edges: currentSchema.edges.filter(
                (e) => e.source !== tableId && e.target !== tableId
            ),
        };

        dispatch(executeSchemaUpdate(newSchema));
    }
);

export const updateTableThunk = createAsyncThunk(
    'editor/updateTable',
    (
        payload: { tableId: string; newData: Partial<TableNodeData> },
        { getState, dispatch }
    ) => {
        const state = getState() as RootState;
        const currentSchema = state.editor.schema.present;
        const targetNode = currentSchema.nodes.find((n) => n.id === payload.tableId);
        if (!targetNode) return;

        const oldTableName = targetNode.data.name;
        const newTableName = payload.newData.name;
        const isTableNameChanged = newTableName && newTableName !== oldTableName;

        let updatedNodes = [...currentSchema.nodes];
        let updatedEdges = [...currentSchema.edges];

        // 1. Update the target node itself
        updatedNodes = updatedNodes.map((node) => {
            if (node.id === payload.tableId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...payload.newData,
                    },
                };
            }
            return node;
        });

        // 2. Cascade table name changes
        if (isTableNameChanged) {
            updatedEdges = updatedEdges.map((edge) => {
                let changed = false;
                const newEdgeData = { ...(edge.data as any) };
                if (edge.source === payload.tableId) {
                    newEdgeData.sourceTable = newTableName;
                    changed = true;
                }
                if (edge.target === payload.tableId) {
                    newEdgeData.targetTable = newTableName;
                    changed = true;
                }
                if (changed) {
                    return { ...edge, data: newEdgeData };
                }
                return edge;
            });

            updatedNodes = updatedNodes.map((node) => {
                if (node.id === payload.tableId) return node; // already updated

                let nodeChanged = false;
                const newFields = node.data.fields.map((field) => {
                    if (field.foreign && field.referencedTable === oldTableName) {
                        nodeChanged = true;

                        let newFieldName = field.name;
                        const oldDefaultFkName = `${oldTableName.toLowerCase()}_id`;
                        const newDefaultFkName = `${newTableName!.toLowerCase()}_id`;

                        if (field.name.toLowerCase() === oldDefaultFkName) {
                            newFieldName = newDefaultFkName;
                        } else if (field.name.includes(oldTableName)) {
                            newFieldName = field.name.replace(oldTableName, newTableName!);
                        } else if (field.name.includes(oldTableName.toLowerCase())) {
                            newFieldName = field.name.replace(
                                oldTableName.toLowerCase(),
                                newTableName!.toLowerCase()
                            );
                        } else {
                            newFieldName = newDefaultFkName;
                        }

                        if (newFieldName !== field.name) {
                            updatedEdges = updatedEdges.map((edge) => {
                                if (
                                    edge.target === node.id &&
                                    (edge.data as any)?.targetField === field.name
                                ) {
                                    return {
                                        ...edge,
                                        data: { ...(edge.data as any), targetField: newFieldName },
                                    };
                                }
                                return edge;
                            });
                        }

                        return { ...field, referencedTable: newTableName, name: newFieldName };
                    }
                    return field;
                });

                if (nodeChanged) {
                    return {
                        ...node,
                        data: { ...node.data, fields: newFields },
                    };
                }
                return node;
            });
        }

        dispatch(
            executeSchemaUpdate({
                ...currentSchema,
                nodes: updatedNodes,
                edges: updatedEdges,
            })
        );
    }
);

export const updateFieldThunk = createAsyncThunk(
    'editor/updateField',
    (
        payload: { tableId: string; fieldIndex: number; updatedField: Field },
        { getState, dispatch }
    ) => {
        const state = getState() as RootState;
        const currentSchema = state.editor.schema.present;
        const targetNode = currentSchema.nodes.find((n) => n.id === payload.tableId);
        if (!targetNode) return;

        let updatedNodes = [...currentSchema.nodes];
        let updatedEdges = [...currentSchema.edges];

        const oldField = targetNode.data.fields[payload.fieldIndex];
        if (!oldField) return;

        const newField = payload.updatedField;
        const nameChanged = oldField.name !== newField.name;
        const typeChanged =
            oldField.type !== newField.type ||
            oldField.length !== newField.length ||
            oldField.precision !== newField.precision ||
            oldField.scale !== newField.scale;

        const oldIsForeign = oldField.foreign || (oldField.constraints?.some(c => c.type === 'foreign_key') ?? false);
        const newIsForeign = newField.foreign || (newField.constraints?.some(c => c.type === 'foreign_key') ?? false);

        // 1. Update the target node itself
        updatedNodes = updatedNodes.map((node) => {
            if (node.id === payload.tableId) {
                const newFields = [...node.data.fields];
                newFields[payload.fieldIndex] = newField;
                return {
                    ...node,
                    data: {
                        ...node.data,
                        fields: newFields,
                    },
                };
            }
            return node;
        });

        // 2. Cascade field changes
        if (nameChanged || typeChanged) {
            const outgoingEdges = currentSchema.edges.filter((e) => e.source === payload.tableId);
            const relatedEdges = outgoingEdges.filter(
                (e) => (e.data as any)?.sourceField === oldField.name
            );

            if (relatedEdges.length > 0) {
                relatedEdges.forEach((edge) => {
                    if (nameChanged) {
                        updatedEdges = updatedEdges.map((e) => {
                            if (e.id === edge.id) {
                                return {
                                    ...e,
                                    data: { ...(e.data as any), sourceField: newField.name },
                                };
                            }
                            return e;
                        });
                    }

                    updatedNodes = updatedNodes.map((node) => {
                        if (node.id === edge.target) {
                            const targetFieldName = (edge.data as any)?.targetField;
                            let nodeChanged = false;
                            const updatedTargetFields = node.data.fields.map((tf) => {
                                if (tf.name === targetFieldName) {
                                    nodeChanged = true;
                                    const changedTF = { ...tf };
                                    if (nameChanged) changedTF.referencedField = newField.name;
                                    if (typeChanged) {
                                        changedTF.type = newField.type;
                                        changedTF.length = newField.length;
                                        changedTF.precision = newField.precision;
                                        changedTF.scale = newField.scale;
                                    }
                                    return changedTF;
                                }
                                return tf;
                            });

                            if (nodeChanged) {
                                return {
                                    ...node,
                                    data: { ...node.data, fields: updatedTargetFields },
                                };
                            }
                        }
                        return node;
                    });
                });
            }
        }

        // 3. Remove relation edge if foreign key constraint was removed or referenced table changed
        if (
            (oldIsForeign && !newIsForeign) ||
            (oldIsForeign && newIsForeign && oldField.referencedTable !== newField.referencedTable)
        ) {
            updatedEdges = updatedEdges.filter(
                (e) => !(e.target === payload.tableId && (e.data as any)?.targetField === oldField.name)
            );
        }

        dispatch(
            executeSchemaUpdate({
                ...currentSchema,
                nodes: updatedNodes,
                edges: updatedEdges,
            })
        );
    }
);

export const createRelationshipThunk = createAsyncThunk(
    'editor/createRelationship',
    (
        payload: { edge: Edge; foreignKeyField?: Field; targetTableId?: string },
        { getState, dispatch }
    ) => {
        const state = getState() as RootState;
        const currentSchema = state.editor.schema.present;
        let updatedNodes = currentSchema.nodes;

        if (payload.foreignKeyField && payload.targetTableId) {
            updatedNodes = currentSchema.nodes.map((node) => {
                if (node.id === payload.targetTableId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            fields: [...node.data.fields, payload.foreignKeyField as Field],
                        },
                    };
                }
                return node;
            });
        }

        dispatch(
            executeSchemaUpdate({
                ...currentSchema,
                nodes: updatedNodes,
                edges: [...currentSchema.edges, payload.edge],
            })
        );
    }
);

export const deleteRelationshipThunk = createAsyncThunk(
    'editor/deleteRelationship',
    (
        payload: { edge: Edge; foreignKeyField?: Field; targetTableId?: string },
        { getState, dispatch }
    ) => {
        const state = getState() as RootState;
        const currentSchema = state.editor.schema.present;
        let updatedNodes = currentSchema.nodes;

        if (payload.foreignKeyField && payload.targetTableId) {
            updatedNodes = currentSchema.nodes.map((node) => {
                if (node.id === payload.targetTableId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            fields: node.data.fields.filter(
                                (f) => f.name !== payload.foreignKeyField!.name
                            ),
                        },
                    };
                }
                return node;
            });
        }

        dispatch(
            executeSchemaUpdate({
                ...currentSchema,
                nodes: updatedNodes,
                edges: currentSchema.edges.filter((e) => e.id !== payload.edge.id),
            })
        );
    }
);
