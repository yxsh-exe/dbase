import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { POSTGRESQL_TYPES } from './constants/postgresTypes';
import { Field } from './types/Field';
import { toast } from 'react-hot-toast';

type DefaultOption = { label: string; value: string };

function getDefaultOptionsForType(
    type: string,
    isEnum: boolean,
    enumValuesStr: string,
): DefaultOption[] {
    const t = (type || '').toLowerCase();
    const options: DefaultOption[] = [];

    // Always include None as the first option
    options.push({ label: 'None', value: '__none__' });

    if (isEnum) {
        const values = enumValuesStr
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
        for (const v of values) {
            options.push({ label: v, value: `'${v.replace(/'/g, "''")}'` });
        }
        options.push({ label: 'Custom…', value: '__custom__' });
        return options;
    }

    switch (t) {
        // Date/Time
        case 'timestamp':
        case 'timestamptz':
            options.push({ label: 'now()', value: 'now()' });
            options.push({ label: 'CURRENT_TIMESTAMP', value: 'CURRENT_TIMESTAMP' });
            options.push({ label: 'Epoch (1970-01-01)', value: `'1970-01-01 00:00:00'::timestamp` });
            break;
        case 'date':
            options.push({ label: 'CURRENT_DATE', value: 'CURRENT_DATE' });
            options.push({ label: 'Today (now()::date)', value: 'now()::date' });
            options.push({ label: 'Epoch (1970-01-01)', value: `'1970-01-01'::date` });
            break;
        case 'time':
            options.push({ label: 'CURRENT_TIME', value: 'CURRENT_TIME' });
            options.push({ label: 'now()::time', value: 'now()::time' });
            break;
        case 'timetz':
            options.push({ label: 'CURRENT_TIME', value: 'CURRENT_TIME' });
            options.push({ label: 'now()::timetz', value: 'now()::timetz' });
            break;

        // Boolean
        case 'bool':
        case 'boolean':
            options.push({ label: 'true', value: 'true' });
            options.push({ label: 'false', value: 'false' });
            break;

        // UUID
        case 'uuid':
            options.push({ label: 'gen_random_uuid()', value: 'gen_random_uuid()' });
            options.push({ label: 'uuid_generate_v4()', value: 'uuid_generate_v4()' });
            break;

        // Numeric
        case 'int2':
        case 'int4':
        case 'int8':
        case 'integer':
        case 'bigint':
            options.push({ label: '0', value: '0' });
            options.push({ label: '1', value: '1' });
            break;
        case 'float4':
        case 'float8':
        case 'double':
        case 'real':
        case 'numeric':
        case 'decimal':
            options.push({ label: '0', value: '0' });
            options.push({ label: '1', value: '1' });
            break;

        // Text/Character
        case 'text':
        case 'varchar':
        case 'char':
            options.push({ label: "Empty string ''", value: "''" });
            options.push({ label: "'N/A'", value: "'N/A'" });
            break;

        // JSON
        case 'json':
            options.push({ label: 'Empty object {}', value: `'{}'::json` });
            options.push({ label: 'Empty array []', value: `'[]'::json` });
            break;
        case 'jsonb':
            options.push({ label: 'Empty object {}', value: `'{}'::jsonb` });
            options.push({ label: 'Empty array []', value: `'[]'::jsonb` });
            break;

        // Binary
        case 'bytea':
            options.push({ label: 'Empty bytea', value: `'\\x'` });
            break;
    }

    options.push({ label: 'Custom…', value: '__custom__' });
    return options;
}

interface FieldDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (field: Field) => void;
    field?: Field | null;
    existingFields: Field[];
    mode?: 'add' | 'edit';
}

