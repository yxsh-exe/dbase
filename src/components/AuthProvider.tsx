'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSession as useBetterAuthSession } from '@/lib/auth-client';

type SessionData = ReturnType<typeof useBetterAuthSession>['data'];
type SessionContextType = {
    data: SessionData;
    isPending: boolean;
};

const AuthContext = createContext<SessionContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { data, isPending } = useBetterAuthSession();

    return (
        <AuthContext.Provider value={{ data, isPending }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useSession() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        return { data: null, isPending: false }; // Fallback or throw error if not wrapped
    }
    return context;
}
