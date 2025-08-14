import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { TableNodeData } from './types/Field';
import type { Node } from '@xyflow/react';

interface ForeignKeyRelation {
    fieldName: string;
    referencedTable: string;
    referencedField: string;
}

interface ForeignKeyDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (relation: ForeignKeyRelation) => void;
    availableTables: Node<TableNodeData>[];
    existingFieldNames: string[];
    relation?: ForeignKeyRelation | null;
    mode?: 'add' | 'edit';
}

export const ForeignKeyDialog = ({
    isOpen,
    onClose,
    onSave,
    availableTables,
    existingFieldNames,
    relation = null,
    mode = 'add'
}: ForeignKeyDialogProps) => {
    const [fieldName, setFieldName] = useState("");
    const [selectedTable, setSelectedTable] = useState("");
    const [selectedField, setSelectedField] = useState("");

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && relation) {
                setFieldName(relation.fieldName);
                setSelectedTable(relation.referencedTable);
                setSelectedField(relation.referencedField);
            } else {
                setFieldName("");
                setSelectedTable("");
                setSelectedField("");
            }
        }
    }, [isOpen, relation, mode]);

    const selectedTableData = availableTables.find(table => table.data.name === selectedTable);
    const availableFields = selectedTableData?.data.fields.filter(field => field.primary) || [];

    const handleTableChange = (tableName: string) => {
        setSelectedTable(tableName);
        setSelectedField(""); // Reset field selection when table changes
    };

    const handleFieldChange = (fieldName: string) => {
        setSelectedField(fieldName);
        
        // Auto-generate field name based on selected table and field
        if (selectedTable && fieldName) {
            const suggestedName = `${selectedTable.toLowerCase()}_${fieldName}`;
            setFieldName(suggestedName);
        }
    };

    const validateRelation = (): string[] => {
        const errors: string[] = [];

        if (!fieldName.trim()) {
            errors.push("Field name is required");
        } else if (mode === 'add' && existingFieldNames.includes(fieldName.trim())) {
            errors.push("Field name must be unique");
        } else if (mode === 'edit' && relation && existingFieldNames.includes(fieldName.trim()) && fieldName.trim() !== relation.fieldName) {
            errors.push("Field name must be unique");
        }

        if (!selectedTable) {
            errors.push("Referenced table is required");
        }

        if (!selectedField) {
            errors.push("Referenced field is required");
        }

        return errors;
    };

    const handleSave = () => {
        const validationErrors = validateRelation();
        if (validationErrors.length > 0) {
            toast.error(validationErrors.join('\n'));
            return;
        }

        const newRelation: ForeignKeyRelation = {
            fieldName: fieldName.trim(),
            referencedTable: selectedTable,
            referencedField: selectedField,
        };

        onSave(newRelation);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-zinc-900 text-zinc-100 rounded-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-zinc-100">
                        {mode === 'edit' ? 'Edit Foreign Key' : 'Add Foreign Key'}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-300 text-sm">
                        {mode === 'edit'
                            ? 'Modify the foreign key relationship.'
                            : 'Create a reference to another table.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Referenced Table */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-zinc-200">
                            Referenced Table
                        </Label>
                        <Select value={selectedTable} onValueChange={handleTableChange}>
                            <SelectTrigger className="bg-zinc-800 border border-zinc-600 text-zinc-100">
                                <SelectValue placeholder="Select table" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white">
                                {availableTables.map((table) => (
                                    <SelectItem key={table.id} value={table.data.name} className="text-zinc-100">
                                        {table.data.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Referenced Field */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-zinc-200">
                            Referenced Field
                        </Label>
                        <Select
                            value={selectedField}
                            onValueChange={handleFieldChange}
                            disabled={!selectedTable}
                        >
                            <SelectTrigger className="bg-zinc-800 border border-zinc-600 text-zinc-100 disabled:opacity-50">
                                <SelectValue placeholder={selectedTable ? "Select field" : "Select table first"} />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white">
                                {availableFields.map((field) => (
                                    <SelectItem key={field.name} value={field.name} className="text-zinc-100">
                                        <span className="font-mono">{field.name}</span> ({field.type})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Field Name */}
                    <div className="space-y-2">
                        <Label htmlFor="field-name" className="text-sm font-medium text-zinc-200">
                            Field Name
                        </Label>
                        <Input
                            className="bg-zinc-800 border border-zinc-600 text-zinc-100"
                            id="field-name"
                            value={fieldName}
                            onChange={(e) => setFieldName(e.target.value)}
                            placeholder="user_id"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <div className="flex gap-3 w-full">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="flex-1"
                        >
                            {mode === 'edit' ? 'Update' : 'Add'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};