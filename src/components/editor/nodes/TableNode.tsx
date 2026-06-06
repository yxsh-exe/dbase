import React, { useEffect, useState, useMemo } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';
import { Diamond, Edit2, Fingerprint, Hash, Key, Link, Plus, Trash2 } from 'lucide-react';
import { FieldDialog } from './FieldDialog';
import { Field, TableNodeData } from './types/Field';

// Define the TableNodeProps type
export type TableNodeProps = {
    data: TableNodeData;
    id: string;
    selected?: boolean;
};

const MAX_VISIBLE_FIELDS = 7;

const getTypeColor = (type: string): string => {
    const t = type.toLowerCase().replace('[]', '');
    if (['uuid', 'uniqueidentifier'].includes(t)) return '#a78bfa'; // purple
    if (['varchar', 'nvarchar', 'text', 'char', 'nchar'].includes(t)) return '#22d3ee'; // cyan
    if (['int', 'integer', 'bigint', 'smallint', 'int2', 'int4', 'int8', 'serial'].includes(t)) return '#fb923c'; // orange
    if (['bool', 'boolean', 'bit'].includes(t)) return '#f472b6'; // pink
    if (['timestamp', 'timestamptz', 'datetime', 'datetime2', 'date', 'time'].includes(t)) return '#4ade80'; // green
    if (['float', 'float4', 'float8', 'double', 'real', 'numeric', 'decimal'].includes(t)) return '#fbbf24'; // amber
    if (['json', 'jsonb'].includes(t)) return '#60a5fa'; // blue
    return '#a1a1aa'; // zinc
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
    const [showAllFields, setShowAllFields] = useState(false);

    const connectedFieldsMapStr = useStore((s) => {
        let anySelected = false;
        s.nodeLookup.forEach(node => {
            if (node.selected) anySelected = true;
        });

        if (!anySelected) return '';

        const map: Record<string, 'source' | 'target'> = {};
        for (const edge of s.edges) {
            const isSourceSelected = s.nodeLookup.get(edge.source)?.selected;
            const isTargetSelected = s.nodeLookup.get(edge.target)?.selected;

            if (isSourceSelected || isTargetSelected) {
                if (edge.source === id) {
                    const fName = (edge.data as any)?.sourceField;
                    if (fName) map[fName] = 'source';
                }
                if (edge.target === id) {
                    const fName = (edge.data as any)?.targetField;
                    if (fName) map[fName] = 'target';
                }
            }
        }
        return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0])).map(([k,v]) => `${k}:${v}`).join(',');
    });

    const activeFieldsMap = useMemo(() => {
        const map = new Map<string, 'source' | 'target'>();
        if (!connectedFieldsMapStr) return map;
        connectedFieldsMapStr.split(',').forEach(pair => {
            const [k, v] = pair.split(':');
            map.set(k, v as 'source' | 'target');
        });
        return map;
    }, [connectedFieldsMapStr]);

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

        if (field.primary || constraints.includes('primary_key')) {
            icons.push(
                <span key="primary" title="Primary Key">
                    <Key className="w-3 h-3 text-yellow-400" />
                </span>
            );
        }

        if (field.foreign || constraints.includes('foreign_key')) {
            icons.push(
                <span key="foreign" title="Foreign Key">
                    <Link className="w-3 h-3 text-blue-400" />
                </span>
            );
        }

        if ((field.unique && !field.primary) || (constraints.includes('unique') && !constraints.includes('primary_key'))) {
            icons.push(
                <span key="unique" title="Unique">
                    <Fingerprint className="w-3 h-3 text-purple-400" />
                </span>
            );
        }

        if (isIdentity(field) || constraints.includes('identity')) {
            icons.push(
                <span key="identity" title="Identity/Auto Increment">
                    <Hash className="w-3 h-3 text-green-400" />
                </span>
            );
        }

        return icons;
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

    const visibleFields = showAllFields ? data.fields : data.fields.slice(0, MAX_VISIBLE_FIELDS);
    const hiddenFieldCount = data.fields.length - MAX_VISIBLE_FIELDS;

    return (
        <>
            <div
                className={`rounded-2xl w-[280px] transition-all duration-200 ${selected
                    ? 'shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-2 ring-white border-2 border-white'
                    : 'hover:opacity-95'
                    }`}
                style={{ 
                    backgroundColor: data.color || 'transparent',
                    paddingTop: data.color ? '8px' : '0px',
                    paddingBottom: data.color ? '4px' : '0px',
                    paddingLeft:'1px',
                    paddingRight:'1px'
                }}
                onClick={handleNodeClick}
            >
                <div 
                    className="rounded-[14px] w-full h-full relative flex flex-col border-x border-zinc-800/80" 
                    style={{ background: '#0c0c0c' }}
                >
                <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900 !rounded-full" />
                <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900 !rounded-full" />

                {/* Table Header */}
                <div className="px-3 py-2.5 flex items-center gap-2 border-b border-zinc-800">
                    {/* Table icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 shrink-0">
                        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
                    </svg>

                    <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
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
                                className="bg-zinc-800 text-white px-1.5 py-0.5 text-xs font-semibold focus:outline-none w-full rounded"
                                autoFocus
                            />
                        ) : (
                            <h3
                                className="text-xs font-bold text-white cursor-pointer hover:text-zinc-300 truncate"
                                onClick={() => setIsEditing(true)}
                            >
                                {tableName}
                            </h3>
                        )}
                    </div>

                    <button
                        onClick={handleRemoveTable}
                        className="text-zinc-600 hover:text-red-400 p-0.5 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete table"
                        style={{ opacity: selected ? 1 : undefined }}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Fields List */}
                <div>
                    {data.fields && data.fields.length > 0 ? (
                        <>
                            {visibleFields.map((field: Field, index: number) => {
                                const constraintIcons = getConstraintIcons(field);
                                const typeColor = getTypeColor(field.type);

                                const connectionType = activeFieldsMap.get(field.name);
                                
                                let rowClass = 'group/field flex items-center px-3 py-1.5 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors';
                                if (connectionType === 'source') {
                                    rowClass = 'group/field flex items-center px-3 py-1.5 border-b border-zinc-800/50 bg-rose-500/20 hover:bg-rose-500/30 border-l-[3px] border-l-rose-500 transition-colors';
                                } else if (connectionType === 'target') {
                                    rowClass = 'group/field flex items-center px-3 py-1.5 border-b border-zinc-800/50 bg-blue-500/20 hover:bg-blue-500/30 border-l-[3px] border-l-blue-500 transition-colors';
                                }

                                return (
                                    <div
                                        key={`${field.name}-${index}`}
                                        className={rowClass}
                                    >
                                        <div className="flex items-center w-full gap-1.5">
                                            {/* Constraint icons */}
                                            <div className="flex items-center gap-0.5 shrink-0 min-w-[16px]">
                                                {constraintIcons}
                                            </div>

                                            {/* Field name */}
                                            <span 
                                                className={`text-[11px] truncate flex-1 font-mono ${
                                                    connectionType ? 'text-white font-semibold' : 'text-zinc-300'
                                                }`}
                                            >
                                                {field.name}
                                            </span>

                                            {/* Type badge */}
                                            <span
                                                className="text-[10px] font-mono truncate max-w-[90px] px-1.5 py-0.5 rounded"
                                                style={{
                                                    color: typeColor,
                                                    background: `${typeColor}15`,
                                                }}
                                            >
                                                {formatFieldType(field)}{(field.nullable !== false && !field.primary) ? '?' : ''}
                                            </span>

                                            {/* Actions (hover only) */}
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover/field:opacity-100 transition-opacity shrink-0">
                                                <button
                                                    onClick={(e) => handleEditField(index, e)}
                                                    className="p-0.5 text-zinc-500 hover:text-white transition-colors"
                                                    title="Edit field"
                                                >
                                                    <Edit2 className="w-2.5 h-2.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleRemoveField(index, e)}
                                                    className="p-0.5 text-zinc-500 hover:text-red-400 transition-colors"
                                                    title="Remove field"
                                                >
                                                    <Trash2 className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Show More */}
                            {!showAllFields && hiddenFieldCount > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowAllFields(true);
                                    }}
                                    className="w-full px-3 py-1.5 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-zinc-800/30 transition-colors text-center"
                                >
                                    Show More ({hiddenFieldCount} more)
                                </button>
                            )}

                            {showAllFields && hiddenFieldCount > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowAllFields(false);
                                    }}
                                    className="w-full px-3 py-1.5 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-zinc-800/30 transition-colors text-center"
                                >
                                    Show Less
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="px-3 py-3 text-center text-[11px] text-zinc-600">
                            No fields added yet
                        </div>
                    )}
                </div>

                {/* Add Field Button */}
                <div className="px-3 py-1.5 border-t border-zinc-800/50">
                    <button
                        onClick={handleAddField}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-medium text-zinc-500 hover:text-white transition-colors rounded hover:bg-zinc-800/40"
                    >
                        <Plus className="h-3 w-3" />
                        Add Field
                    </button>
                </div>
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