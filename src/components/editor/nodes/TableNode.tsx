import { Handle, Position } from '@xyflow/react';
import { Diamond, Edit2, Fingerprint, Hash, Key, Link, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FieldDialog } from './FieldDialog';
import { Field, TableNodeData } from './types/Field';

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

    const getFieldStyle = (field: Field) => {
        if (field.primary) return 'font-semibold text-white';
        if (field.foreign) return 'font-medium text-blue-300';
        if (!field.nullable) return 'font-medium text-zinc-200';
        return 'font-normal text-zinc-300';
    };

    const getConstraintIcons = (field: Field) => {
        const icons = [];
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
            const cascadeInfo = [];
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
        const parts = [];

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
                className={`bg-zinc-900 border-2 rounded-md w-72 transition-all duration-200 ${selected
                    ? 'border-white shadow-lg'
                    : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                onClick={handleNodeClick}
            >
                <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-white !border-none" />
                <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-white !border-none" />
                {/* Table Header */}
                <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800 rounded-t-md">

                    <div className="flex items-center justify-between">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-table2 text-light mr-2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path></svg>
                        <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={tableName}
                                    onChange={(e) => setTableName(e.target.value)}
                                    onBlur={handleTableNameSave}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleTableNameSave();
                                        else if (e.key === 'Escape') setIsEditing(false);
                                    }}
                                    className="bg-zinc-800 text-zinc-100 px-2 py-1 text-sm border border-zinc-600 focus:outline-none focus:border-white w-full"
                                    autoFocus
                                />
                            ) : (
                                <h3
                                    className="text-sm font-bold cursor-pointer text-zinc-100 hover:text-zinc-300 "
                                    onClick={() => setIsEditing(true)}
                                >
                                    {tableName}
                                </h3>
                            )}
                        </div>
                        <button
                            onClick={handleRemoveTable}
                            className="text-zinc-400 hover:text-white p-1 transition-colors ml-2"
                            title="Delete table"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Fields List */}
                <div>
                    {data.fields.map((field: Field, index: number) => {
                        const constraintIcons = getConstraintIcons(field);
                        const tooltip = getFieldTooltip(field);

                        return (
                            <div
                                key={index}
                                className="flex items-center px-4 py-2 border-b border-zinc-800 last:border-b-0 group hover:bg-zinc-800 transition-colors"
                                title={tooltip}
                            >
                                <div className="flex items-center w-full">
                                    {/* Enhanced constraint icons */}
                                    <div className="mr-3 flex items-center gap-1 shrink-0">
                                        {constraintIcons}
                                    </div>

                                    {/* Field name with enhanced styling */}
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-xs ${getFieldStyle(field)} truncate flex items-center gap-1`}>
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

                                        {/* Reference info for foreign keys */}
                                        {field.referencedTable && (
                                            <div className="text-[9px] text-zinc-500 truncate">
                                                → {field.referencedTable}.{field.referencedField}
                                            </div>
                                        )}
                                    </div>

                                    {/* Type and actions */}
                                    <div className="ml-3 flex items-center gap-2">
                                        <div className="text-[10px] text-zinc-400">
                                            {formatFieldType(field)}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                            <button
                                                onClick={(e) => handleEditField(index, e)}
                                                className="text-zinc-400 hover:text-white p-1 transition-colors"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => handleRemoveField(index, e)}
                                                className="text-zinc-400 hover:text-white p-1 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Add Field Button */}
                <div className="px-4 py-2 border-t border-zinc-700 bg-zinc-800 rounded-b-md">
                    <button
                        onClick={handleAddField}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-zinc-200 hover:text-white hover:bg-zinc-900 border border-zinc-600 hover:border-zinc-500 text-xs font-medium transition-colors uppercase tracking-wide"
                    >
                        <Plus className="h-3 w-3" />
                        Add Field
                    </button>
                </div>
            </div>

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