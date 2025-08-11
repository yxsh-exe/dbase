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
  const t = dbType.toLowerCase();
  if (['int2', 'int4', 'integer', 'int'].includes(t)) return 'Int';
  if (['int8', 'bigint'].includes(t)) return 'BigInt';
  if (['float4', 'float8', 'double', 'real', 'numeric', 'decimal'].includes(t)) return 'Float';
  if (['bool', 'boolean'].includes(t)) return 'Boolean';
  if (['uuid'].includes(t)) return 'String';
  if (['date', 'timestamp', 'timestamptz', 'time', 'timetz'].includes(t)) return 'DateTime';
  return 'String';
}

function mapDbTypeToDrizzle(dbType: string): string {
  const t = dbType.toLowerCase();
  if (['int2', 'int4', 'integer', 'int'].includes(t)) return 'integer';
  if (['int8', 'bigint'].includes(t)) return 'bigint';
  if (['text', 'varchar', 'char'].includes(t)) return 'text';
  if (['bool', 'boolean'].includes(t)) return 'boolean';
  if (['uuid'].includes(t)) return 'uuid';
  if (['date'].includes(t)) return 'date';
  if (['timestamp', 'timestamptz'].includes(t)) return 'timestamp';
  // default to text builder
  return 'text';
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
        const base = field.type || 'text';
        if (field.length) return `${base}(${field.length})`;
        if (field.precision && field.scale) return `${base}(${field.precision}, ${field.scale})`;
        if (field.precision) return `${base}(${field.precision})`;
        return base;
      })();
      parts.push(typeClause);
      if (field.nullable === false) parts.push('NOT NULL');
      if (field.unique) parts.push('UNIQUE');
      if (field.defaultValue) parts.push(`DEFAULT ${field.defaultValue}`);
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
      // basic default passthrough
      if (field.defaultValue) attributes.push(`@default(${field.defaultValue})`);
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
      const builder = mapDbTypeToDrizzle(field.type || 'text');
      const parts: string[] = [];
      parts.push(`${builder}("${field.name}")`);
      if (field.nullable === false) parts.push('.notNull()');
      if (field.primary) parts.push('.primaryKey()');
      if (field.unique) parts.push('.unique()');
      if (field.defaultValue) parts.push(`.default(${field.defaultValue})`);
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
