'use client';

import React, { useState } from 'react';
import { ChevronRight, GripVertical, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleTableExpanded as toggleTable, toggleSectionExpanded as toggleSection } from '@/store/slices/editorSlice';
import { updateTableThunk, deleteTableThunk, updateFieldThunk } from '@/store/thunks/editorThunks';
import { Field, TableNodeData } from '@/components/editor/nodes/types/Field';
import { Key, Link as LinkIcon, Fingerprint, Hash } from 'lucide-react';
import { ColorPicker } from '@/components/ColorPicker';
import { DataTypeSelector } from '@/components/editor/nodes/DataTypeSelector';

interface SidebarTableNodeProps {
    tableId: string;
    tableData: TableNodeData;
    isSelected: boolean;
    onSelect: () => void;
    isOverlay?: boolean;
}

export function SidebarTableNode({ tableId, tableData, isSelected, onSelect, isOverlay }: SidebarTableNodeProps) {
    const dispatch = useAppDispatch();
    const expandedTables = useAppSelector(state => state.editor.ui.expandedTables);
    const expandedSections = useAppSelector(state => state.editor.ui.expandedSections);
    
    const isExpanded = expandedTables.includes(tableId);
    const isFieldsExpanded = expandedSections[tableId]?.includes('fields') ?? false;

    const projectType = useAppSelector(state => state.editor.ui.projectType);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState(tableData.name);
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tableId });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleSaveTitle = () => {
        if (editTitleValue.trim() && editTitleValue !== tableData.name) {
            dispatch(updateTableThunk({ tableId, newData: { name: editTitleValue.trim() } }));
        }
        setIsEditingTitle(false);
    };

    const getFieldConstraintIcons = (field: Field) => {
        const icons: React.ReactNode[] = [];
        const constraints = field.constraints?.map(c => c.type) || [];

        if (field.primary || constraints.includes('primary_key')) {
            icons.push(<span key="pk" title="Primary Key"><Key className="w-3 h-3 text-yellow-400" /></span>);
        }
        if (field.foreign || constraints.includes('foreign_key')) {
            icons.push(<span key="fk" title="Foreign Key"><LinkIcon className="w-3 h-3 text-blue-400" /></span>);
        }
        if ((field.unique && !field.primary) || (constraints.includes('unique') && !constraints.includes('primary_key'))) {
            icons.push(<span key="uq" title="Unique"><Fingerprint className="w-3 h-3 text-purple-400" /></span>);
        }
        const dv = (field.defaultValue || '').toLowerCase();
        const isIdentity = dv && /nextval\(|identity|serial|auto_increment|autoincrement|gen_random_uuid\(\)|uuid_generate_v4\(\)/i.test(dv);
        if (isIdentity || constraints.includes('identity')) {
            icons.push(<span key="id" title="Identity/Auto Increment"><Hash className="w-3 h-3 text-green-400" /></span>);
        }
        return icons;
    };

    const formatFieldType = (field: Field) => {
        let typeStr = field.type;
        if (field.length) typeStr += `(${field.length})`;
        else if (field.precision && field.scale) typeStr += `(${field.precision},${field.scale})`;
        else if (field.precision) typeStr += `(${field.precision})`;
        return typeStr;
    };

    const getTypeColor = (type: string): string => {
        const t = type.toLowerCase().replace('[]', '');
        if (['uuid', 'uniqueidentifier'].includes(t)) return 'text-purple-400';
        if (['varchar', 'nvarchar', 'text', 'char', 'nchar'].includes(t)) return 'text-cyan-400';
        if (['int', 'integer', 'bigint', 'smallint', 'int2', 'int4', 'int8', 'serial'].includes(t)) return 'text-orange-400';
        if (['bool', 'boolean', 'bit'].includes(t)) return 'text-pink-400';
        if (['timestamp', 'timestamptz', 'datetime', 'datetime2', 'date', 'time'].includes(t)) return 'text-green-400';
        if (['float', 'float4', 'float8', 'double', 'real', 'numeric', 'decimal'].includes(t)) return 'text-amber-400';
        if (['json', 'jsonb'].includes(t)) return 'text-blue-400';
        return 'text-zinc-400';
    };

    const isIndexesExpanded = expandedSections[tableId]?.includes('indexes') ?? false;
    const isConstraintsExpanded = expandedSections[tableId]?.includes('constraints') ?? false;
    const isCommentsExpanded = expandedSections[tableId]?.includes('comments') ?? false;

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`border rounded-md overflow-hidden transition-all duration-200 
                ${isOverlay ? 'bg-[#1e2330] ring-1 ring-blue-500/50 shadow-2xl scale-[1.02] cursor-grabbing z-50 opacity-95 border-blue-500/30' : 'bg-[#0d0d0f]'}
                ${isSelected && !isOverlay && !isDragging ? 'ring-1 ring-white/40 border-zinc-500 shadow-lg' : ''}
                ${!isSelected && !isOverlay && !isDragging ? 'border-zinc-800/80' : ''}
                ${isDragging && !isOverlay ? 'opacity-30 border-dashed border-zinc-600' : ''}`}
        >
            {/* Table Header */}
            <div 
                {...attributes} 
                {...listeners}
                className="flex items-center gap-2 p-2 hover:brightness-125 cursor-grab active:cursor-grabbing group select-none transition-all border-l-4"
                style={{ 
                    borderLeftColor: tableData.color || '#4f46e5',
                    backgroundColor: tableData.color ? `${tableData.color}15` : 'transparent'
                }}
                onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button')) return;
                    onSelect();
                }}
            >
                <div className="flex items-center gap-1">
                    <GripVertical className="h-4 w-4 text-zinc-500 hover:text-zinc-300" />
                    <button 
                        onClick={(e) => { e.stopPropagation(); dispatch(toggleTable(tableId)); }}
                        className="text-zinc-500 hover:text-white transition-transform hover:scale-110 p-0.5 rounded cursor-pointer"
                    >
                        <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                </div>

                <div className="flex-1 min-w-0">
                    {isEditingTitle ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input
                                autoFocus
                                value={editTitleValue}
                                onChange={e => setEditTitleValue(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveTitle();
                                    if (e.key === 'Escape') setIsEditingTitle(false);
                                }}
                                className="bg-zinc-950 text-white text-sm font-medium px-1 py-0.5 rounded w-full border border-zinc-700 focus:border-zinc-500 outline-none"
                            />
                            <button onClick={handleSaveTitle} className="text-green-400 hover:text-green-300 p-1"><Check className="h-3.5 w-3.5" /></button>
                            <button onClick={() => setIsEditingTitle(false)} className="text-red-400 hover:text-red-300 p-1"><X className="h-3.5 w-3.5" /></button>
                        </div>
                    ) : (
                        <span className="text-[13px] font-semibold text-zinc-200 truncate block">
                            {tableData.name}
                        </span>
                    )}
                </div>

                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setEditTitleValue(tableData.name); setIsEditingTitle(true); }}
                        className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-700 transition-transform hover:scale-110 active:scale-95"
                        title="Rename Table"
                    >
                        <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); dispatch(deleteTableThunk(tableId)); }}
                        className="p-1.5 text-zinc-400 hover:text-red-400 rounded hover:bg-red-400/10 transition-transform hover:scale-110 active:scale-95"
                        title="Delete Table"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Table Content */}
            {isExpanded && (
                <div 
                    className="border-t border-zinc-800/80 flex flex-col"
                    style={{ backgroundColor: tableData.color ? `${tableData.color}15` : '#131316' }}
                >
                    {/* Sections */}
                    <div className="p-2 space-y-3">
                        {/* Fields Section */}
                        <div>
                            <div className="flex items-center justify-between group/section mb-1 select-none">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-300 cursor-pointer" onClick={() => dispatch(toggleSection({ tableId, section: 'fields' }))}>
                                    <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${isFieldsExpanded ? 'rotate-90' : ''}`} />
                                    Fields
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newField: Field = { name: `field_${tableData.fields.length + 1}`, type: 'varchar', length: 255, primary: false, unique: false, nullable: true, foreign: false, constraints: [] };
                                        dispatch(updateTableThunk({ tableId, newData: { fields: [...tableData.fields, newField] } }));
                                        if (!isFieldsExpanded) dispatch(toggleSection({ tableId, section: 'fields' }));
                                    }}
                                    className="p-0.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-all cursor-pointer"
                                >
                                    <Plus className="h-3 w-3" />
                                </button>
                            </div>
                            {isFieldsExpanded && (
                                <div className="space-y-0.5 pl-2 pr-2">
                                    {tableData.fields.map((field, idx) => {
                                        if (editingFieldIndex === idx) {
                                            return (
                                                <div key={idx} className="flex flex-col gap-1.5 py-1.5 px-2 rounded bg-zinc-800/80 mb-1 border border-zinc-700">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <input 
                                                            autoFocus
                                                            className="bg-zinc-950 text-white text-xs px-1.5 py-1 rounded border border-zinc-700 w-full focus:border-zinc-500 outline-none"
                                                            value={field.name}
                                                            onChange={e => {
                                                                const newFields = [...tableData.fields];
                                                                newFields[idx] = { ...newFields[idx], name: e.target.value };
                                                                dispatch(updateTableThunk({ tableId, newData: { fields: newFields } }));
                                                            }}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' || e.key === 'Escape') setEditingFieldIndex(null);
                                                            }}
                                                        />
                                                        <button onClick={() => setEditingFieldIndex(null)} className="text-zinc-400 hover:text-white p-1">
                                                            <Check className="h-3.5 w-3.5 text-green-400" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2 mt-1">
                                                        <DataTypeSelector 
                                                            value={field.type} 
                                                            onChange={(type, length, precision, scale) => {
                                                                const newFields = [...tableData.fields];
                                                                newFields[idx] = { ...newFields[idx], type, length, precision, scale };
                                                                dispatch(updateTableThunk({ tableId, newData: { fields: newFields } }));
                                                            }}
                                                            projectType={projectType}
                                                            compact={true}
                                                            hideSize={false}
                                                            length={field.length}
                                                            precision={field.precision}
                                                            scale={field.scale}
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={() => {
                                                                    const newFields = [...tableData.fields];
                                                                    const newPrimary = !newFields[idx].primary;
                                                                    newFields[idx] = { ...newFields[idx], primary: newPrimary, unique: newPrimary ? true : newFields[idx].unique };
                                                                    dispatch(updateTableThunk({ tableId, newData: { fields: newFields } }));
                                                                }}
                                                                className={`p-1 rounded flex items-center justify-center transition-colors border ${field.primary ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}
                                                                title="Primary Key"
                                                            >
                                                                <Key className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    const newFields = [...tableData.fields];
                                                                    newFields[idx] = { ...newFields[idx], nullable: !newFields[idx].nullable };
                                                                    dispatch(updateTableThunk({ tableId, newData: { fields: newFields } }));
                                                                }}
                                                                className={`p-1 rounded flex items-center justify-center transition-colors border ${!field.nullable ? 'bg-blue-400/20 text-blue-400 border-blue-400/50' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}
                                                                title="Not Null"
                                                            >
                                                                <span className="text-[10px] font-bold px-1 leading-tight font-mono">N</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    if (field.primary) return;
                                                                    const newFields = [...tableData.fields];
                                                                    newFields[idx] = { ...newFields[idx], unique: !newFields[idx].unique };
                                                                    dispatch(updateTableThunk({ tableId, newData: { fields: newFields } }));
                                                                }}
                                                                disabled={field.primary}
                                                                className={`p-1 rounded flex items-center justify-center transition-colors border ${field.unique || field.primary ? 'bg-purple-400/20 text-purple-400 border-purple-400/50' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'} ${field.primary ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                title="Unique"
                                                            >
                                                                <Fingerprint className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div 
                                                key={idx} 
                                                onClick={() => setEditingFieldIndex(idx)}
                                                className="group/field flex items-center justify-between text-[11px] py-1 px-2 rounded hover:bg-zinc-800/50 transition-colors cursor-text"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="flex items-center gap-1 w-[24px] shrink-0">
                                                        {getFieldConstraintIcons(field)}
                                                    </div>
                                                    <span className="text-zinc-300 font-medium truncate group-hover/field:text-white transition-colors">{field.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`${getTypeColor(field.type)} text-[10px] truncate`} style={{ fontFamily: 'var(--font-geist-mono, "Geist Mono", monospace)' }}>
                                                        {formatFieldType(field)}
                                                    </span>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newFields = [...tableData.fields];
                                                            newFields.splice(idx, 1);
                                                            dispatch(updateTableThunk({ tableId, newData: { fields: newFields } }));
                                                        }}
                                                        className="opacity-0 group-hover/field:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Indexes Section */}
                        <div>
                            <div className="flex items-center justify-between group/section mb-1 select-none">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-300 cursor-pointer" onClick={() => dispatch(toggleSection({ tableId, section: 'indexes' }))}>
                                    <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${isIndexesExpanded ? 'rotate-90' : ''}`} />
                                    Indexes
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const defaultCol = tableData.fields.length > 0 ? [tableData.fields[0].name] : [];
                                        const newIndexes = [...(tableData.indexes || []), { name: `idx_${tableData.name}_${(tableData.indexes?.length || 0) + 1}`, columns: defaultCol }];
                                        dispatch(updateTableThunk({ tableId, newData: { indexes: newIndexes } }));
                                        if (!isIndexesExpanded) dispatch(toggleSection({ tableId, section: 'indexes' }));
                                    }}
                                    className="p-0.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-all cursor-pointer"
                                >
                                    <Plus className="h-3 w-3" />
                                </button>
                            </div>
                            {isIndexesExpanded && (
                                <div className="space-y-1 pl-2 pr-2">
                                    {(tableData.indexes || []).map((idx, i) => (
                                        <div key={i} className="flex items-center gap-2 mb-1">
                                            <input 
                                                className="bg-zinc-950 text-white text-[10px] px-1.5 py-1 rounded border border-zinc-800 flex-1 focus:border-zinc-500 outline-none min-w-0"
                                                value={idx.name}
                                                placeholder="Index Name"
                                                onChange={e => {
                                                    const newIndexes = [...(tableData.indexes || [])];
                                                    newIndexes[i] = { ...newIndexes[i], name: e.target.value };
                                                    dispatch(updateTableThunk({ tableId, newData: { indexes: newIndexes } }));
                                                }}
                                            />
                                            <select 
                                                className="bg-zinc-950 text-white text-[10px] px-1 py-1 rounded border border-zinc-800 flex-1 focus:border-zinc-500 outline-none cursor-pointer min-w-0"
                                                value={idx.columns?.[0] || ''}
                                                onChange={e => {
                                                    const newIndexes = [...(tableData.indexes || [])];
                                                    newIndexes[i] = { ...newIndexes[i], columns: [e.target.value] };
                                                    dispatch(updateTableThunk({ tableId, newData: { indexes: newIndexes } }));
                                                }}
                                            >
                                                <option value="" disabled>Select Col</option>
                                                {tableData.fields.map(f => (
                                                    <option key={f.name} value={f.name}>{f.name}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => {
                                                const newIndexes = [...(tableData.indexes || [])];
                                                newIndexes.splice(i, 1);
                                                dispatch(updateTableThunk({ tableId, newData: { indexes: newIndexes } }));
                                            }} className="text-zinc-500 hover:text-red-400 shrink-0">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!tableData.indexes || tableData.indexes.length === 0) && (
                                        <div className="pl-6 py-1 text-[11px] text-zinc-500">No indexes defined</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Constraints Section */}
                        <div>
                            <div className="flex items-center justify-between group/section mb-1 select-none">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-300 cursor-pointer" onClick={() => dispatch(toggleSection({ tableId, section: 'constraints' }))}>
                                    <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${isConstraintsExpanded ? 'rotate-90' : ''}`} />
                                    Check Constraints
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newChecks = [...(tableData.checkConstraints || []), { name: `chk_${tableData.name}_${(tableData.checkConstraints?.length || 0) + 1}`, condition: '' }];
                                        dispatch(updateTableThunk({ tableId, newData: { checkConstraints: newChecks } }));
                                        if (!isConstraintsExpanded) dispatch(toggleSection({ tableId, section: 'constraints' }));
                                    }}
                                    className="p-0.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-all cursor-pointer"
                                >
                                    <Plus className="h-3 w-3" />
                                </button>
                            </div>
                            {isConstraintsExpanded && (
                                <div className="space-y-1 pl-2 pr-2">
                                    {(tableData.checkConstraints || []).map((chk, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input 
                                                className="bg-zinc-950 text-white text-[10px] px-1.5 py-1 rounded border border-zinc-800 w-1/3 focus:border-zinc-500 outline-none"
                                                value={chk.name}
                                                placeholder="Name"
                                                onChange={e => {
                                                    const newChecks = [...(tableData.checkConstraints || [])];
                                                    newChecks[i] = { ...newChecks[i], name: e.target.value };
                                                    dispatch(updateTableThunk({ tableId, newData: { checkConstraints: newChecks } }));
                                                }}
                                            />
                                            <input 
                                                className="bg-zinc-950 text-white text-[10px] px-1.5 py-1 rounded border border-zinc-800 flex-1 focus:border-zinc-500 outline-none"
                                                value={chk.condition}
                                                placeholder="Condition (e.g. age > 18)"
                                                onChange={e => {
                                                    const newChecks = [...(tableData.checkConstraints || [])];
                                                    newChecks[i] = { ...newChecks[i], condition: e.target.value };
                                                    dispatch(updateTableThunk({ tableId, newData: { checkConstraints: newChecks } }));
                                                }}
                                            />
                                            <button onClick={() => {
                                                const newChecks = [...(tableData.checkConstraints || [])];
                                                newChecks.splice(i, 1);
                                                dispatch(updateTableThunk({ tableId, newData: { checkConstraints: newChecks } }));
                                            }} className="text-zinc-500 hover:text-red-400">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!tableData.checkConstraints || tableData.checkConstraints.length === 0) && (
                                        <div className="pl-6 py-1 text-[11px] text-zinc-500">No constraints defined</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Comments Section */}
                        <div>
                            <div className="flex items-center justify-between group/section mb-1 select-none">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-300 cursor-pointer" onClick={() => dispatch(toggleSection({ tableId, section: 'comments' }))}>
                                    <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${isCommentsExpanded ? 'rotate-90' : ''}`} />
                                    Comments
                                </div>
                            </div>
                            {isCommentsExpanded && (
                                <div className="pl-6 pr-2 py-1">
                                    <textarea 
                                        className="w-full bg-zinc-950 text-zinc-300 text-[11px] px-2 py-1.5 rounded border border-zinc-800 focus:border-zinc-500 outline-none resize-none min-h-[60px]"
                                        placeholder="Add a comment for this table..."
                                        value={tableData.comment || ''}
                                        onChange={(e) => dispatch(updateTableThunk({ tableId, newData: { comment: e.target.value } }))}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between p-2 border-t border-zinc-800/80 bg-zinc-900/50">
                        <div className="flex items-center gap-2">
                            <ColorPicker 
                                value={tableData.color || '#4f46e5'} 
                                onChange={(color) => dispatch(updateTableThunk({ tableId, newData: { color } }))} 
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button 
                                onClick={() => {
                                    const newIndexes = [...(tableData.indexes || []), { name: `idx_${tableData.name}_${(tableData.indexes?.length || 0) + 1}`, columns: [] }];
                                    dispatch(updateTableThunk({ tableId, newData: { indexes: newIndexes } }));
                                    if (!isIndexesExpanded) dispatch(toggleSection({ tableId, section: 'indexes' }));
                                }}
                                className="flex items-center gap-1 text-[10px] font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 px-2 py-1 rounded transition-colors"
                            >
                                <Plus className="h-3 w-3" /> Add Index
                            </button>
                            <button 
                                onClick={() => {
                                    const newField: Field = { name: `field_${tableData.fields.length + 1}`, type: 'varchar', length: 255, primary: false, unique: false, nullable: true, foreign: false, constraints: [] };
                                    dispatch(updateTableThunk({ tableId, newData: { fields: [...tableData.fields, newField] } }));
                                    if (!isFieldsExpanded) dispatch(toggleSection({ tableId, section: 'fields' }));
                                }}
                                className="flex items-center gap-1 text-[10px] font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 px-2 py-1 rounded transition-colors"
                            >
                                <Plus className="h-3 w-3" /> Add Field
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
