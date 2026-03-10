import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export const ColorLegend: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-md p-4">
      <h3 className="text-sm font-semibold text-zinc-100 mb-3">Color Legend</h3>
      
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-medium text-zinc-300 mb-2">Custom Colors</h4>
          <div className="space-y-2">
            {Object.keys(theme.customColors).length > 0 ? (
              Object.entries(theme.customColors).map(([tableId, color]) => (
                <div key={tableId} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border border-zinc-600" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-zinc-200">Table {tableId}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-400">No custom colors set</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};