export const FieldDialog = ({
    isOpen,
    onClose,
    onSave,
    field = null,
    existingFields,
    mode = 'add'
}: FieldDialogProps) => {
    const [fieldName, setFieldName] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Character");
    const [selectedType, setSelectedType] = useState("varchar");
    const [length, setLength] = useState("");
    const [precision, setPrecision] = useState("");
    const [scale, setScale] = useState("");
    const [isPrimary, setIsPrimary] = useState(false);
    const [isUnique, setIsUnique] = useState(false);
    const [isNullable, setIsNullable] = useState(true);
    const [defaultValue, setDefaultValue] = useState("");
    const [checkConstraint, setCheckConstraint] = useState("");
    const [enumValues, setEnumValues] = useState("");
    const [isEnum, setIsEnum] = useState(false);
    // errors handled via toast notifications

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && field) {
                setFieldName(field.name);
                setIsEnum(field.type === 'enum');
                if (field.type === 'enum') {
                    setEnumValues(field.enumValues?.join(', ') || '');
                } else {
                    setSelectedType(field.type);
                    const category = Object.entries(POSTGRESQL_TYPES).find(([, types]) =>
                        types.includes(field.type)
                    )?.[0] || 'Character';
                    setSelectedCategory(category);
                }
                setLength(field.length?.toString() || '');
                setPrecision(field.precision?.toString() || '');
                setScale(field.scale?.toString() || '');
                setIsPrimary(!!field.primary);
                setIsUnique(!!field.unique);
                setIsNullable(field.nullable !== false);
                setDefaultValue(field.defaultValue || '');
                setCheckConstraint(field.check || '');
            } else {
                setFieldName("");
                setSelectedType("varchar");
                setLength("");
                setPrecision("");
                setScale("");
                setIsPrimary(false);
                setIsUnique(false);
                setIsNullable(true);
                setDefaultValue("");
                setCheckConstraint("");
                setEnumValues("");
                setIsEnum(false);
            }
            // reset handled values above; errors shown via toast
        }
    }, [isOpen, field, mode]);

    const validateField = (): string[] => {
        const newErrors: string[] = [];

        if (!fieldName.trim()) {
            newErrors.push("Field name is required");
        } else if (mode === 'add' && existingFields.some(f => f.name === fieldName.trim())) {
            newErrors.push("Field name must be unique");
        } else if (mode === 'edit' && field && existingFields.some(f => f.name === fieldName.trim() && f.name !== field.name)) {
            newErrors.push("Field name must be unique");
        }

        if (isEnum && !enumValues.trim()) {
            newErrors.push("Enum values are required for enum type");
        }

        return newErrors;
    };

    const handleSave = () => {
        const validationErrors = validateField();
        if (validationErrors.length > 0) {
            toast.error(validationErrors.join('\n'));
            return;
        }

        const newField: Field = {
            name: fieldName.trim(),
            type: isEnum ? "enum" : selectedType,
            primary: isPrimary,
            unique: isUnique || isPrimary,
            nullable: isPrimary ? false : isNullable,
            ...(length && { length: parseInt(length) }),
            ...(precision && { precision: parseInt(precision) }),
            ...(scale && { scale: parseInt(scale) }),
            ...(defaultValue && { defaultValue }),
            ...(checkConstraint && { check: checkConstraint }),
            ...(isEnum && enumValues && { enumValues: enumValues.split(',').map(v => v.trim()) })
        };

        onSave(newField);
        onClose();
    };

    const needsLength = ["varchar"].includes(selectedType);
    const needsPrecisionScale = ["numeric"].includes(selectedType);
    const presetOptions = getDefaultOptionsForType(selectedType, isEnum, enumValues);
    const presetValue = defaultValue
        ? (presetOptions.find(o => o.value === defaultValue)?.value ?? '__custom__')
        : '__none__';

    const handleDefaultPresetChange = (value: string) => {
        if (value === '__none__') {
            setDefaultValue('');
            return;
        }
        if (value === '__custom__') {
            // leave current value as-is, focus will be on input
            return;
        }
        setDefaultValue(value);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg  bg-zinc-900 text-zinc-100  rounded-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-zinc-100 uppercase tracking-wide">
                        {mode === 'edit' ? 'Edit Field' : 'Create Field'}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-300 text-sm mt-2">
                        {mode === 'edit'
                            ? 'Modify the field properties below.'
                            : 'Define your field properties and constraints.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 max-h-[60vh] overflow-y-auto hide-scrollbar">
                    <div className="space-y-6">
                        {/* Field Name */}
                        <div className="space-y-2">
                            <Label htmlFor="field-name" className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">
                                Field Name
                            </Label>
                            <Input
                                className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 placeholder:text-zinc-400 focus:border-white rounded-none"
                                id="field-name"
                                value={fieldName}
                                onChange={(e) => setFieldName(e.target.value)}
                                placeholder="field_name"
                            />
                        </div>

                        {/* Data Type Selection */}
                        <div className="space-y-4">
                            <Label className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">Data Type</Label>
                            <Tabs value={isEnum ? "enum" : "standard"} onValueChange={(value) => setIsEnum(value === "enum")} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 bg-zinc-800 border-2 border-zinc-600 rounded-none">
                                    <TabsTrigger
                                        value="standard"
                                        className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-100 font-medium uppercase tracking-wide rounded-none"
                                    >
                                        Standard
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="enum"
                                        className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-100 font-medium uppercase tracking-wide rounded-none"
                                    >
                                        Enum
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="standard" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-zinc-100">Category</Label>
                                            <Select
                                                value={selectedCategory}
                                                onValueChange={(value) => {
                                                    setSelectedCategory(value);
                                                    setSelectedType(POSTGRESQL_TYPES[value as keyof typeof POSTGRESQL_TYPES][0]);
                                                }}
                                            >
                                                <SelectTrigger className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 focus:border-white rounded-none">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-2 border-white rounded-none">
                                                    {Object.keys(POSTGRESQL_TYPES).map(category => (
                                                        <SelectItem key={category} value={category} className="text-zinc-100 focus:bg-zinc-800 rounded-none">
                                                            {category}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-zinc-100">Type</Label>
                                            <Select value={selectedType} onValueChange={setSelectedType}>
                                                <SelectTrigger className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 focus:border-white rounded-none">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-2 border-white rounded-none">
                                                    {POSTGRESQL_TYPES[selectedCategory as keyof typeof POSTGRESQL_TYPES].map(type => (
                                                        <SelectItem key={type} value={type} className="text-zinc-100 focus:bg-zinc-800 rounded-none">
                                                            {type}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Type-specific options */}
                                    {(needsLength || needsPrecisionScale) && (
                                        <div className="grid grid-cols-3 gap-3">
                                            {needsLength && (
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium text-zinc-100">Length</Label>
                                                    <Input
                                                        type="number"
                                                        value={length}
                                                        onChange={(e) => setLength(e.target.value)}
                                                        placeholder="255"
                                                        className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 placeholder:text-zinc-400 focus:border-white rounded-none"
                                                    />
                                                </div>
                                            )}
                                            {needsPrecisionScale && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium text-zinc-100">Precision</Label>
                                                        <Input
                                                            type="number"
                                                            value={precision}
                                                            onChange={(e) => setPrecision(e.target.value)}
                                                            placeholder="10"
                                                            className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 placeholder:text-zinc-400 focus:border-white rounded-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium text-zinc-100">Scale</Label>
                                                        <Input
                                                            type="number"
                                                            value={scale}
                                                            onChange={(e) => setScale(e.target.value)}
                                                            placeholder="2"
                                                            className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 placeholder:text-zinc-400 focus:border-white rounded-none"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="enum" className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-zinc-100">Enum Values</Label>
                                        <Textarea
                                            value={enumValues}
                                            onChange={(e) => setEnumValues(e.target.value)}
                                            placeholder="active, inactive, pending"
                                            rows={3}
                                            className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 placeholder:text-zinc-400 focus:border-white resize-none rounded-none"
                                        />
                                        <p className="text-xs text-zinc-400">Separate values with commas</p>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Constraints */}
                        <div className="space-y-4">
                            <Label className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">Constraints</Label>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3 p-3 bg-zinc-800 border border-zinc-700">
                                    <Checkbox
                                        id="primary-key"
                                        checked={isPrimary}
                                        onCheckedChange={(checked) => {
                                            setIsPrimary(!!checked);
                                            if (checked) {
                                                setIsNullable(false);
                                                setIsUnique(true);
                                            }
                                        }}
                                        className="border-2 border-zinc-500 data-[state=checked]:bg-white data-[state=checked]:border-white rounded-none"
                                    />
                                    <div>
                                        <Label htmlFor="primary-key" className="text-sm font-medium text-zinc-100">Primary Key</Label>
                                        <p className="text-xs text-zinc-400">Unique identifier</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center space-x-3 p-3 bg-zinc-800 border border-zinc-700">
                                        <Checkbox
                                            id="unique"
                                            checked={isUnique}
                                            onCheckedChange={(checked) => setIsUnique(!!checked)}
                                            className="border-2 border-zinc-500 data-[state=checked]:bg-white data-[state=checked]:border-white rounded-none"
                                        />
                                        <div>
                                            <Label htmlFor="unique" className="text-sm font-medium text-zinc-100">Unique</Label>
                                            <p className="text-xs text-zinc-400">No duplicates</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3 p-3 bg-zinc-800 border border-zinc-700">
                                        <Checkbox
                                            id="nullable"
                                            checked={isNullable}
                                            disabled={isPrimary}
                                            onCheckedChange={(checked) => setIsNullable(!!checked)}
                                            className="border-2 border-zinc-500 data-[state=checked]:bg-white data-[state=checked]:border-white disabled:opacity-50 rounded-none"
                                        />
                                        <div>
                                            <Label htmlFor="nullable" className="text-sm font-medium text-zinc-100">Nullable</Label>
                                            <p className="text-xs text-zinc-400">Allow null</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Options */}
                        <div className="space-y-4">
                            <Label className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">Advanced</Label>
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-zinc-300">Default (preset)</Label>
                                    <Select value={presetValue} onValueChange={handleDefaultPresetChange}>
                                        <SelectTrigger className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 focus:border-white rounded-none">
                                            <SelectValue placeholder="Choose a preset" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-2 border-white rounded-none">
                                            {presetOptions.map((opt) => (
                                                <SelectItem key={opt.label + opt.value} value={opt.value} className="text-zinc-100 focus:bg-zinc-800 rounded-none">
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="default-value" className="text-xs font-medium text-zinc-300">Default Value</Label>
                                    <Input
                                        id="default-value"
                                        value={defaultValue}
                                        onChange={(e) => setDefaultValue(e.target.value)}
                                        placeholder="now(), gen_random_uuid()"
                                        className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 placeholder:text-zinc-400 focus:border-white text-sm rounded-none"
                                    />
                                    <p className="text-[10px] text-zinc-500">Use SQL literals (e.g., &apos;text&apos;, 0, true) or functions (e.g., now(), gen_random_uuid()).</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="check-constraint" className="text-xs font-medium text-zinc-300">Check Constraint</Label>
                                    <Input
                                        id="check-constraint"
                                        value={checkConstraint}
                                        onChange={(e) => setCheckConstraint(e.target.value)}
                                        placeholder="price > 0"
                                        className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 placeholder:text-zinc-400 focus:border-white text-sm rounded-none"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <DialogFooter className="border-t border-zinc-700 pt-4">
                    <div className="flex gap-3 w-full">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 bg-zinc-800 border-2 border-zinc-600 text-zinc-100 hover:bg-zinc-700 font-medium uppercase tracking-wide rounded-none"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="flex-1 bg-white hover:bg-zinc-200 text-black font-medium uppercase tracking-wide rounded-none"
                        >
                            {mode === 'edit' ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};