import type { Edge, Node } from '@xyflow/react';
import type { TableNodeData } from '../nodes/types/Field';

export type SchemaFormat = 'sql' | 'prisma' | 'drizzle';

function toPascalCase(input: string): string {
  return input
    .replace(/[_\-\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (m) => m.toUpperCase());
}

function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function mapDbTypeToPrisma(dbType: string): string {
  // Handle array types
  const isArray = dbType.endsWith('[]');
  const baseType = isArray ? dbType.slice(0, -2) : dbType;
  const t = baseType.toLowerCase();
  
  let prismaType = 'String'; // default
  if (['int2', 'int4', 'integer', 'int'].includes(t)) prismaType = 'Int';
  else if (['int8', 'bigint'].includes(t)) prismaType = 'BigInt';
  else if (['float4', 'float8', 'double', 'real', 'numeric', 'decimal'].includes(t)) prismaType = 'Float';
  else if (['bool', 'boolean'].includes(t)) prismaType = 'Boolean';
  else if (['uuid'].includes(t)) prismaType = 'String';
  else if (['date', 'timestamp', 'timestamptz', 'time', 'timetz'].includes(t)) prismaType = 'DateTime';
  
  return isArray ? `${prismaType}[]` : prismaType;
}

function mapDbTypeToDrizzle(dbType: string): string {
  // Handle array types
  const isArray = dbType.endsWith('[]');
  const baseType = isArray ? dbType.slice(0, -2) : dbType;
  const t = baseType.toLowerCase();
  
  let drizzleType = 'text'; // default
  if (['int2', 'int4', 'integer', 'int'].includes(t)) drizzleType = 'integer';
  else if (['int8', 'bigint'].includes(t)) drizzleType = 'bigint';
  else if (['text', 'varchar', 'char'].includes(t)) drizzleType = 'text';
  else if (['bool', 'boolean'].includes(t)) drizzleType = 'boolean';
  else if (['uuid'].includes(t)) drizzleType = 'uuid';
  else if (['date'].includes(t)) drizzleType = 'date';
  else if (['timestamp', 'timestamptz'].includes(t)) drizzleType = 'timestamp';
  
  return drizzleType; // Drizzle arrays will be handled differently in the builder
}

export function generateSql(nodes: Node<TableNodeData>[]): string {
  const statements: string[] = [];

  for (const node of nodes) {
    const tableName = node.data.name;
    const columnLines: string[] = [];
    const pkFields = node.data.fields.filter((f) => !!f.primary).map((f) => `"${f.name}"`);
    const fkLines: string[] = [];

    for (const field of node.data.fields) {
      const parts: string[] = [];
      parts.push(`"${field.name}"`);
      const typeClause = (() => {
        const fieldType = field.type || 'text';
        const isArray = fieldType.endsWith('[]');
        const baseType = isArray ? fieldType.slice(0, -2) : fieldType;
        
        let sqlType = baseType;
        if (field.length) sqlType = `${baseType}(${field.length})`;
        else if (field.precision && field.scale) sqlType = `${baseType}(${field.precision}, ${field.scale})`;
        else if (field.precision) sqlType = `${baseType}(${field.precision})`;
        
        return isArray ? `${sqlType}[]` : sqlType;
      })();
      parts.push(typeClause);
      if (field.nullable === false) parts.push('NOT NULL');
      if (field.unique) parts.push('UNIQUE');
      if (field.defaultValue) {
        // Handle array default values
        const isArrayType = field.type?.endsWith('[]');
        if (isArrayType && field.defaultValue && !field.defaultValue.startsWith('{')) {
          parts.push(`DEFAULT '{${field.defaultValue}}'`);
        } else {
          parts.push(`DEFAULT ${field.defaultValue}`);
        }
      }
      columnLines.push(parts.join(' '));

      if (field.foreign && field.referencedTable) {
        const refTable = field.referencedTable;
        const refField = field.referencedField ?? 'id';
        fkLines.push(`FOREIGN KEY ("${field.name}") REFERENCES "${refTable}"("${refField}")`);
      }
    }

    if (pkFields.length === 1) {
      // inline primary key if single
      const pkName = pkFields[0]?.replaceAll('"', '');
      const idx = columnLines.findIndex((l) => l.startsWith(`"${pkName}"`));
      if (idx >= 0) columnLines[idx] = `${columnLines[idx]} PRIMARY KEY`;
    } else if (pkFields.length > 1) {
      columnLines.push(`PRIMARY KEY (${pkFields.join(', ')})`);
    }

    columnLines.push(...fkLines);
    const createStmt = `CREATE TABLE "${tableName}" (\n  ${columnLines.join(',\n  ')}\n);`;
    statements.push(createStmt);
  }

  return statements.join('\n\n');
}

export function generatePrisma(nodes: Node<TableNodeData>[]): string {
  const header = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;
  const lines: string[] = [header];
  for (const node of nodes) {
    const modelName = toPascalCase(node.data.name);
    lines.push(`model ${modelName} {`);

    for (const field of node.data.fields) {
      const prismaType = mapDbTypeToPrisma(field.type || 'text');
      const optional = field.nullable !== false ? '?' : '';
      const attributes: string[] = [];
      if (field.primary) attributes.push('@id');
      if (field.unique) attributes.push('@unique');
      
      // Handle default values for arrays and regular types
      if (field.defaultValue) {
        const isArrayType = field.type?.endsWith('[]');
        if (isArrayType) {
          // For arrays, wrap in brackets if not already done
          const defaultVal = field.defaultValue.startsWith('[') ? field.defaultValue : `[${field.defaultValue}]`;
          attributes.push(`@default(${defaultVal})`);
        } else {
          attributes.push(`@default(${field.defaultValue})`);
        }
      }
      
      const attrStr = attributes.length ? ' ' + attributes.join(' ') : '';
      lines.push(`  ${field.name} ${prismaType}${optional}${attrStr}`);
    }

    // add relation fields for foreign keys
    for (const field of node.data.fields) {
      if (field.foreign && field.referencedTable) {
        const relatedModel = toPascalCase(field.referencedTable);
        const fkField = field.name;
        const refField = field.referencedField ?? 'id';
        lines.push(
          `  ${toCamelCase(
            relatedModel,
          )} ${relatedModel}? @relation(fields: [${fkField}], references: [${refField}])`,
        );
      }
    }

    lines.push('}\n');
  }
  return lines.join('\n');
}

export function generateDrizzle(nodes: Node<TableNodeData>[]): string {
  const prelude = [
    `import { drizzle } from 'drizzle-orm/node-postgres'`,
    `import { Client } from 'pg'`,
    `import { pgTable, integer, bigint, text, boolean, uuid, date, timestamp } from 'drizzle-orm/pg-core'`,
    '',
    '// Example connection (uncomment and configure as needed):',
    '// const client = new Client({ connectionString: process.env.DATABASE_URL })',
    '// await client.connect()',
    '// export const db = drizzle(client)',
    '',
  ].join('\n');
  const blocks: string[] = [prelude];

  for (const node of nodes) {
    const tableConst = toCamelCase(node.data.name);
    const tableName = node.data.name;
    const columnLines: string[] = [];

    for (const field of node.data.fields) {
      const fieldType = field.type || 'text';
      const isArray = fieldType.endsWith('[]');
      const baseBuilder = mapDbTypeToDrizzle(fieldType);
      
      const parts: string[] = [];
      if (isArray) {
        // For arrays, use the array() wrapper
        parts.push(`${baseBuilder}("${field.name}").array()`);
      } else {
        parts.push(`${baseBuilder}("${field.name}")`);
      }
      
      if (field.nullable === false) parts.push('.notNull()');
      if (field.primary) parts.push('.primaryKey()');
      if (field.unique) parts.push('.unique()');
      
      if (field.defaultValue) {
        const isArrayType = field.type?.endsWith('[]');
        if (isArrayType) {
          // For arrays, ensure proper array format
          const defaultVal = field.defaultValue.startsWith('[') ? field.defaultValue : `[${field.defaultValue}]`;
          parts.push(`.default(${defaultVal})`);
        } else {
          parts.push(`.default(${field.defaultValue})`);
        }
      }
      
      if (field.foreign && field.referencedTable) {
        const refVar = toCamelCase(field.referencedTable);
        const refField = field.referencedField ?? 'id';
        parts.push(`.references(() => ${refVar}.${refField})`);
      }
      columnLines.push(`  ${field.name}: ${parts.join('')},`);
    }

    blocks.push(
      `export const ${tableConst} = pgTable('${tableName}', {\n${columnLines.join('\n')}\n});\n`,
    );
  }

  return blocks.join('\n');
}

export function convertSchema(
  nodes: Node<TableNodeData>[],
  edges: Edge[],
  format: SchemaFormat,
): string {
  switch (format) {
    case 'sql':
      return generateSql(nodes);
    case 'prisma':
      return generatePrisma(nodes);
    case 'drizzle':
      return generateDrizzle(nodes);
    default:
      return '';
  }
}
