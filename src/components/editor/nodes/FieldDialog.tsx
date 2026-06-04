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
import { Field, ConstraintType } from './types/Field';
import { ConstraintSelector, legacyFormatToConstraints, constraintsToLegacyFormat } from './ConstraintSelector';
import { DataTypeSelector } from './DataTypeSelector';
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
        case 'datetime':
        case 'datetime2':
            options.push({ label: 'Current Timestamp (now() / CURRENT_TIMESTAMP)', value: 'now()' });
            options.push({ label: 'CURRENT_TIMESTAMP', value: 'CURRENT_TIMESTAMP' });
            options.push({ label: 'Epoch (1970-01-01)', value: `'1970-01-01 00:00:00'` });
            break;
        case 'date':
            options.push({ label: 'CURRENT_DATE', value: 'CURRENT_DATE' });
            options.push({ label: 'Today (now()::date)', value: 'now()::date' });
            options.push({ label: 'Epoch (1970-01-01)', value: `'1970-01-01'` });
            break;
        case 'time':
        case 'timetz':
            options.push({ label: 'CURRENT_TIME', value: 'CURRENT_TIME' });
            break;

        // Boolean
        case 'bool':
        case 'boolean':
        case 'bit':
            options.push({ label: 'true', value: 'true' });
            options.push({ label: 'false', value: 'false' });
            break;

        // UUID
        case 'uuid':
        case 'uniqueidentifier':
            options.push({ label: 'Generate UUID (uuid_generate_v4() / UUID())', value: 'uuid_generate_v4()' });
            options.push({ label: 'gen_random_uuid()', value: 'gen_random_uuid()' });
            break;

        // Numeric
        case 'int2':
        case 'int4':
        case 'int8':
        case 'integer':
        case 'bigint':
        case 'smallint':
        case 'int':
            options.push({ label: '0', value: '0' });
            options.push({ label: '1', value: '1' });
            break;
        case 'float4':
        case 'float8':
        case 'double':
        case 'double precision':
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
        case 'nvarchar':
            options.push({ label: "Empty string ''", value: "''" });
            options.push({ label: "'N/A'", value: "'N/A'" });
            break;

        // JSON
        case 'json':
        case 'jsonb':
            options.push({ label: 'Empty object {}', value: `'{}'` });
            options.push({ label: 'Empty array []', value: `'[]'` });
            break;

        // Binary
        case 'bytea':
        case 'blob':
        case 'binary':
            options.push({ label: 'Empty binary', value: `'\\x'` });
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
    const [selectedType, setSelectedType] = useState("text");
    const [length, setLength] = useState("");
    const [precision, setPrecision] = useState("");
    const [scale, setScale] = useState("");
    const [constraints, setConstraints] = useState<ConstraintType[]>([]);
    const [defaultValue, setDefaultValue] = useState("");
    const [checkConstraint, setCheckConstraint] = useState("");
    const [enumValues, setEnumValues] = useState("");
    const [isEnum, setIsEnum] = useState(false);
    const [isArray, setIsArray] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && field) {
                setFieldName(field.name);
                setIsArray(field.type.endsWith('[]'));
                const baseType = field.type.replace('[]', '');
                setIsEnum(baseType === 'enum');
                
                if (baseType === 'enum') {
                    setEnumValues(field.enumValues?.join(', ') || '');
                } else {
                    setSelectedType(baseType);
                }
                
                setLength(field.length?.toString() || '');
                setPrecision(field.precision?.toString() || '');
                setScale(field.scale?.toString() || '');
                setDefaultValue(field.defaultValue || '');
                setCheckConstraint(field.check || '');
                
                // Convert legacy constraints to new format
                const fieldConstraints = field.constraints
                    ? field.constraints.map(c => c.type)
                    : legacyFormatToConstraints(field);
                setConstraints(fieldConstraints);
            } else {
                setFieldName("");
                setSelectedType("text");
                setLength("");
                setPrecision("");
                setScale("");
                setConstraints([]);
                setDefaultValue("");
                setCheckConstraint("");
                setEnumValues("");
                setIsEnum(false);
                setIsArray(false);
            }
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

        const finalType = isEnum ? "enum" : selectedType;
        const typeWithArray = isArray ? `${finalType}[]` : finalType;
        
        // Convert constraints to legacy format for backward compatibility
        const legacyFormat = constraintsToLegacyFormat(constraints);
        
        const newField: Field = {
            name: fieldName.trim(),
            type: typeWithArray,
            // Legacy constraint fields for backward compatibility
            ...legacyFormat,
            // Enhanced constraint system
            constraints: constraints.map(type => ({ type })),
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

    // Utility functions for constraint management moved to component level

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg bg-black text-white border border-white/20 rounded-xl">
                <DialogHeader className="pb-4">
                    <DialogTitle className="text-lg font-semibold text-white">
                        {mode === 'edit' ? 'Edit Field' : 'Create Field'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-300 text-sm">
                        {mode === 'edit'
                            ? 'Modify the field properties below.'
                            : 'Define your field properties and constraints.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Field Name */}
                    <div className="space-y-2">
                        <Label htmlFor="field-name" className="text-sm font-medium text-white">
                            Field Name
                        </Label>
                        <Input
                            className="bg-black border border-white/30 text-white placeholder:text-gray-400 focus:border-white rounded-lg"
                            id="field-name"
                            value={fieldName}
                            onChange={(e) => setFieldName(e.target.value)}
                            placeholder="field_name"
                        />
                    </div>

                    {/* Data Type Selection */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium text-white">Data Type</Label>
                        <Tabs value={isEnum ? "enum" : "standard"} onValueChange={(value) => setIsEnum(value === "enum")} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-black border border-white/30 rounded-lg">
                                <TabsTrigger
                                    value="standard"
                                    className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-300 rounded-md"
                                >
                                    Standard
                                </TabsTrigger>
                                <TabsTrigger
                                    value="enum"
                                    className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-300 rounded-md"
                                >
                                    Enum
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="standard" className="space-y-4 mt-4">
                                <DataTypeSelector
                                    value={selectedType}
                                    length={length ? parseInt(length) : undefined}
                                    precision={precision ? parseInt(precision) : undefined}
                                    scale={scale ? parseInt(scale) : undefined}
                                    onChange={(type, newLength, newPrecision, newScale) => {
                                        setSelectedType(type);
                                        setLength(newLength?.toString() || '');
                                        setPrecision(newPrecision?.toString() || '');
                                        setScale(newScale?.toString() || '');
                                    }}
                                    compact
                                />
                            </TabsContent>

                            <TabsContent value="enum" className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-white">Enum Values</Label>
                                    <Textarea
                                        value={enumValues}
                                        onChange={(e) => setEnumValues(e.target.value)}
                                        placeholder="active, inactive, pending"
                                        rows={3}
                                        className="bg-black border border-white/30 text-white placeholder:text-gray-400 focus:border-white resize-none rounded-lg"
                                    />
                                    <p className="text-xs text-gray-400">Separate values with commas</p>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Array Option */}
                        <div className="flex items-center space-x-3 p-4 bg-black border border-white/30 rounded-lg">
                            <Checkbox
                                id="array-type"
                                checked={isArray}
                                onCheckedChange={(checked) => setIsArray(!!checked)}
                                className="border-2 border-white/30 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black rounded"
                            />
                            <div>
                                <Label htmlFor="array-type" className="text-sm font-medium text-white">Array Type</Label>
                                <p className="text-xs text-gray-400">Make this field an array (e.g., text[])</p>
                            </div>
                        </div>
                    </div>

                    {/* Constraints */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium text-white">Constraints</Label>
                        <div className="space-y-2">
                            <ConstraintSelector
                                value={constraints}
                                onChange={setConstraints}
                                excludeForeignKey
                            />
                            <p className="text-xs text-gray-400">Select constraint types for this field</p>
                        </div>
                    </div>

                    {/* Advanced Options */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium text-white">Advanced Options</Label>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-white">Default Value Preset</Label>
                                <Select value={presetValue} onValueChange={handleDefaultPresetChange}>
                                    <SelectTrigger className="bg-black border border-white/30 text-white focus:border-white rounded-lg">
                                        <SelectValue placeholder="Choose a preset" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black border border-white/30 rounded-lg">
                                        {presetOptions.map((opt) => (
                                            <SelectItem key={opt.label + opt.value} value={opt.value} className="text-white focus:bg-white/10 rounded-md">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="default-value" className="text-sm font-medium text-white">Custom Default Value</Label>
                                <Input
                                    id="default-value"
                                    value={defaultValue}
                                    onChange={(e) => setDefaultValue(e.target.value)}
                                    placeholder="now(), gen_random_uuid(), 'default'"
                                    className="bg-black border border-white/30 text-white placeholder:text-gray-400 focus:border-white rounded-lg"
                                />
                                <p className="text-xs text-gray-400">Use SQL literals or functions</p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-white/20 pt-4 mt-6">
                    <div className="flex gap-3 w-full">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 bg-black border border-white/30 text-white hover:bg-white/10 rounded-lg"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="flex-1 bg-white hover:bg-gray-100 text-black rounded-lg"
                        >
                            {mode === 'edit' ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};