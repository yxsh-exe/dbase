"use client";

import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { Fingerprint, Hash, Key, Link, Shield } from 'lucide-react';
import { ConstraintType } from './types/Field';

interface ConstraintSelectorProps {
  value: ConstraintType[];
  onChange: (constraints: ConstraintType[]) => void;
  className?: string;
  disabled?: boolean;
  excludeForeignKey?: boolean; // For use in places where FK is handled separately
}

export const constraintOptions: MultiSelectOption[] = [
  {
    label: 'Primary Key',
    value: 'primary_key',
    icon: <Key className="w-3 h-3" />,
    color: 'yellow',
    description: 'Uniquely identifies each record'
  },
  {
    label: 'Foreign Key',
    value: 'foreign_key',
    icon: <Link className="w-3 h-3" />,
    color: 'blue',
    description: 'References another table\'s primary key'
  },
  {
    label: 'Unique',
    value: 'unique',
    icon: <Fingerprint className="w-3 h-3" />,
    color: 'purple',
    description: 'Ensures all values in the column are different'
  },
  {
    label: 'Nullable',
    value: 'nullable',
    icon: <Shield className="w-3 h-3" />,
    color: 'red',
    description: 'Column can contain null values'
  },
  {
    label: 'Identity',
    value: 'identity',
    icon: <Hash className="w-3 h-3" />,
    color: 'emerald',
    description: 'Auto-incrementing column'
  }
];

// Constraint validation rules
export const validateConstraintCombination = (constraints: ConstraintType[]): string[] => {
  const errors: string[] = [];
  const constraintSet = new Set(constraints);

  // Primary key implies unique and not null
  if (constraintSet.has('primary_key')) {
    if (constraintSet.has('unique')) {
      errors.push('Primary Key already implies Unique constraint');
    }
    if (constraintSet.has('not_null')) {
      errors.push('Primary Key already implies Not Null constraint');
    }
    if (constraintSet.has('nullable')) {
      errors.push('Primary Key cannot be nullable');
    }
  }

  // Only one primary key per table (this should be validated at table level)
  // Foreign key requires reference information (validated elsewhere)

  return errors;
};

// Helper function to convert constraints to legacy boolean format
export const constraintsToLegacyFormat = (constraints: ConstraintType[]) => {
  const constraintSet = new Set(constraints);
  return {
    primary: constraintSet.has('primary_key'),
    unique: constraintSet.has('unique') || constraintSet.has('primary_key'),
    nullable: constraintSet.has('nullable') || (!constraintSet.has('not_null') && !constraintSet.has('primary_key')),
    foreign: constraintSet.has('foreign_key')
  };
};

// Helper function to convert legacy boolean format to constraints
export const legacyFormatToConstraints = (field: {
  primary?: boolean;
  unique?: boolean;
  nullable?: boolean;
  foreign?: boolean;
}): ConstraintType[] => {
  const constraints: ConstraintType[] = [];

  if (field.primary) {
    constraints.push('primary_key');
  } else {
    if (field.unique) constraints.push('unique');
    if (field.nullable === false) constraints.push('not_null');
    else if (field.nullable === true) constraints.push('nullable');
  }
  if (field.foreign) constraints.push('foreign_key');

  return constraints;
};

export function ConstraintSelector({
  value,
  onChange,
  className,
  disabled = false,
  excludeForeignKey = false
}: ConstraintSelectorProps) {
  const availableOptions = excludeForeignKey
    ? constraintOptions.filter(opt => opt.value !== 'foreign_key')
    : constraintOptions;

  const handleChange = (newValues: string[]) => {
    let newConstraints = newValues as ConstraintType[];

    // Auto-selection logic for primary key
    if (newConstraints.includes('primary_key')) {
      // Remove conflicting constraints and add implied ones
      newConstraints = newConstraints.filter(c => c !== 'nullable');
      // Primary key automatically implies unique, so add it if not present
      if (!newConstraints.includes('unique')) {
        newConstraints.push('unique');
      }
    }

    // Validate constraint combination
    const errors = validateConstraintCombination(newConstraints);
    if (errors.length > 0) {
      // For now, we'll still allow the change but could show warnings
      console.warn('Constraint validation warnings:', errors);
    }

    onChange(newConstraints);
  };

  // For foreign key fields, show limited options
  const isForeignKeyField = value.includes('foreign_key');
  const isPrimaryKeySelected = value.includes('primary_key');
  
  let finalOptions: MultiSelectOption[];
  
  if (isForeignKeyField) {
    finalOptions = constraintOptions.filter(opt => opt.value === 'foreign_key' || opt.value === 'nullable');
  } else {
    // Create a copy of available options with dynamic disabled state
    finalOptions = availableOptions.map(option => ({
      ...option,
      // Disable nullable option when primary key is selected
      disabled: option.value === 'nullable' && isPrimaryKeySelected
    }));
  }

  return (
    <MultiSelect
      options={finalOptions}
      value={value}
      onChange={handleChange}
      placeholder="Select constraints..."
      className={className}
      disabled={disabled || isForeignKeyField}
      maxCount={4} // Show max 4 badges before collapsing
    />
  );
}

// Utility component to display constraint badges
export function ConstraintBadges({ constraints }: { constraints: ConstraintType[] }) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cyan':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'gray':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {constraints.map((constraint) => {
        const option = constraintOptions.find(opt => opt.value === constraint);
        if (!option) return null;

        return (
          <div
            key={constraint}
            className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded-md border ${getColorClasses(option.color || 'gray')}`}
          >
            {option.icon}
            <span className="ml-1">{option.label}</span>
          </div>
        );
      })}
    </div>
  );
}