'use client';

import React from 'react';
import { Table, Waypoints, Code2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUIState, toggleSidebar } from '@/store/slices/editorSlice';

export function SidebarNavigation() {
    const dispatch = useAppDispatch();
    const activeTab = useAppSelector(state => state.editor.ui.activeTab);
    const isCollapsed = useAppSelector(state => state.editor.ui.isCollapsed);

    return (
        <div className={`w-[60px] flex flex-col items-center py-4 border border-zinc-800 bg-zinc-950 shadow-2xl z-10 shrink-0 transition-all duration-200 ${isCollapsed ? 'rounded-xl' : 'rounded-l-xl border-r-0'}`}>
            <button
                className={`flex flex-col items-center justify-center gap-1.5 py-2 w-[52px] transition-transform ease-[cubic-bezier(0.23,1,0.32,1)] duration-150 rounded-xl hover:scale-[0.97] active:scale-95 ${activeTab === 'tables' ? 'text-pink-400 bg-pink-400/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                onClick={() => { 
                    dispatch(setUIState({ activeTab: 'tables', isCollapsed: false }));
                }}
            >
                <Table className="h-[18px] w-[18px]" />
                <span className="text-[10px] font-medium">Tables</span>
            </button>

            <button
                className={`flex flex-col items-center justify-center gap-1.5 py-2 w-[52px] mt-2 transition-transform ease-[cubic-bezier(0.23,1,0.32,1)] duration-150 rounded-xl hover:scale-[0.97] active:scale-95 ${activeTab === 'refs' ? 'text-pink-400 bg-pink-400/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                onClick={() => { 
                    dispatch(setUIState({ activeTab: 'refs', isCollapsed: false }));
                }}
            >
                <Waypoints className="h-[18px] w-[18px]" />
                <span className="text-[10px] font-medium">Refs</span>
            </button>

            <button
                className={`flex flex-col items-center justify-center gap-1.5 py-2 w-[52px] mt-2 transition-transform ease-[cubic-bezier(0.23,1,0.32,1)] duration-150 rounded-xl hover:scale-[0.97] active:scale-95 ${activeTab === 'code' ? 'text-pink-400 bg-pink-400/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                onClick={() => { 
                    dispatch(setUIState({ activeTab: 'code', isCollapsed: false }));
                }}
            >
                <Code2 className="h-[18px] w-[18px]" />
                <span className="text-[10px] font-medium">Code</span>
            </button>

            <div className="flex-1" />

            {/* Collapse button */}
            <button
                className="flex flex-col items-center justify-center gap-1.5 py-2 w-[52px] mt-auto transition-transform ease-[cubic-bezier(0.23,1,0.32,1)] duration-150 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 hover:scale-[0.97] active:scale-95"
                onClick={() => dispatch(toggleSidebar())}
            >
                <div className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6"/>
                    </svg>
                </div>
            </button>
        </div>
    );
}
