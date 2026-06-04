import type { Edge, Node } from '@xyflow/react';
import type { TableNodeData } from '../nodes/types/Field';

export type SchemaFormat = 'sql' | 'prisma' | 'drizzle';
export type SqlDialect = 'postgresql' | 'mysql' | 'mssql' | 'sqlite';

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

function quoteIdent(ident: string, dialect: SqlDialect): string {
  switch (dialect) {
    case 'mysql': return `\`${ident}\``;
    case 'mssql': return `[${ident}]`;
    case 'postgresql':
    case 'sqlite':
    default:
      return `"${ident}"`;
  }
}

function mapSqlType(fieldType: string, dialect: SqlDialect): string {
  const t = fieldType.toLowerCase();
  const isArray = t.endsWith('[]');
  const baseType = isArray ? t.slice(0, -2) : t;

  let mappedType = baseType;

  if (dialect === 'mysql') {
    if (baseType === 'uuid') mappedType = 'varchar(36)';
    else if (baseType === 'text') mappedType = 'text';
    else if (['int2', 'int4', 'integer'].includes(baseType)) mappedType = 'int';
    else if (['int8', 'bigint'].includes(baseType)) mappedType = 'bigint';
    else if (['float8', 'double precision'].includes(baseType)) mappedType = 'double';
    else if (['timestamp', 'timestamptz'].includes(baseType)) mappedType = 'timestamp';
    // Fallback arrays to JSON
    if (isArray) return 'json';
  } else if (dialect === 'mssql') {
    if (baseType === 'uuid') mappedType = 'uniqueidentifier';
    else if (baseType === 'text') mappedType = 'nvarchar(max)';
    else if (baseType === 'varchar') mappedType = 'nvarchar';
    else if (['int2', 'int4', 'integer'].includes(baseType)) mappedType = 'int';
    else if (['int8', 'bigint'].includes(baseType)) mappedType = 'bigint';
    else if (['timestamp', 'timestamptz'].includes(baseType)) mappedType = 'datetime2';
    else if (baseType === 'boolean' || baseType === 'bool') mappedType = 'bit';
    if (isArray) return 'nvarchar(max)';
  } else if (dialect === 'sqlite') {
    if (['int2', 'int4', 'int8', 'integer', 'bigint'].includes(baseType)) mappedType = 'integer';
    else if (['float4', 'float8', 'double', 'real', 'numeric', 'decimal'].includes(baseType)) mappedType = 'real';
    else if (baseType === 'boolean' || baseType === 'bool') mappedType = 'integer'; // 0 or 1
    else mappedType = 'text'; // uuid, varchar, text, json, arrays all fall to text
    if (isArray) return 'text';
  }

  return isArray ? `${mappedType}[]` : mappedType; // postgres keeps arrays
}

