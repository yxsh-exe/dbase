export type ConstraintType =
  | 'primary_key'
  | 'foreign_key'
  | 'unique'
  | 'not_null'
  | 'nullable'
  | 'check'
  | 'identity'
  | 'auto_increment'
  | 'index';

export interface EnhancedConstraint {
  type: ConstraintType;
  name?: string;
  definition?: string; // for check constraints
  referencedTable?: string; // for FK
  referencedField?: string; // for FK
  onUpdate?: 'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'NO_ACTION';
  onDelete?: 'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'NO_ACTION';
}

export interface Field {
  name: string;
  type: string;
  // Legacy boolean constraints (maintained for backward compatibility)
  primary?: boolean;
  nullable?: boolean;
  unique?: boolean;
  foreign?: boolean;
  // Enhanced constraint system
  constraints?: EnhancedConstraint[];
  length?: number;
  precision?: number;
  scale?: number;
  defaultValue?: string;
  check?: string;
  enumValues?: string[];
  // New properties for foreign key relationships
  referencedTable?: string;
  referencedField?: string;
}

export interface TableReference {
  sourceTableId: string;
  sourceTableName: string;
  foreignKeyField: string;
  referencedField: string;
}

export interface TableNodeData extends Record<string, unknown> {
  name: string;
  fields: Field[];
  color?: string; 
  references?: TableReference[];
  onUpdateTable?: (tableId: string, data: Partial<TableNodeData>) => void;
  onRemoveTable?: (tableId: string) => void;
  onAddField?: (tableId: string, field: Field) => void;
  onRemoveField?: (tableId: string, fieldIndex: number) => void;
  onUpdateField?: (tableId: string, fieldIndex: number, field: Field) => void;
  onTableClick?: (tableId: string) => void;
}
