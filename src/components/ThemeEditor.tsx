import { useTheme } from '@/context/ThemeContext';
import React from 'react';

export const ThemeEditor: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-md p-4">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Theme Settings</h3>
          <p className="text-sm text-zinc-400">
            Customize your database schema editor theme.
          </p>
        </div>
        
        <div className="border-t border-zinc-700 pt-4">
          <h4 className="text-md font-medium text-zinc-200 mb-2">Current Theme</h4>
          <div className="text-sm text-zinc-300">
            <p>Custom table colors: {Object.keys(theme.customColors).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};