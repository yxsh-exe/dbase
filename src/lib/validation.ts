import { Field, TableNodeData } from '@/components/editor/nodes/types/Field';
import { Node } from '@xyflow/react';

export type ValidationErrorType = 
  | 'TABLE_NAME_INVALID'
  | 'FIELD_NAME_INVALID'
  | 'DUPLICATE_FIELD_NAME'
  | 'ORPHANED_RELATIONSHIP'
  | 'INVALID_DATA_TYPE'
  | 'MISSING_PRIMARY_KEY'
  | 'MISSING_INDEX'
  | 'CONSTRAINT_CONFLICT';

export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  nodeId?: string;
  fieldIndex?: number;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  errors: ValidationError[];
  isValid: boolean;
}

/**
 * Validates table name according to standard database naming conventions
 */
export function validateTableName(name: string): ValidationError | null {
  if (!name || name.trim() === '') {
    return {
      type: 'TABLE_NAME_INVALID',
      message: 'Table name cannot be empty',
      severity: 'error'
    };
  }

  // Check for valid characters (alphanumeric, underscore only)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return {
      type: 'TABLE_NAME_INVALID',
      message: 'Table name must start with a letter or underscore and contain only letters, numbers, and underscores',
      severity: 'error'
    };
  }

  // Check for reserved keywords (common SQL keywords)
  const reservedKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'GROUP', 'ORDER', 
    'BY', 'HAVING', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL', 'CREATE',
    'DROP', 'ALTER', 'TABLE', 'INDEX', 'VIEW', 'DATABASE', 'PRIMARY', 'FOREIGN',
    'KEY', 'UNIQUE', 'CHECK', 'CONSTRAINT', 'DEFAULT', 'NULL', 'NOT', 'AND', 'OR'
  ];
  
  if (reservedKeywords.includes(name.toUpperCase())) {
    return {
      type: 'TABLE_NAME_INVALID',
      message: `Table name "${name}" is a reserved SQL keyword`,
      severity: 'warning'
    };
  }

  return null;
}

/**
 * Validates field name according to standard database naming conventions
 */
export function validateFieldName(name: string, existingNames: string[]): ValidationError | null {
  if (!name || name.trim() === '') {
    return {
      type: 'FIELD_NAME_INVALID',
      message: 'Field name cannot be empty',
      severity: 'error'
    };
  }

  // Check for valid characters (alphanumeric, underscore only)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return {
      type: 'FIELD_NAME_INVALID',
      message: 'Field name must start with a letter or underscore and contain only letters, numbers, and underscores',
      severity: 'error'
    };
  }

  // Check for duplicates
  if (existingNames.filter(n => n === name).length > 1) {
    return {
      type: 'DUPLICATE_FIELD_NAME',
      message: `Duplicate field name "${name}"`,
      severity: 'error'
    };
  }

  // Check for reserved keywords
  const reservedKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'GROUP', 'ORDER', 
    'BY', 'HAVING', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL', 'CREATE',
    'DROP', 'ALTER', 'TABLE', 'INDEX', 'VIEW', 'DATABASE', 'PRIMARY', 'FOREIGN',
    'KEY', 'UNIQUE', 'CHECK', 'CONSTRAINT', 'DEFAULT', 'NULL', 'NOT', 'AND', 'OR'
  ];
  
  if (reservedKeywords.includes(name.toUpperCase())) {
    return {
      type: 'FIELD_NAME_INVALID',
      message: `Field name "${name}" is a reserved SQL keyword`,
      severity: 'warning'
    };
  }

  return null;
}

/**
 * Validates data types
 */
export function validateDataType(field: Field): ValidationError | null {
  const validTypes = [
    'VARCHAR', 'CHAR', 'TEXT', 'INTEGER', 'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
    'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL', 'BOOLEAN', 'DATE', 'TIME',
    'TIMESTAMP', 'DATETIME', 'SERIAL', 'BIGSERIAL', 'UUID'
  ];
  
  // For simplicity, we'll just check if the type is a valid common type
  // In a real implementation, this would be more comprehensive
  const normalizedType = field.type.toUpperCase();
  const isValidType = validTypes.some(type => normalizedType.startsWith(type));
  
  if (!isValidType) {
    return {
      type: 'INVALID_DATA_TYPE',
      message: `Data type "${field.type}" may not be valid. Consider using a standard SQL type.`,
      severity: 'warning'
    };
  }
  
  return null;
}

/**
 * Checks for orphaned relationships (foreign keys that don't reference existing tables)
 */
