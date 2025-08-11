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
import { Edit2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { FieldDialog } from "./nodes/FieldDialog";
import { Field } from "./nodes/types/Field";

interface AddTableDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (table: { name: string; fields: Field[] }) => void;
}

export function AddTableDrawer({ open, onOpenChange, onCreate }: AddTableDrawerProps) {
    const [tableName, setTableName] = useState<string>("");
    const [fields, setFields] = useState<Field[]>([]);
    const [showFieldDialog, setShowFieldDialog] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

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
        onCreate({ name, fields });
        onOpenChange(false);
    };

    const editingField = editingIndex !== null ? fields[editingIndex] : null;

    return (
        <Drawer open={open} onOpenChange={onOpenChange} direction="right">
            <DrawerContent className="bg-zinc-900 text-zinc-100 border-l border-zinc-700 min-w-[650px] max-w-2xl h-full fixed right-0 top-0 rounded-none hide-scrollbar">
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
                        <div className="grid grid-cols-12 gap-2 px-3 pt-2 text-xs font-medium ">
                            <div className="col-span-3">Name</div>
                            <div className="col-span-2">Type</div>
                            <div className="col-span-3">Default Value</div>
                            <div className="col-span-2">Primary</div>
                            <div className="col-span-2">Actions</div>
                        </div>

                        {/* Fields List */}
                        <div className="space-y-1">
                            {fields.map((f, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center px-3 py-3  rounded group">
                                    <div className="col-span-3">
                                        <span className="font-mono text-sm text-white">{f.name}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-sm text-zinc-300">{f.type}</span>
                                        {f.length && <span className="text-zinc-500 text-xs">({f.length})</span>}
                                        {f.precision !== undefined && f.scale !== undefined && (
                                            <span className="text-zinc-500 text-xs">({f.precision},{f.scale})</span>
                                        )}
                                    </div>
                                    <div className="col-span-3">
                                        <span className="text-sm text-zinc-400 font-mono">
                                            {f.defaultValue || (f.nullable ? 'NULL' : '—')}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        {f.primary && (
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 ml-4  text-green-600 bg-zinc-700 border-zinc-600 rounded"
                                            />
                                        )}
                                    </div>
                                    <div className="col-span-2 flex items-center gap-1 ">
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
                            ))}
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
                        <Label className="text-sm font-medium text-zinc-200">Foreign keys</Label>
                        <Button
                            variant="ghost"
                            className="w-full border-2 border-dashed border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-300 h-12"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add foreign key relation
                        </Button>
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
            </DrawerContent>
        </Drawer>
    );
}