export function generateSql(nodes: Node<TableNodeData>[], dialect: SqlDialect = 'postgresql'): string {
  const statements: string[] = [];

  for (const node of nodes) {
    const tableName = node.data.name;
    const qTableName = quoteIdent(tableName, dialect);
    const columnLines: string[] = [];
    const pkFields = node.data.fields.filter((f) => !!f.primary).map((f) => quoteIdent(f.name, dialect));
    const fkLines: string[] = [];

    for (const field of node.data.fields) {
      const parts: string[] = [];
      const qFieldName = quoteIdent(field.name, dialect);
      parts.push(qFieldName);
      
      const typeClause = (() => {
        const fieldType = field.type || 'text';
        const mappedBase = mapSqlType(fieldType, dialect);
        
        let sqlType = mappedBase;
        if (field.length && !mappedBase.includes('(')) sqlType = `${mappedBase}(${field.length})`;
        else if (field.precision && field.scale && !mappedBase.includes('(')) sqlType = `${mappedBase}(${field.precision}, ${field.scale})`;
        else if (field.precision && !mappedBase.includes('(')) sqlType = `${mappedBase}(${field.precision})`;
        
        return sqlType;
      })();
      parts.push(typeClause);

      // Identity/Auto-increment handling
      const isIdentity = (f: any) => {
        const dv = (f.defaultValue || '').toLowerCase();
        return /nextval\(|identity|serial|auto_increment|autoincrement/.test(dv);
      };

      if (isIdentity(field)) {
        if (dialect === 'mysql') parts.push('AUTO_INCREMENT');
        else if (dialect === 'mssql') parts.push('IDENTITY(1,1)');
        else if (dialect === 'sqlite' && field.primary && typeClause.toLowerCase() === 'integer') {
            // SQLite AUTOINCREMENT strictly works with INTEGER PRIMARY KEY
            // We'll append it after PRIMARY KEY below
        }
        else if (dialect === 'postgresql') parts.push('GENERATED ALWAYS AS IDENTITY');
      }

      if (field.nullable === false) parts.push('NOT NULL');
      if (field.unique) parts.push('UNIQUE');
      
      if (field.defaultValue && !isIdentity(field)) {
        let dv = field.defaultValue;
        if (dialect === 'mssql' && (dv === 'true' || dv === 'false')) {
            dv = dv === 'true' ? '1' : '0';
        } else if (dialect === 'sqlite' && (dv === 'true' || dv === 'false')) {
            dv = dv === 'true' ? '1' : '0';
        }
        
        // Handle array default values
        const isArrayType = field.type?.endsWith('[]');
        if (isArrayType && dialect === 'postgresql' && !dv.startsWith('{')) {
          parts.push(`DEFAULT '{${dv}}'`);
        } else {
          if (dv.includes('uuid_generate_v4()') || dv.includes('gen_random_uuid()')) {
              if (dialect === 'mysql') parts.push(`DEFAULT (UUID())`);
              else if (dialect === 'mssql') parts.push(`DEFAULT NEWID()`);
              else if (dialect === 'sqlite') parts.push(`DEFAULT (lower(hex(randomblob(16))))`);
              else parts.push(`DEFAULT ${dv}`);
          } else if (dv === 'now()') {
              if (dialect === 'mssql') parts.push(`DEFAULT GETDATE()`);
              else if (dialect === 'sqlite') parts.push(`DEFAULT CURRENT_TIMESTAMP`);
              else parts.push(`DEFAULT ${dv}`);
          } else {
              parts.push(`DEFAULT ${dv}`);
          }
        }
      }
      columnLines.push(parts.join(' '));

      if (field.foreign && field.referencedTable) {
        const refTable = quoteIdent(field.referencedTable, dialect);
        const refField = quoteIdent(field.referencedField ?? 'id', dialect);
        fkLines.push(`FOREIGN KEY (${qFieldName}) REFERENCES ${refTable}(${refField})`);
      }
    }

    if (pkFields.length === 1) {
      // inline primary key if single
      const idx = columnLines.findIndex((l) => l.startsWith(pkFields[0]));
      if (idx >= 0) {
          columnLines[idx] = `${columnLines[idx]} PRIMARY KEY`;
          // Append AUTOINCREMENT for SQLite if needed
          const isId = node.data.fields.find(f => quoteIdent(f.name, dialect) === pkFields[0]);
          if (isId && dialect === 'sqlite') {
            const dv = (isId.defaultValue || '').toLowerCase();
            if (/nextval\(|identity|serial|auto_increment|autoincrement/.test(dv)) {
                columnLines[idx] = `${columnLines[idx]} AUTOINCREMENT`;
            }
          }
      }
    } else if (pkFields.length > 1) {
      columnLines.push(`PRIMARY KEY (${pkFields.join(', ')})`);
    }

    columnLines.push(...fkLines);
    const createStmt = `CREATE TABLE ${qTableName} (\n  ${columnLines.join(',\n  ')}\n);`;
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
  dialect: SqlDialect = 'postgresql'
): string {
  switch (format) {
    case 'sql':
      return generateSql(nodes, dialect);
    case 'prisma':
      return generatePrisma(nodes);
    case 'drizzle':
      return generateDrizzle(nodes);
    default:
      return '';
  }
}
