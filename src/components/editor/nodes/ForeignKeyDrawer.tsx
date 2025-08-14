"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Key, ArrowRight, Database, Link, AlertTriangle, Info } from 'lucide-react';
import type { TableNodeData } from './types/Field';
import type { Node } from '@xyflow/react';

export interface EnhancedForeignKeyRelation {
    fieldName: string;
    sourceTable: string;
    sourceField: string;
    destinationTable: string;
    destinationField: string;
    constraintName?: string;
    onUpdate: 'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'NO_ACTION';
    onDelete: 'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'NO_ACTION';
    deferrable?: boolean;
}

interface ForeignKeyDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (relation: EnhancedForeignKeyRelation) => void;
    availableTables: Node<TableNodeData>[];
    existingFieldNames: string[];
    relation?: EnhancedForeignKeyRelation | null;
    mode?: 'add' | 'edit';
    currentTableName?: string;
}

const cascadeOptions = [
    { value: 'CASCADE', label: 'CASCADE', description: 'Delete/update related records automatically' },
    { value: 'SET_NULL', label: 'SET NULL', description: 'Set foreign key to NULL' },
    { value: 'RESTRICT', label: 'RESTRICT', description: 'Prevent delete/update if references exist' },
    { value: 'NO_ACTION', label: 'NO ACTION', description: 'Check constraint at end of statement' }
];

