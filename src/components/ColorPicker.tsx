import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

  const handlePresetClick = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium text-zinc-200">{label}</label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center w-6 h-6 rounded border border-zinc-700 hover:border-zinc-500 transition-colors"
            style={{ backgroundColor: value }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg" align="start">
          <div className="grid grid-cols-4 gap-2">
            {defaultColors.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-8 h-8 rounded border ${color === value ? 'border-white ring-2 ring-white/30' : 'border-zinc-600 hover:border-zinc-400'}`}
                style={{ backgroundColor: color }}
                onClick={() => handlePresetClick(color)}
                title={color}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};