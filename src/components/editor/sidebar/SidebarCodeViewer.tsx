'use client';

import React, { useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUIState } from '@/store/slices/editorSlice';
import { generateSql } from '@/lib/generators/sql';
import { generatePrisma } from '@/lib/generators/prisma';
import { generateDrizzle } from '@/lib/generators/drizzle';

export function SidebarCodeViewer() {
    const dispatch = useAppDispatch();
    
    const nodes = useAppSelector(state => state.editor.schema.present.nodes);
    const edges = useAppSelector(state => state.editor.schema.present.edges);
    const codeSubTab = useAppSelector(state => state.editor.ui.codeSubTab);
    const projectType = useAppSelector(state => state.editor.ui.projectType) || 'PostgreSQL';
    const [copiedCode, setCopiedCode] = React.useState(false);

    const generatedCode = useMemo(() => {
        if (!nodes.length) return '-- Add tables to see generated code';
        try {
            const options = { nodes, edges, projectType };
            switch (codeSubTab) {
                case 'prisma': return generatePrisma(options);
                case 'drizzle': return generateDrizzle(options);
                case 'sql':
                default: return generateSql(options);
            }
        } catch (error) {
            console.error('Error generating schema:', error);
            return '-- Error generating schema';
        }
    }, [nodes, edges, codeSubTab]);

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">Generated Code</h3>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(generatedCode);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="flex items-center justify-center h-7 w-7 rounded bg-zinc-900 text-zinc-400 hover:text-white transition-transform hover:scale-[0.97] active:scale-95 ease-[cubic-bezier(0.23,1,0.32,1)] duration-150 border border-zinc-800"
                        title="Copy code"
                    >
                        {copiedCode ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                </div>
                
                {/* Code Tabs */}
                <div className="flex gap-1 mt-3 bg-zinc-900/50 p-1 rounded-lg">
                    {['sql', 'prisma', 'drizzle'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => dispatch(setUIState({ codeSubTab: tab as any }))}
                            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-transform hover:scale-[0.98] active:scale-95 ease-[cubic-bezier(0.23,1,0.32,1)] duration-150 ${
                                codeSubTab === tab 
                                    ? 'bg-zinc-800 text-white shadow-sm' 
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                            }`}
                        >
                            {tab === 'sql' ? 'SQL' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-[#1E1E1E]">
                {/* CSS wrap via container classes */}
                <div className="h-full w-full whitespace-pre-wrap break-all [&>pre]:!whitespace-pre-wrap [&>pre]:!break-all">
                    <SyntaxHighlighter
                        language={codeSubTab === 'sql' ? 'sql' : 'typescript'}
                        style={vscDarkPlus}
                        customStyle={{
                            margin: 0,
                            padding: '16px',
                            background: 'transparent',
                            fontSize: '12px',
                            lineHeight: '1.5',
                        }}
                    >
                        {generatedCode}
                    </SyntaxHighlighter>
                </div>
            </div>
        </div>
    );
}
