"use client";

import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2, LinkIcon, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { FieldDialog } from "./nodes/FieldDialog";
import { ForeignKeyDialog } from "./nodes/ForeignKeyDialog";
import { Field, TableNodeData } from "./nodes/types/Field";
import { ConstraintSelector, legacyFormatToConstraints, constraintsToLegacyFormat } from "./nodes/ConstraintSelector";
import { DataTypeSelector } from "./nodes/DataTypeSelector";
import type { Node } from '@xyflow/react';

interface ForeignKeyRelation {
    fieldName: string;
    referencedTable: string;
    referencedField: string;
}

interface AddTableDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (table: { name: string; fields: Field[]; foreignKeys?: ForeignKeyRelation[] }) => void;
    availableTables?: Node<TableNodeData>[];
}

export function AddTableDrawer({ open, onOpenChange, onCreate, availableTables = [] }: AddTableDrawerProps) {
    const [tableName, setTableName] = useState<string>("");
    const [fields, setFields] = useState<Field[]>([]);
    const [foreignKeys, setForeignKeys] = useState<ForeignKeyRelation[]>([]);
    const [showFieldDialog, setShowFieldDialog] = useState(false);
    const [showForeignKeyDialog, setShowForeignKeyDialog] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingForeignKeyIndex, setEditingForeignKeyIndex] = useState<number | null>(null);

    // Seed default id field on first open
    useEffect(() => {
        if (open) {
            setTableName("");
            setFields([
                {
                    name: "id",
                    type: "uuid",
                    primary: true,
                    unique: true,
                    nullable: false,
                    defaultValue: "gen_random_uuid()",
                },
            ]);
            setForeignKeys([]);
        }
    }, [open]);

    const hasPrimaryKey = useMemo(() => fields.some((f) => f.primary), [fields]);

    const handleAddField = () => {
        setEditingIndex(null);
        setShowFieldDialog(true);
    };

    const handleEditField = (index: number) => {
        setEditingIndex(index);
        setShowFieldDialog(true);
    };

    const handleRemoveField = (index: number) => {
        setFields((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSaveField = (newField: Field) => {
        setFields((prev) => {
            if (editingIndex === null) return [...prev, newField];
            return prev.map((f, i) => (i === editingIndex ? newField : f));
        });
    };


    const handleAddForeignKey = () => {
        setEditingForeignKeyIndex(null);
        setShowForeignKeyDialog(true);
    };

    const handleEditForeignKey = (index: number) => {
        setEditingForeignKeyIndex(index);
        setShowForeignKeyDialog(true);
    };

    const handleRemoveForeignKey = (index: number) => {
        setForeignKeys((prev) => prev.filter((_, i) => i !== index));
    };


    const handleSaveForeignKey = (relation: ForeignKeyRelation) => {
        const referencedTable = availableTables.find(table => table.data.name === relation.referencedTable);
        if (!referencedTable) {
            toast.error("Referenced table not found");
            return;
        }

        const referencedField = referencedTable.data.fields.find(field => field.name === relation.referencedField);
        if (!referencedField) {
            toast.error("Referenced field not found");
            return;
        }

        // Create the foreign key field
        const foreignKeyField: Field = {
            name: relation.fieldName,
            type: referencedField.type,
            length: referencedField.length,
            precision: referencedField.precision,
            scale: referencedField.scale,
            primary: false,
            nullable: true,
            foreign: true,
            unique: false,
            referencedTable: relation.referencedTable,
            referencedField: relation.referencedField,
        };

        if (editingForeignKeyIndex === null) {
            // Add new foreign key
            setForeignKeys((prev) => [...prev, relation]);
            setFields((prev) => [...prev, foreignKeyField]);
        } else {
            // Edit existing foreign key
            const oldRelation = foreignKeys[editingForeignKeyIndex];
            setForeignKeys((prev) => prev.map((fk, i) => (i === editingForeignKeyIndex ? relation : fk)));

            // Update the corresponding field
            setFields((prev) => prev.map((field) => {
                if (field.name === oldRelation.fieldName && field.foreign) {
                    return foreignKeyField;
                }
                return field;
            }));
        }
    };

    const handleCreate = () => {
        const name = tableName.trim();
        if (!name) {
            toast.error("Table name is required");
            return;
        }
        if (!hasPrimaryKey) {
            toast.error("At least one primary key is required");
            return;
        }
        onCreate({ name, fields, foreignKeys });
        onOpenChange(false);
    };

    const editingField = editingIndex !== null ? fields[editingIndex] : null;
    const editingForeignKey = editingForeignKeyIndex !== null ? foreignKeys[editingForeignKeyIndex] : null;
    const existingFieldNames = fields.map(f => f.name);

    return (
        <Drawer open={open} onOpenChange={onOpenChange} direction="right">
            <DrawerContent className="bg-zinc-900 text-zinc-100 border-l border-zinc-700 min-w-[750px] max-w-2xl h-full fixed right-0 top-0 rounded-none hide-scrollbar">
                <DrawerHeader className="border-b border-zinc-700 px-6">
                    <DrawerTitle className="text-xl text-white font-medium">Create a new table</DrawerTitle>
                </DrawerHeader>

                <div className="flex-1 px-6 py-6 space-y-8 overflow-y-auto">
                    {/* Table Name Section */}
                    <div className="space-y-3">
                        <Label htmlFor="table-name" className="text-sm font-medium text-zinc-200">Name</Label>
                        <Input
                            id="table-name"
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            placeholder="Enter table name"
                            className="bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-zinc-500 h-10"
                        />
                    </div>

                    {/* Description Section (Optional) */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-zinc-200">Description</Label>
                        <Input
                            placeholder="Optional"
                            className="bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-zinc-500 h-10"
                        />
                    </div>



                    {/* Columns Section */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium text-zinc-200">Columns</Label>

                        {/* Column Headers */}
                        <div className="grid grid-cols-12 gap-2 px-3 pt-2 text-xs font-medium text-zinc-400">
                            <div className="col-span-2">Name</div>
                            <div className="col-span-2">Type</div>
                            <div className="col-span-3">Constraints</div>
                            <div className="col-span-3">Default Value</div>
                            <div className="col-span-2">Actions</div>
                        </div>

                        {/* Fields List */}
                        <div className="space-y-1">
                            {fields.map((f, i) => {
                                // Convert legacy constraints to new format for display
                                const currentConstraints = f.constraints
                                    ? f.constraints.map(c => c.type)
                                    : legacyFormatToConstraints(f);

                                return (
                                    <div key={i} className="grid grid-cols-12 gap-2 items-start px-3 py-3 rounded group hover:bg-zinc-800/50 min-h-[3rem]">
                                        {/* Name Column */}
                                        <div className="col-span-2 flex items-center gap-1 min-w-0">
                                            <span className={`font-mono text-sm break-all ${f.foreign ? 'text-blue-400' : 'text-white'}`}>
                                                {f.name}
                                            </span>
                                        </div>

                                        {/* Type Column with inline editing */}
                                        <div className="col-span-2">
                                            <DataTypeSelector
                                                value={f.type.replace('[]', '')}
                                                length={f.length}
                                                precision={f.precision}
                                                scale={f.scale}
                                                onChange={(type, length, precision, scale) => {
                                                    const arrayType = f.type.includes('[]') ? `${type}[]` : type;
                                                    setFields((prev) => prev.map((field, index) =>
                                                        index === i ? {
                                                            ...field,
                                                            type: arrayType,
                                                            length,
                                                            precision,
                                                            scale
                                                        } : field
                                                    ));
                                                }}
                                                compact
                                            />
                                        </div>

                                        {/* Constraints Column */}
                                        <div className="col-span-3">
                                            {f.foreign ? (
                                                // For foreign key fields, only show FK icon and nullable option
                                                <div className="flex items-center gap-1">
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 border border-blue-600 text-blue-300 rounded text-xs">
                                                        <LinkIcon className="h-3 w-3" />

                                                    </div>
                                                    {f.nullable && (
                                                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-900/30 border border-gray-600 text-gray-300 rounded text-xs">
                                                            <span>Nullable</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <ConstraintSelector
                                                    value={currentConstraints}
                                                    onChange={(constraints) => {
                                                        const legacyConstraints = constraintsToLegacyFormat(constraints);
                                                        setFields((prev) => prev.map((field, index) =>
                                                            index === i ? {
                                                                ...field,
                                                                ...legacyConstraints,
                                                                constraints: constraints.map(type => ({ type }))
                                                            } : field
                                                        ));
                                                    }}
                                                    className="text-xs"
                                                    excludeForeignKey
                                                />
                                            )}
                                        </div>

                                        {/* Default Value Column with text wrapping */}
                                        <div className="col-span-3 min-w-0">
                                            <div className="text-sm text-zinc-400 font-mono break-all overflow-wrap-anywhere">
                                                {f.defaultValue || (f.nullable ? 'NULL' : '—')}
                                            </div>
                                        </div>

                                        {/* Actions Column */}
                                        <div className="col-span-2 flex items-center gap-1 justify-end">
                                            <Button
                                                size="sm"
                                                onClick={() => handleEditField(i)}
                                                className="h-7 w-7 p-0 hover:bg-zinc-700"
                                            >
                                                <Edit2 className="h-3 w-3 text-zinc-400" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleRemoveField(i)}
                                                className="h-7 w-7 p-0 hover:bg-zinc-700 hover:text-red-400"
                                            >
                                                <Trash2 className="h-3 w-3 text-zinc-400" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Column Button */}
                        <Button
                            variant="ghost"
                            onClick={handleAddField}
                            className="w-full border-2 border-dashed border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-300 h-12"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add column
                        </Button>
                    </div>

                    {/* Foreign Keys Section */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium text-zinc-200">Foreign Keys</Label>

                        {/* Foreign Keys List */}
                        {foreignKeys.length > 0 && (
                            <div className="space-y-2">
                                {foreignKeys.map((fk, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-zinc-800 border border-zinc-700 rounded">
                                        <div className="flex-1">
                                            <div className="text-sm font-mono text-white">{fk.fieldName}</div>
                                            <div className="text-xs text-zinc-400">
                                                References {fk.referencedTable}.{fk.referencedField}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm"
                                                onClick={() => handleEditForeignKey(index)}
                                                className="h-7 w-7 p-0 hover:bg-zinc-700"
                                            >
                                                <Edit2 className="h-3 w-3 text-zinc-400" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleRemoveForeignKey(index)}
                                                className="h-7 w-7 p-0 hover:bg-zinc-700 hover:text-red-400"
                                            >
                                                <Trash2 className="h-3 w-3 text-zinc-400" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Foreign Key Button */}
                        <Button
                            variant="ghost"
                            onClick={handleAddForeignKey}
                            disabled={availableTables.length === 0}
                            className="w-full border-2 border-dashed border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-300 h-12 disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Foreign Key
                        </Button>

                        {availableTables.length === 0 && (
                            <div className="text-center text-zinc-500 text-sm py-4">
                                No tables available to reference
                            </div>
                        )}
                    </div>
                </div>

                <DrawerFooter className="border-t border-zinc-700 px-6 py-4">
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="px-4 py-2 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white"
                        >
                            Save
                        </Button>
                    </div>
                </DrawerFooter>

                <FieldDialog
                    isOpen={showFieldDialog}
                    onClose={() => setShowFieldDialog(false)}
                    onSave={handleSaveField}
                    field={editingField}
                    existingFields={fields}
                    mode={editingIndex === null ? "add" : "edit"}
                />

                <ForeignKeyDialog
                    isOpen={showForeignKeyDialog}
                    onClose={() => setShowForeignKeyDialog(false)}
                    onSave={handleSaveForeignKey}
                    availableTables={availableTables}
                    existingFieldNames={existingFieldNames}
                    relation={editingForeignKey}
                    mode={editingForeignKeyIndex === null ? "add" : "edit"}
                />

            </DrawerContent>
        </Drawer>
    );
}