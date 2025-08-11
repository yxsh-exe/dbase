export interface Field {
  name: string;
  type: string;
  primary?: boolean;
  nullable?: boolean;
  unique?: boolean;
  foreign?: boolean;
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
  references?: TableReference[];
  onUpdateTable?: (tableId: string, data: Partial<TableNodeData>) => void;
  onRemoveTable?: (tableId: string) => void;
  onAddField?: (tableId: string, field: Field) => void;
  onRemoveField?: (tableId: string, fieldIndex: number) => void;
  onUpdateField?: (tableId: string, fieldIndex: number, field: Field) => void;
  onTableClick?: (tableId: string) => void;
}
