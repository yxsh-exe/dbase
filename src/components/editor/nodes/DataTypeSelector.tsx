"use client";

import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { POSTGRESQL_TYPES } from './constants/postgresTypes';
import { Badge } from '@/components/ui/badge';

interface DataTypeSelectorProps {
  value: string;
  onChange: (type: string, length?: number, precision?: number, scale?: number) => void;
  className?: string;
  compact?: boolean; // For grid usage
  length?: number;
  precision?: number;
  scale?: number;
}

export function DataTypeSelector({
  value,
  onChange,
  className,
  compact = false,
  length,
  precision,
  scale
}: DataTypeSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Character');
  const [selectedType, setSelectedType] = useState(value || 'varchar');
  const [typeLength, setTypeLength] = useState<string>(length?.toString() || '');
  const [typePrecision, setTypePrecision] = useState<string>(precision?.toString() || '');
  const [typeScale, setTypeScale] = useState<string>(scale?.toString() || '');

  // Initialize category based on current type
  useEffect(() => {
    const baseType = value?.replace('[]', '') || 'varchar';
    const category = Object.entries(POSTGRESQL_TYPES).find(([, types]) =>
      types.includes(baseType)
    )?.[0] || 'Character';
    setSelectedCategory(category);
    setSelectedType(baseType);
  }, [value]);

  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);

    // Determine if type needs parameters
    const needsLength = ['varchar', 'char'].includes(newType);
    const needsPrecisionScale = ['numeric', 'decimal'].includes(newType);


    // Call onChange with appropriate parameters
    const lengthValue = needsLength && typeLength ? parseInt(typeLength) : undefined;
    const precisionValue = needsPrecisionScale && typePrecision ? parseInt(typePrecision) : undefined;
    const scaleValue = needsPrecisionScale && typeScale ? parseInt(typeScale) : undefined;

    onChange(newType, lengthValue, precisionValue, scaleValue);
  };

  const handleParameterChange = () => {
    const lengthValue = typeLength ? parseInt(typeLength) : undefined;
    const precisionValue = typePrecision ? parseInt(typePrecision) : undefined;
    const scaleValue = typeScale ? parseInt(typeScale) : undefined;

    onChange(selectedType, lengthValue, precisionValue, scaleValue);
  };

  const needsLength = ['varchar', 'char'].includes(selectedType);
  const needsPrecisionScale = ['numeric', 'decimal'].includes(selectedType);

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Select value={selectedType} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-8 text-xs border-zinc-600 bg-zinc-800 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white">
            {Object.entries(POSTGRESQL_TYPES).map(([category, types]) => (
              <div key={category}>
                <div className="px-2 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  {category}
                </div>
                {types.map((type) => (
                  <SelectItem
                    key={type}
                    value={type}
                    className="text-zinc-100 focus:bg-zinc-800 text-xs"
                  >
                    {type}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>

        {(needsLength || needsPrecisionScale) && (
          <div className="flex items-center gap-1 ">
            {needsLength && (
              <Input
                type="number"
                value={typeLength}
                onChange={(e) => {
                  setTypeLength(e.target.value);
                  setTimeout(handleParameterChange, 100);
                }}
                placeholder="255"
                className="w-16 h-8 px-1 text-xs border-zinc-600 bg-zinc-800 text-white [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
            )}
            {needsPrecisionScale && (
              <>
                <Input
                  type="number"
                  value={typePrecision}
                  onChange={(e) => {
                    setTypePrecision(e.target.value);
                    setTimeout(handleParameterChange, 100);
                  }}
                  placeholder="10"
                  className="w-16 h-8 px-1 text-xs border-zinc-600 bg-zinc-800 text-white [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
                <span className="text-zinc-400 text-xs">**</span>
                <Input
                  type="number"
                  value={typeScale}
                  onChange={(e) => {
                    setTypeScale(e.target.value);
                    setTimeout(handleParameterChange, 100);
                  }}
                  placeholder="2"
                  className="w-16 h-8 px-1 text-xs border-zinc-600 bg-zinc-800 text-white [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full version for dialogs
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-100">Category</label>
          <Select
            value={selectedCategory}
            onValueChange={(category) => {
              setSelectedCategory(category);
              const firstType = POSTGRESQL_TYPES[category as keyof typeof POSTGRESQL_TYPES][0];
              handleTypeChange(firstType);
            }}
          >
            <SelectTrigger className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 focus:border-white rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-2 border-white rounded-none">
              {Object.keys(POSTGRESQL_TYPES).map(category => (
                <SelectItem key={category} value={category} className="text-zinc-100 focus:bg-zinc-800 rounded-none">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-100">Type</label>
          <Select value={selectedType} onValueChange={handleTypeChange}>
            <SelectTrigger className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 focus:border-white rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-2 border-white rounded-none">
              {POSTGRESQL_TYPES[selectedCategory as keyof typeof POSTGRESQL_TYPES].map(type => (
                <SelectItem key={type} value={type} className="text-zinc-100 focus:bg-zinc-800 rounded-none">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Type-specific parameters */}
      {(needsLength || needsPrecisionScale) && (
        <div className="grid grid-cols-3 gap-3">
          {needsLength && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-100">Length</label>
              <Input
                type="number"
                value={typeLength}
                onChange={(e) => {
                  setTypeLength(e.target.value);
                  handleParameterChange();
                }}
                placeholder="255"
                className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 placeholder:text-zinc-400 focus:border-white rounded-none"
              />
            </div>
          )}
          {needsPrecisionScale && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-100">Precision</label>
                <Input
                  type="number"
                  value={typePrecision}
                  onChange={(e) => {
                    setTypePrecision(e.target.value);
                    handleParameterChange();
                  }}
                  placeholder="10"
                  className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 placeholder:text-zinc-400 focus:border-white rounded-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-100">Scale</label>
                <Input
                  type="number"
                  value={typeScale}
                  onChange={(e) => {
                    setTypeScale(e.target.value);
                    handleParameterChange();
                  }}
                  placeholder="2"
                  className="bg-zinc-800 border-2 border-zinc-600 text-zinc-100 placeholder:text-zinc-400 focus:border-white rounded-none"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Utility to format type display with parameters
export function formatDataType(type: string, length?: number, precision?: number, scale?: number): string {
  let typeStr = type;
  if (length) {
    typeStr += `(${length})`;
  } else if (precision && scale) {
    typeStr += `(${precision},${scale})`;
  } else if (precision) {
    typeStr += `(${precision})`;
  }
  return typeStr;
}

// Type info badge component
export function TypeInfoBadge({ type, length, precision, scale }: {
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
}) {
  const formattedType = formatDataType(type, length, precision, scale);

  return (
    <Badge variant="outline" className="text-xs font-mono bg-zinc-800 border-zinc-600 text-zinc-300">
      {formattedType}
    </Badge>
  );
}