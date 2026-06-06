'use client';

import React from 'react';
import { useAppSelector } from '@/store/hooks';

// Extracted Components
import { SidebarNavigation } from './sidebar/SidebarNavigation';
import { SidebarTables } from './sidebar/SidebarTables';
import { SidebarReferences } from './sidebar/SidebarReferences';
import { SidebarCodeViewer } from './sidebar/SidebarCodeViewer';

export function EditorSidebar() {
    const isCollapsed = useAppSelector(state => state.editor.ui.isCollapsed);
    const activeTab = useAppSelector(state => state.editor.ui.activeTab);

    return (
        <div
            className="fixed left-3 top-[60px] z-30 flex"
            style={{ bottom: '16px', maxHeight: 'calc(100vh - 76px)' }}
        >
            {/* Left Icon Rail */}
            <SidebarNavigation />

            {/* Expanded Content Panel */}
            <div 
                className={`flex flex-col bg-zinc-950 border border-l-0 border-zinc-800 rounded-r-xl shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${
                    isCollapsed ? 'w-0 opacity-0 border-r-0' : 'w-[360px] opacity-100'
                }`}
            >
                {activeTab === 'tables' && <SidebarTables />}
                {activeTab === 'refs' && <SidebarReferences />}
                {activeTab === 'code' && <SidebarCodeViewer />}
            </div>
        </div>
    );
}