export function ForeignKeyDrawer({
    isOpen,
    onClose,
    onSave,
    availableTables,
    existingFieldNames,
    relation = null,
    mode = 'add',
    currentTableName = 'new table'
}: ForeignKeyDrawerProps) {
    const [fieldName, setFieldName] = useState('');
    const [sourceTable, setSourceTable] = useState('');
    const [sourceField, setSourceField] = useState('');
    const [destinationTable, setDestinationTable] = useState(currentTableName);
    const [destinationField, setDestinationField] = useState('');
    const [constraintName, setConstraintName] = useState('');
    const [onUpdate, setOnUpdate] = useState<'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'NO_ACTION'>('CASCADE');
    const [onDelete, setOnDelete] = useState<'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'NO_ACTION'>('CASCADE');
    const [deferrable, setDeferrable] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const resetForm = useCallback(() => {
        setFieldName('');
        setSourceTable('');
        setSourceField('');
        setDestinationTable(currentTableName);
        setDestinationField('');
        setConstraintName('');
        setOnUpdate('CASCADE');
        setOnDelete('CASCADE');
        setDeferrable(false);
    }, [currentTableName]);

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && relation) {
                setFieldName(relation.fieldName);
                setSourceTable(relation.sourceTable);
                setSourceField(relation.sourceField);
                setDestinationTable(relation.destinationTable);
                setDestinationField(relation.destinationField);
                setConstraintName(relation.constraintName || '');
                setOnUpdate(relation.onUpdate);
                setOnDelete(relation.onDelete);
                setDeferrable(relation.deferrable || false);
            } else {
                resetForm();
            }
            setValidationErrors([]);
        }
    }, [isOpen, relation, mode, resetForm]);

    const selectedSourceTable = availableTables.find(table => table.data.name === sourceTable);
    const availableSourceFields = selectedSourceTable?.data.fields.filter(field => field.primary || field.unique) || [];


    const handleSourceTableChange = (tableName: string) => {
        setSourceTable(tableName);
        setSourceField(''); // Reset field selection when table changes

        // Auto-generate field name suggestion
        if (tableName && !fieldName) {
            const suggestedName = `${tableName.toLowerCase()}_id`;
            setFieldName(suggestedName);
        }

        // Auto-generate constraint name
        if (tableName && destinationTable) {
            const constraintSuggestion = `fk_${destinationTable.toLowerCase()}_${tableName.toLowerCase()}`;
            setConstraintName(constraintSuggestion);
        }
    };

    const handleSourceFieldChange = (fieldName: string) => {
        setSourceField(fieldName);

        // Auto-suggest destination field name based on source
        if (fieldName && sourceTable) {
            const suggestedDestName = `${sourceTable.toLowerCase()}_${fieldName}`;
            setDestinationField(suggestedDestName);
        }
    };

    const validateRelation = (): string[] => {
        const errors: string[] = [];

        if (!fieldName.trim()) {
            errors.push('Foreign key field name is required');
        } else if (mode === 'add' && existingFieldNames.includes(fieldName.trim())) {
            errors.push('Field name must be unique');
        } else if (mode === 'edit' && relation && existingFieldNames.includes(fieldName.trim()) && fieldName.trim() !== relation.fieldName) {
            errors.push('Field name must be unique');
        }

        if (!sourceTable) {
            errors.push('Source table must be selected');
        }

        if (!sourceField) {
            errors.push('Source field must be selected');
        }

        if (!destinationTable) {
            errors.push('Destination table must be selected');
        }

        if (sourceTable === destinationTable) {
            errors.push('Source and destination tables cannot be the same');
        }

        // Check for circular references (basic check)
        if (sourceTable && destinationTable) {
            const sourceTableNode = availableTables.find(t => t.data.name === sourceTable);
            const hasExistingReference = sourceTableNode?.data.fields.some(field =>
                field.foreign && field.referencedTable === destinationTable
            );

            if (hasExistingReference) {
                errors.push('This would create a circular reference');
            }
        }

        return errors;
    };

    const handleSave = () => {
        const errors = validateRelation();
        setValidationErrors(errors);

        if (errors.length > 0) {
            toast.error('Please fix validation errors before saving');
            return;
        }

        const newRelation: EnhancedForeignKeyRelation = {
            fieldName: fieldName.trim(),
            sourceTable,
            sourceField,
            destinationTable,
            destinationField: destinationField.trim(),
            constraintName: constraintName.trim() || undefined,
            onUpdate,
            onDelete,
            deferrable
        };

        onSave(newRelation);
        onClose();
        toast.success(mode === 'edit' ? 'Foreign key updated successfully' : 'Foreign key created successfully');
    };

    const getFieldTypeInfo = (table: Node<TableNodeData>, fieldName: string) => {
        const field = table.data.fields.find(f => f.name === fieldName);
        return field ? {
            type: field.type,
            length: field.length,
            precision: field.precision,
            scale: field.scale
        } : null;
    };

    return (
        <Drawer open={isOpen} onOpenChange={onClose} direction="right">
            <DrawerContent className="bg-zinc-900 text-zinc-100 border-l border-zinc-700 min-w-[700px] max-w-4xl h-full fixed right-0 top-0 rounded-none">
                <DrawerHeader className="border-b border-zinc-700 px-6">
                    <DrawerTitle className="text-xl text-white font-medium flex items-center gap-2">
                        <Link className="w-5 h-5" />
                        {mode === 'edit' ? 'Edit Foreign Key Relationship' : 'Create Foreign Key Relationship'}
                    </DrawerTitle>
                </DrawerHeader>

                <div className="flex-1 px-6 py-6 space-y-8 overflow-y-auto">
                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                        <Card className="border-red-600 bg-red-900/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-red-400 flex items-center gap-2 text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    Validation Errors
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <ul className="text-red-300 text-sm space-y-1">
                                    {validationErrors.map((error, index) => (
                                        <li key={index} className="flex items-center gap-2">
                                            <div className="w-1 h-1 bg-red-400 rounded-full" />
                                            {error}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Relationship Overview */}
                    <Card className="border-zinc-700 bg-zinc-800/50">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Foreign Key Relationship
                            </CardTitle>
                            <CardDescription className="text-zinc-400">
                                Create a reference from {destinationTable || 'destination table'} to {sourceTable || 'source table'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-zinc-700/50 rounded-lg">
                                <div className="text-center">
                                    <div className="text-sm text-zinc-400 mb-1">Source (Referenced)</div>
                                    <Badge variant="outline" className="bg-blue-900/30 border-blue-600 text-blue-300">
                                        <Database className="w-3 h-3 mr-1" />
                                        {sourceTable || 'Select table'}
                                    </Badge>
                                    {sourceField && (
                                        <div className="text-xs text-zinc-500 mt-1">
                                            <Key className="w-3 h-3 inline mr-1" />
                                            {sourceField}
                                        </div>
                                    )}
                                </div>
                                <ArrowRight className="w-6 h-6 text-zinc-400" />
                                <div className="text-center">
                                    <div className="text-sm text-zinc-400 mb-1">Destination (Referencing)</div>
                                    <Badge variant="outline" className="bg-green-900/30 border-green-600 text-green-300">
                                        <Database className="w-3 h-3 mr-1" />
                                        {destinationTable}
                                    </Badge>
                                    {fieldName && (
                                        <div className="text-xs text-zinc-500 mt-1">
                                            <Link className="w-3 h-3 inline mr-1" />
                                            {fieldName}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Source Table Selection */}
                    <Card className="border-zinc-700 bg-zinc-800/50">
                        <CardHeader>
                            <CardTitle className="text-white">Source Table (Referenced)</CardTitle>
                            <CardDescription className="text-zinc-400">
                                Select the table and field that will be referenced by the foreign key
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-zinc-200">Table</Label>
                                    <Select value={sourceTable} onValueChange={handleSourceTableChange}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                                            <SelectValue placeholder="Select source table" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white">
                                            {availableTables.filter(table => table.data.name !== destinationTable).map((table) => (
                                                <SelectItem key={table.id} value={table.data.name} className="text-zinc-100 focus:bg-zinc-800">
                                                    <div className="flex items-center gap-2">
                                                        <Database className="w-4 h-4" />
                                                        {table.data.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-zinc-200">Primary/Unique Key Field</Label>
                                    <Select
                                        value={sourceField}
                                        onValueChange={handleSourceFieldChange}
                                        disabled={!sourceTable}
                                    >
                                        <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white disabled:opacity-50">
                                            <SelectValue placeholder={sourceTable ? "Select field" : "Select table first"} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white">
                                            {availableSourceFields.map((field) => (
                                                <SelectItem key={field.name} value={field.name} className="text-zinc-100 focus:bg-zinc-800">
                                                    <div className="flex items-center gap-2">
                                                        <Key className="w-3 h-3 text-yellow-400" />
                                                        <span>{field.name}</span>
                                                        <Badge variant="outline" className="ml-2 text-xs">
                                                            {field.type}
                                                        </Badge>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedSourceTable && availableSourceFields.length === 0 && (
                                        <p className="text-xs text-red-400">No primary or unique key fields found</p>
                                    )}
                                </div>
                            </div>

                            {/* Field Type Info */}
                            {selectedSourceTable && sourceField && (
                                <div className="p-3 bg-zinc-700/30 border border-zinc-600 rounded-lg">
                                    <div className="text-xs font-medium text-zinc-300 mb-1">Field Details</div>
                                    {(() => {
                                        const typeInfo = getFieldTypeInfo(selectedSourceTable, sourceField);
                                        return typeInfo ? (
                                            <div className="text-xs text-zinc-400 space-y-1">
                                                <p>Type: <span className="text-zinc-200">{typeInfo.type}</span></p>
                                                {typeInfo.length && <p>Length: <span className="text-zinc-200">{typeInfo.length}</span></p>}
                                                {typeInfo.precision && typeInfo.scale && (
                                                    <p>Precision/Scale: <span className="text-zinc-200">{typeInfo.precision},{typeInfo.scale}</span></p>
                                                )}
                                                <p className="text-zinc-500 mt-2">Foreign key field will inherit this type</p>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Destination Configuration */}
                    <Card className="border-zinc-700 bg-zinc-800/50">
                        <CardHeader>
                            <CardTitle className="text-white">Destination Configuration</CardTitle>
                            <CardDescription className="text-zinc-400">
                                Configure the foreign key field in the destination table
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-zinc-200">Foreign Key Field Name</Label>
                                <Input
                                    value={fieldName}
                                    onChange={(e) => setFieldName(e.target.value)}
                                    placeholder="e.g., user_id, category_id"
                                    className="bg-zinc-800 border-zinc-600 text-white"
                                />
                                <p className="text-xs text-zinc-400">This field will be created in {destinationTable}</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-zinc-200">Constraint Name (Optional)</Label>
                                <Input
                                    value={constraintName}
                                    onChange={(e) => setConstraintName(e.target.value)}
                                    placeholder="Auto-generated if empty"
                                    className="bg-zinc-800 border-zinc-600 text-white"
                                />
                                <p className="text-xs text-zinc-400">Custom name for the foreign key constraint</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Referential Actions */}
                    <Card className="border-zinc-700 bg-zinc-800/50">
                        <CardHeader>
                            <CardTitle className="text-white">Referential Actions</CardTitle>
                            <CardDescription className="text-zinc-400">
                                Define what happens when referenced data is updated or deleted
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-zinc-200">On Update</Label>
                                    <Select value={onUpdate} onValueChange={(value: 'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'NO_ACTION') => setOnUpdate(value)}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white">
                                            {cascadeOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value} className="text-zinc-100 focus:bg-zinc-800">
                                                    <div>
                                                        <div className="font-medium">{option.label}</div>
                                                        <div className="text-xs text-zinc-400">{option.description}</div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-zinc-200">On Delete</Label>
                                    <Select value={onDelete} onValueChange={(value: 'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'NO_ACTION') => setOnDelete(value)}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white">
                                            {cascadeOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value} className="text-zinc-100 focus:bg-zinc-800">
                                                    <div>
                                                        <div className="font-medium">{option.label}</div>
                                                        <div className="text-xs text-zinc-400">{option.description}</div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <DrawerFooter className="border-t border-zinc-700 px-6 py-4">
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="px-4 py-2 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {mode === 'edit' ? 'Update Relationship' : 'Create Relationship'}
                        </Button>
                    </div>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}