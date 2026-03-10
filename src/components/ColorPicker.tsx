import React, { useState } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const defaultColors = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#6b7280', // gray-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
  '#f43f5e', // rose-500
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  const handlePresetClick = (color: string) => {
    setCustomColor(color);
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium text-zinc-200">{label}</label>}
      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md hover:border-zinc-500 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div 
            className="w-5 h-5 rounded border border-zinc-600" 
            style={{ backgroundColor: value }}
          />
          <span className="text-sm text-zinc-200">{value.toUpperCase()}</span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-64 p-3 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg">
            <div className="grid grid-cols-6 gap-2 mb-3">
              {defaultColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-6 h-6 rounded border ${color === value ? 'border-white ring-2 ring-white/30' : 'border-zinc-600 hover:border-zinc-400'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handlePresetClick(color)}
                  title={color}
                />
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(e.target.value)) {
                    onChange(e.target.value);
                  }
                }}
                className="flex-1 px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder="#000000"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};