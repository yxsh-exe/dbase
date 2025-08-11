import { Edit2, Plus, Trash2, Key, Hash, Fingerprint, Diamond } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FieldDialog } from './FieldDialog';
import { Field, TableNodeData } from './types/Field';

export const TableNode = ({
    data,
    id,
    selected = false,
}: {
    data: TableNodeData;
    id: string;
    selected?: boolean;
}) => {
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
        if (field.foreign) return 'font-medium text-zinc-300';
        if (!field.nullable) return 'font-medium text-zinc-200';
        return 'font-normal text-zinc-300';
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
                    {data.fields.map((field: Field, index: number) => (
                        <div
                            key={index}
                            className="flex items-center px-4 py-2 border-b border-zinc-800 last:border-b-0 group hover:bg-zinc-800 transition-colors"
                        >
                            <div className="flex items-center w-full">
                                {/* Icons before name */}
                                <div className="mr-4  text-zinc-200 flex items-center gap-1 shrink-0">
                                    {field.primary && <Key className="w-3.5 h-3.5" />}
                                    {isIdentity(field) && <Hash className="w-3.5 h-3.5" />}
                                    {field.unique && !field.primary && (
                                        <Fingerprint className="w-3.5 h-3.5" />
                                    )}
                                    {field.nullable === false || field.primary ? (
                                        <Diamond className="w-3.5 h-3.5" fill="currentColor" />
                                    ) : (
                                        <Diamond className="w-3.5 h-3.5" />
                                    )}
                                </div>

                                {/* Field name */}
                                <div className="flex-1 min-w-0">
                                    <div className={`text-xs ${getFieldStyle(field)} truncate`}>
                                        {field.name}
                                    </div>
                                </div>

                                {/* Type on same row, right aligned */}
                                <div className="ml-3 flex items-center gap-2">
                                    <div className="text-[10px] text-zinc-400 ">
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
                    ))}
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