import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Diamond, Edit2, Fingerprint, Hash, Key, Link, Plus, Trash2 } from 'lucide-react';
import { FieldDialog } from './FieldDialog';
import { Field, TableNodeData } from './types/Field';
import { useTheme } from '@/context/ThemeContext';

// Define the TableNodeProps type
export type TableNodeProps = {
    data: TableNodeData;
    id: string;
    selected?: boolean;
};

export const TableNode = ({
    data,
    id,
    selected = false,
}: TableNodeProps) => {
    const [tableName, setTableName] = useState(data.name);
    const [isEditing, setIsEditing] = useState(false);
    const [showFieldDialog, setShowFieldDialog] = useState(false);
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
    const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
    const { setCustomTableColor, getTableColor } = useTheme();

    const tableTextColor = '#ffffff';

    useEffect(() => {
        setTableName(data.name);
    }, [data.name]);

    const handleNodeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        data.onTableClick?.(id);
    };

    const handleTableNameSave = () => {
        if (data.onUpdateTable && tableName.trim()) {
            data.onUpdateTable(id, { name: tableName.trim() });
        }
        setIsEditing(false);
    };

    const handleAddField = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDialogMode('add');
        setEditingFieldIndex(null);
        setShowFieldDialog(true);
    };

    const handleEditField = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setDialogMode('edit');
        setEditingFieldIndex(index);
        setShowFieldDialog(true);
    };

    const handleFieldSave = (newField: Field) => {
        if (dialogMode === 'add') {
            data.onAddField?.(id, newField);
        } else if (dialogMode === 'edit' && editingFieldIndex !== null) {
            data.onUpdateField?.(id, editingFieldIndex, newField);
        }
    };

    const handleRemoveField = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onRemoveField && window.confirm('Remove this field?')) {
            data.onRemoveField(id, index);
        }
    };

    const handleRemoveTable = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onRemoveTable && window.confirm('Remove this table?')) {
            data.onRemoveTable(id);
        }
    };

    const getConstraintIcons = (field: Field): React.JSX.Element[] => {
        const icons: React.JSX.Element[] = [];
        const constraints = field.constraints?.map(c => c.type) || [];

        // Legacy constraint handling
        if (field.primary || constraints.includes('primary_key')) {
            icons.push(
                <span key="primary" title="Primary Key">
                    <Key className="w-3.5 h-3.5 text-yellow-400" />
                </span>
            );
        }

        if (field.foreign || constraints.includes('foreign_key')) {
            const fkConstraint = field.constraints?.find(c => c.type === 'foreign_key');
            const cascadeInfo: string[] = [];
            if (fkConstraint?.onDelete === 'CASCADE') cascadeInfo.push('CASCADE DEL');
            if (fkConstraint?.onUpdate === 'CASCADE') cascadeInfo.push('CASCADE UPD');

            icons.push(
                <span
                    key="foreign"
                    title={`Foreign Key${cascadeInfo.length ? ' (' + cascadeInfo.join(', ') + ')' : ''}`}
                >
                    <Link className="w-3.5 h-3.5 text-blue-400" />
                </span>
            );
        }

        if ((field.unique && !field.primary) || (constraints.includes('unique') && !constraints.includes('primary_key'))) {
            icons.push(
                <span key="unique" title="Unique">
                    <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
                </span>
            );
        }

        if (isIdentity(field) || constraints.includes('identity')) {
            icons.push(
                <span key="identity" title="Identity/Auto Increment">
                    <Hash className="w-3.5 h-3.5 text-green-400" />
                </span>
            );
        }

        // Nullable/Not Null indicator
        const isNotNull = field.nullable === false || field.primary || constraints.includes('not_null') || constraints.includes('primary_key');
        icons.push(
            <span
                key="nullable"
                title={isNotNull ? "Not Null" : "Nullable"}
            >
                <Diamond className={`w-3.5 h-3.5 ${isNotNull ? 'text-red-400 fill-current' : 'text-zinc-300'}`} />
            </span>
        );

        return icons;
    };

    const getFieldTooltip = (field: Field) => {
        const parts: string[] = [];

        if (field.referencedTable) {
            parts.push(`References ${field.referencedTable}.${field.referencedField}`);
        }

        if (field.constraints) {
            const constraintNames = field.constraints.map(c => {
                switch (c.type) {
                    case 'primary_key': return 'Primary Key';
                    case 'foreign_key': return 'Foreign Key';
                    case 'unique': return 'Unique';
                    case 'not_null': return 'Not Null';
                    case 'identity': return 'Identity';
                    default: return c.type;
                }
            });

            if (constraintNames.length > 0) {
                parts.push(`Constraints: ${constraintNames.join(', ')}`);
            }
        }

        return parts.join('\n');
    };

    const isIdentity = (field: Field) => {
        const dv = (field.defaultValue || '').toLowerCase();
        if (!dv) return false;
        return /nextval\(|identity|serial|auto_increment|autoincrement|gen_random_uuid\(\)|uuid_generate_v4\(\)/i.test(dv);
    };

    const formatFieldType = (field: Field) => {
        let typeStr = field.type;
        if (field.length) {
            typeStr += `(${field.length})`;
        } else if (field.precision && field.scale) {
            typeStr += `(${field.precision},${field.scale})`;
        } else if (field.precision) {
            typeStr += `(${field.precision})`;
        }
        return typeStr;
    };

    return (
        <>
            <div
                className={`border-3 rounded-md w-72 transition-all duration-200 bg-black ${selected
                    ? 'border-white shadow-lg'
                    : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                onClick={handleNodeClick}
            >
                <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-white !border-none" />
                <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-white !border-none" />

                {/* Table Header */}
                <div
                    className="px-4 py-3 rounded-t-md bg-black"
                >
                    <div className="flex items-center justify-between">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-light mr-2">
                            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
                        </svg>
                        <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={tableName}
                                    onChange={(e) => setTableName(e.target.value)}
                                    onBlur={handleTableNameSave}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleTableNameSave();
                                        else if (e.key === 'Escape') {
                                            setTableName(data.name);
                                            setIsEditing(false);
                                        }
                                    }}
                                    className="bg-zinc-800 text-zinc-100 px-2 py-1 text-sm focus:outline-none w-full"
                                    autoFocus
                                    style={{
                                        color: tableTextColor,
                                    }}
                                />
                            ) : (
                                <h3
                                    className="text-sm font-bold cursor-pointer hover:text-zinc-300"
                                    style={{ color: tableTextColor }}
                                    onClick={() => setIsEditing(true)}
                                >
                                    {tableName}
                                </h3>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleRemoveTable}
                                className="text-white hover:text-red-500 p-1 transition-colors ml-1"
                                title="Delete table"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Fields List */}
                <div>
                    {data.fields && data.fields.length > 0 ? (
                        data.fields.map((field: Field, index: number) => {
                            const constraintIcons = getConstraintIcons(field);
                            const tooltip = getFieldTooltip(field);

                            return (
                                <div
                                    key={`${field.name}-${index}`}
                                    className="group flex items-center px-4 py-2 border-b-white border bg-black"
                                    title={tooltip}
                                >
                                    <div className="flex items-center w-full">
                                        {/* Enhanced constraint icons */}
                                        <div className="mr-3 flex items-center gap-1 shrink-0">
                                            {constraintIcons}
                                        </div>

                                        {/* Field name with enhanced styling */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs truncate flex items-center gap-1" style={{ color: tableTextColor }}>
                                                <span>{field.name}</span>
                                                {/* Enhanced FK indicator with cascade info */}
                                                {field.foreign && field.constraints?.some(c => c.type === 'foreign_key') && (
                                                    <div className="flex gap-1">
                                                        {field.constraints
                                                            ?.filter(c => c.type === 'foreign_key')
                                                            .map((constraint, idx) => (
                                                                <div key={idx} className="flex gap-0.5">
                                                                    {constraint.onDelete === 'CASCADE' && (
                                                                        <span className="text-[8px] px-1 py-0.5 bg-red-900/50 text-red-300 rounded">
                                                                            C-DEL
                                                                        </span>
                                                                    )}
                                                                    {constraint.onUpdate === 'CASCADE' && (
                                                                        <span className="text-[8px] px-1 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                                                                            C-UPD
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Type and actions */}
                                        <div className="ml-3 flex items-center gap-2">
                                            <div className="text-[10px]" style={{ color: `${tableTextColor}CC` }}>
                                                {formatFieldType(field)}
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                <button
                                                    onClick={(e) => handleEditField(index, e)}
                                                    className="p-1 transition-colors hover:opacity-80"
                                                    style={{ color: tableTextColor }}
                                                    title="Edit field"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleRemoveField(index, e)}
                                                    className="p-1 transition-colors hover:text-red-400"
                                                    style={{ color: tableTextColor }}
                                                    title="Remove field"
                                                >
                                                    <Trash2 className="w-3 h-3 hover:text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div
                            className="px-4 py-3 text-center text-xs bg-black"
                            style={{
                                color: `${tableTextColor}CC`,
                            }}
                        >
                            No fields added yet
                        </div>
                    )}
                </div>

                {/* Add Field Button */}
                <div
                    className="px-4 py-2 rounded-b-md bg-black"
                >
                    <button
                        onClick={handleAddField}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors uppercase tracking-wide hover:opacity-80 rounded border"
                        style={{
                            color: tableTextColor,
                            borderColor: `${tableTextColor}66`, // 40% opacity border
                        }}
                    >
                        <Plus className="h-3 w-3" />
                        Add Field
                    </button>
                </div>
            </div>

            {/* Field Dialog */}
            <FieldDialog
                isOpen={showFieldDialog}
                onClose={() => setShowFieldDialog(false)}
                onSave={handleFieldSave}
                field={editingFieldIndex !== null ? data.fields[editingFieldIndex] : null}
                existingFields={data.fields}
                mode={dialogMode}
            />
        </>
    );
};