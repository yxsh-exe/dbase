"use client";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { Edge, Node } from '@xyflow/react';
import { ArrowLeft, Check, Code, Copy, Download, GitBranch, Layout, Search, Table, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import dracula from 'react-syntax-highlighter/dist/esm/styles/prism/dracula';
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';
import type { TableNodeData } from './nodes/types/Field';
import { convertSchema, type SchemaFormat } from './utils/convertSchema';

// Register a minimal set of languages for highlighting
let prismLanguagesRegistered = false;
if (!prismLanguagesRegistered) {
    SyntaxHighlighter.registerLanguage?.('sql', sql);
    SyntaxHighlighter.registerLanguage?.('typescript', typescript);
    prismLanguagesRegistered = true;
}

type EditorSidebarProps = {
    nodes: Node<TableNodeData>[];
    edges: Edge[];
    onSelectTable?: (tableId: string) => void;
    onRemoveConnection?: (targetTableId: string, foreignKeyField: string) => void;
    onApplyLayout?: (layoutType: string) => void;
    onAutoArrange?: () => void;
    onFitToView?: () => void;
    currentLayout?: string;
    isApplyingLayout?: boolean;
};

export function EditorSidebar({
    nodes,
    edges,
    onSelectTable,
    onRemoveConnection,
}: EditorSidebarProps) {
    const [format, setFormat] = useState<SchemaFormat>('sql');
    const [activeTab, setActiveTab] = useState<'tables' | 'connections' | 'preview' | 'layout'>('tables');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [tableQuery, setTableQuery] = useState('');
    const [copied, setCopied] = useState(false);
    // Wrap is always on; UI toggle removed

    const preview = useMemo(() => convertSchema(nodes, edges, format), [nodes, edges, format]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(preview || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild className="text-white hover:text-black hover:bg-white transition-all duration-270">
                            <Link href="/projects">
                                <ArrowLeft />
                                <span className="group-data-[collapsible=icon]:hidden ">Projects</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={activeTab === 'tables' && isDialogOpen}
                                    onClick={() => {
                                        setActiveTab('tables');
                                        setIsDialogOpen(true);
                                    }}
                                >
                                    <Table />
                                    <span className="group-data-[collapsible=icon]:hidden">Tables</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={activeTab === 'connections' && isDialogOpen}
                                    onClick={() => {
                                        setActiveTab('connections');
                                        setIsDialogOpen(true);
                                    }}
                                >
                                    <GitBranch />
                                    <span className="group-data-[collapsible=icon]:hidden">Connections</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={activeTab === 'preview' && isDialogOpen}
                                    onClick={() => {
                                        setActiveTab('preview');
                                        setIsDialogOpen(true);
                                    }}

                                >
                                    <Code />
                                    <span className="group-data-[collapsible=icon]:hidden">Preview</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>

                        {/* Dialog renders tab content */}
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogContent className="max-w-6xl h-[92vh] bg-zinc-900 text-zinc-100 overflow-hidden flex flex-col min-w-0">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        {activeTab === 'tables' && <Table className="h-4 w-4" />}
                                        {activeTab === 'connections' && <GitBranch className="h-4 w-4" />}
                                        {activeTab === 'preview' && <Code className="h-4 w-4" />}
                                        {activeTab === 'layout' && <Layout className="h-4 w-4" />}
                                        {activeTab === 'tables' && 'Tables'}
                                        {activeTab === 'connections' && 'Connections'}
                                        {activeTab === 'preview' && 'Preview'}
                                        {activeTab === 'layout' && 'Layout'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {activeTab === 'tables' && 'Browse and quickly jump to a table.'}
                                        {activeTab === 'connections' && 'Inspect relationships between tables.'}
                                        {activeTab === 'preview' && 'Generate and copy the schema for your stack.'}
                                        {activeTab === 'layout' && 'Arrange tables using different layout algorithms.'}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="flex-1 min-h-0 overflow-hidden">
                                    {activeTab === 'tables' && (
                                        <div className="flex h-full flex-col overflow-hidden">
                                            <div className="relative">
                                                <Input
                                                    value={tableQuery}
                                                    onChange={(e) => setTableQuery(e.target.value)}
                                                    placeholder="Search tables..."
                                                    className="pl-9 bg-zinc-950/60 border-zinc-800 text-sm"
                                                />
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                            </div>
                                            <ul className="space-y-2 flex-1 min-h-0 overflow-auto pr-1">
                                                {nodes
                                                    .filter((n) =>
                                                        n.data.name.toLowerCase().includes(tableQuery.toLowerCase())
                                                    )
                                                    .map((n) => (
                                                        <li
                                                            key={n.id}
                                                            className="border border-zinc-800 rounded-md p-2 hover:bg-zinc-800/50 transition-colors"
                                                        >
                                                            <button
                                                                className="text-left w-full"
                                                                onClick={() => {
                                                                    onSelectTable?.(n.id);
                                                                    setIsDialogOpen(false);
                                                                }}
                                                            >
                                                                <div className="font-semibold">{n.data.name}</div>
                                                                <div className="text-xs text-zinc-400">{n.data.fields.length} fields</div>
                                                            </button>
                                                            <div className="mt-2 text-xs text-zinc-300">
                                                                {n.data.fields.slice(0, 8).map((f) => (
                                                                    <div key={f.name} className="flex justify-between">
                                                                        <span>{f.name}</span>
                                                                        <span className="text-zinc-500">{f.type}</span>
                                                                    </div>
                                                                ))}
                                                                {n.data.fields.length > 8 && (
                                                                    <div className="text-zinc-500">+ {n.data.fields.length - 8} more…</div>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                {nodes.filter((n) => n.data.name.toLowerCase().includes(tableQuery.toLowerCase())).length === 0 && (
                                                    <li className="text-sm text-zinc-500 py-8 text-center border border-dashed border-zinc-800 rounded-md">
                                                        No tables found{tableQuery ? ` for "${tableQuery}"` : ''}.
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    {activeTab === 'connections' && (
                                        <ul className="space-y-2 h-full overflow-auto pr-1">
                                            {nodes.map((n) => {
                                                const refs = n.data.references ?? [];
                                                return (
                                                    <li key={n.id} className="border border-zinc-800 rounded-md p-3">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="font-semibold">{n.data.name}</div>
                                                            <div className="text-[11px] text-zinc-400">{refs.length} connection{refs.length !== 1 ? 's' : ''}</div>
                                                        </div>
                                                        <div className="text-xs text-zinc-300 space-y-1">
                                                            {refs.length === 0 && (
                                                                <div className="text-zinc-500">No connections</div>
                                                            )}
                                                            {refs.map((r, idx) => (
                                                                <div key={idx} className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-1 min-w-0">
                                                                        <span className="text-zinc-200 truncate">{r.sourceTableName}</span>
                                                                        <span className="text-zinc-500">→</span>
                                                                        <span className="text-zinc-200 truncate">{n.data.name}</span>
                                                                        <span className="text-zinc-500">via</span>
                                                                        <span className="text-zinc-400 truncate">{r.foreignKeyField}</span>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        className="h-7 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200"
                                                                        onClick={() => {
                                                                            if (!onRemoveConnection) return;
                                                                            const ok = window.confirm(`Remove connection via "${r.foreignKeyField}" from table "${n.data.name}"?`);
                                                                            if (!ok) return;
                                                                            onRemoveConnection(n.id, r.foreignKeyField);
                                                                        }}
                                                                        title="Remove connection"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}

                                    {activeTab === 'preview' && (
                                        <div className="flex h-full flex-col gap-3 overflow-hidden min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-xs text-zinc-400">Format</div>
                                                <Select value={format} onValueChange={(v) => setFormat(v as SchemaFormat)}>
                                                    <SelectTrigger size="sm" className="h-8">
                                                        <SelectValue placeholder="Choose format" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="sql">SQL</SelectItem>
                                                        <SelectItem value="prisma">Prisma</SelectItem>
                                                        <SelectItem value="drizzle">Drizzle</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <div className="ml-auto flex items-center gap-2 ">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200"
                                                        onClick={handleCopy}
                                                        disabled={!preview}
                                                    >
                                                        {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />} Copy
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            const content = preview || '';
                                                            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            const ext = format === 'prisma' ? 'prisma' : format === 'drizzle' ? 'ts' : 'sql';
                                                            const base = format === 'prisma' ? 'schema' : format === 'drizzle' ? 'schema.drizzle' : 'schema';
                                                            a.href = url;
                                                            a.download = `${base}.${ext}`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            document.body.removeChild(a);
                                                            URL.revokeObjectURL(url);
                                                        }}
                                                        disabled={!preview}
                                                    >
                                                        <Download className="h-4 w-4 mr-1" /> Download
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="bg-zinc-950/60 border border-zinc-800 rounded w-full flex-1 min-h-0 overflow-auto overflow-x-auto min-w-0">
                                                <SyntaxHighlighter
                                                    language={format === 'sql' ? 'sql' : 'typescript'}
                                                    style={format === 'sql' ? vscDarkPlus : dracula}
                                                    wrapLongLines
                                                    customStyle={{
                                                        background: 'transparent',
                                                        margin: 0,
                                                        padding: '14px',
                                                        fontSize: '13px',
                                                        lineHeight: 1.65,
                                                    }}
                                                    codeTagProps={{
                                                        style: {
                                                            fontFamily:
                                                                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                                        },
                                                    }}
                                                >
                                                    {preview || 'Nothing to preview yet.'}
                                                </SyntaxHighlighter>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter className="mt-2">
                                    <Button variant="secondary" size="sm" onClick={() => setIsDialogOpen(false)}>
                                        Close
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </>
    );
}
