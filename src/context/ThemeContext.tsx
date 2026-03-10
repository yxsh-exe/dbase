"use client";
import React, { createContext, ReactNode, useContext, useState } from 'react';

// Define types for our theme
export interface ThemeConfig {
  customColors: Record<string, string>; // key is table ID, value is color
}

interface ThemeContextType {
  theme: ThemeConfig;
  updateTheme: (newTheme: ThemeConfig) => void;
  setCustomTableColor: (tableId: string, color: string) => void;
  getTableColor: (tableId?: string) => { bgColor: string; textColor: string };
}

// Default theme configuration with grey default
const defaultTheme: ThemeConfig = {
  customColors: {},
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    // Use in-memory storage instead of localStorage for Claude.ai compatibility
    return defaultTheme;
  });

  const updateTheme = (newTheme: ThemeConfig) => {
    setTheme(newTheme);
  };

  const setCustomTableColor = (tableId: string, color: string) => {
    setTheme(prev => ({
      ...prev,
      customColors: {
        ...prev.customColors,
        [tableId]: color,
      },
    }));
  };

  const getTableColor = (tableId?: string) => {
    // Check for custom color
    if (tableId && theme.customColors[tableId]) {
      return { bgColor: theme.customColors[tableId], textColor: '#ffffff' };
    }

    // Return default color
    return { bgColor: '#374151', textColor: '#ffffff' }; // gray-700
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        updateTheme,
        setCustomTableColor,
        getTableColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};