export function validateRelationships(nodes: Node<TableNodeData>[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const tableNames = nodes.map(node => node.data.name);
  
  nodes.forEach(node => {
    node.data.fields.forEach((field, fieldIndex) => {
      // Check for foreign key constraints
      const foreignKeyConstraint = field.constraints?.find(c => c.type === 'foreign_key');
      
      if (foreignKeyConstraint && foreignKeyConstraint.referencedTable) {
        if (!tableNames.includes(foreignKeyConstraint.referencedTable)) {
          errors.push({
            type: 'ORPHANED_RELATIONSHIP',
            message: `Foreign key references non-existent table "${foreignKeyConstraint.referencedTable}"`,
            nodeId: node.id,
            fieldIndex,
            severity: 'error'
          });
        }
      }
      
      // Also check legacy foreign property
      if (field.foreign && field.referencedTable) {
        if (!tableNames.includes(field.referencedTable)) {
          errors.push({
            type: 'ORPHANED_RELATIONSHIP',
            message: `Foreign key references non-existent table "${field.referencedTable}"`,
            nodeId: node.id,
            fieldIndex,
            severity: 'error'
          });
        }
      }
    });
  });
  
  return errors;
}

/**
 * Checks if a table has a primary key
 */
export function validatePrimaryKey(table: TableNodeData, nodeId: string): ValidationError | null {
  const hasPrimaryKey = table.fields.some(field => {
    // Check both legacy and new constraint system
    return field.primary || 
           (field.constraints && field.constraints.some(c => c.type === 'primary_key'));
  });
  
  if (!hasPrimaryKey) {
    return {
      type: 'MISSING_PRIMARY_KEY',
      message: `Table "${table.name}" is missing a primary key. Consider adding one for data integrity.`,
      nodeId,
      severity: 'warning'
    };
  }
  
  return null;
}

/**
 * Checks for missing indexes on foreign keys
 */
export function validateIndexes(table: TableNodeData, nodeId: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  table.fields.forEach((field, fieldIndex) => {
    // Check for foreign key fields
    const isForeignKey = field.foreign || 
                         (field.constraints && field.constraints.some(c => c.type === 'foreign_key'));
    
    if (isForeignKey) {
      // Check if there's an index constraint
      const hasIndex = field.constraints && field.constraints.some(c => c.type === 'index');
      
      if (!hasIndex) {
        errors.push({
          type: 'MISSING_INDEX',
          message: `Foreign key field "${field.name}" should have an index for better performance`,
          nodeId,
          fieldIndex,
          severity: 'warning'
        });
      }
    }
  });
  
  return errors;
}

/**
 * Validates all constraints for conflicts
 */
export function validateConstraintConflicts(field: Field, fieldIndex: number, nodeId: string): ValidationError | null {
  // Check for conflicting constraints
  const constraints = field.constraints || [];
  
  // Primary key should imply NOT NULL
  const hasPrimaryKey = field.primary || constraints.some(c => c.type === 'primary_key');
  const explicitlyNullable = field.nullable === true;
  
  if (hasPrimaryKey && explicitlyNullable) {
    return {
      type: 'CONSTRAINT_CONFLICT',
      message: `Field "${field.name}" is marked as primary key but also as nullable. Primary keys are implicitly NOT NULL.`,
      nodeId,
      fieldIndex,
      severity: 'error'
    };
  }
  
  return null;
}

/**
 * Main validation function that runs all validation checks
 */
export function validateSchema(nodes: Node<TableNodeData>[]): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate each table
  nodes.forEach(node => {
    // Validate table name
    const tableNameError = validateTableName(node.data.name);
    if (tableNameError) {
      errors.push({
        ...tableNameError,
        nodeId: node.id
      });
    }
    
    // Collect field names for duplicate checking
    const fieldNames = node.data.fields.map(f => f.name);
    
    // Validate each field
    node.data.fields.forEach((field, fieldIndex) => {
      // Validate field name
      const fieldNameError = validateFieldName(field.name, fieldNames);
      if (fieldNameError) {
        errors.push({
          ...fieldNameError,
          nodeId: node.id,
          fieldIndex
        });
      }
      
      // Validate data type
      const dataTypeError = validateDataType(field);
      if (dataTypeError) {
        errors.push({
          ...dataTypeError,
          nodeId: node.id,
          fieldIndex
        });
      }
      
      // Validate constraint conflicts
      const constraintError = validateConstraintConflicts(field, fieldIndex, node.id);
      if (constraintError) {
        errors.push(constraintError);
      }
    });
    
    // Validate primary key
    const primaryKeyError = validatePrimaryKey(node.data, node.id);
    if (primaryKeyError) {
      errors.push(primaryKeyError);
    }
    
    // Validate indexes
    errors.push(...validateIndexes(node.data, node.id));
  });
  
  // Validate relationships
  errors.push(...validateRelationships(nodes));
  
  return {
    errors,
    isValid: errors.filter(e => e.severity === 'error').length === 0
  };
}

/**
 * Generates a validation report
 */
export function generateValidationReport(validationResult: ValidationResult): string {
  if (validationResult.isValid && validationResult.errors.length === 0) {
    return '✅ No issues found. Your schema is valid!';
  }
  
  const errors = validationResult.errors.filter(e => e.severity === 'error');
  const warnings = validationResult.errors.filter(e => e.severity === 'warning');
  
  let report = '';
  
  if (errors.length > 0) {
    report += `❌ ${errors.length} error${errors.length > 1 ? 's' : ''} found:\n`;
    errors.forEach((error, index) => {
      report += `  ${index + 1}. ${error.message}\n`;
    });
    report += '\n';
  }
  
  if (warnings.length > 0) {
    report += `⚠️  ${warnings.length} warning${warnings.length > 1 ? 's' : ''} found:\n`;
    warnings.forEach((warning, index) => {
      report += `  ${index + 1}. ${warning.message}\n`;
    });
  }
  
  if (errors.length === 0) {
    report += '\n✅ No critical errors found. Consider addressing the warnings for better schema design.';
  }
  
  return report;
}