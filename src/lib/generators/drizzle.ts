import { GeneratorOptions } from './types';

function mapToDrizzleType(sqlType: string, dialect: string): string {
    const t = sqlType.toLowerCase();
    
    if (t.includes('varchar') || t.includes('char') || t.includes('text')) return 'text';
    if (t.includes('int') && !t.includes('bigint') && !t.includes('smallint')) return 'integer';
    if (t.includes('bigint')) return 'bigint';
    if (t.includes('smallint')) return 'smallint';
    if (t.includes('bool') || t.includes('bit')) return 'boolean';
    if (t.includes('timestamp')) return 'timestamp';
    if (t.includes('date')) return 'date';
    if (t.includes('time')) return 'time';
    if (t.includes('numeric') || t.includes('decimal')) return 'numeric';
    if (t.includes('real')) return 'real';
    if (t.includes('double')) return 'doublePrecision';
    if (t.includes('json')) return 'jsonb';
    if (t.includes('uuid')) return 'uuid';
    if (t.includes('blob') || t.includes('binary')) return 'blob';

    return 'text'; // Fallback
}

export function generateDrizzle({ nodes, edges, projectType }: GeneratorOptions): string {
    const lines: string[] = [];
    
    let tableImport = 'pgTable';
    let packageImport = 'drizzle-orm/pg-core';
    
    if (projectType === 'MySQL' || projectType === 'MariaDB') {
        tableImport = 'mysqlTable';
        packageImport = 'drizzle-orm/mysql-core';
    } else if (projectType === 'SQLite') {
        tableImport = 'sqliteTable';
        packageImport = 'drizzle-orm/sqlite-core';
    }

    lines.push(`import { sql } from "drizzle-orm";`);
    lines.push(`import { ${tableImport}, integer, text, boolean, timestamp, date, uuid, jsonb, numeric, index, check } from "${packageImport}";`);
    lines.push(``);

    nodes.forEach(node => {
        lines.push(`export const ${node.data.name} = ${tableImport}("${node.data.name}", {`);
        
        node.data.fields.forEach(field => {
            const dType = mapToDrizzleType(field.type, projectType);
            let fieldDef = `${dType}("${field.name}")`;

            if (field.primary) fieldDef += `.primaryKey()`;
            if (field.unique && !field.primary) fieldDef += `.unique()`;
            if (!field.nullable && !field.primary) fieldDef += `.notNull()`;
            
            // Drizzle has auto-increment chaining for integers
            if (field.identity && (dType === 'integer' || dType === 'bigint' || dType === 'smallint')) {
                // Not perfectly covering all DBs but generally accurate for pg/mysql
                if (projectType === 'PostgreSQL') {
                     // In PG usually identity is represented differently but we use .default()
                } else if (projectType === 'MySQL' || projectType === 'SQLite') {
                     fieldDef += `.autoincrement()`;
                }
            }

            // Drizzle Foreign keys inline: .references(() => otherTable.id)
            const incomingEdge = edges.find(e => e.source === node.id && e.data?.sourceField === field.name);
            if (incomingEdge) {
                const targetNode = nodes.find(n => n.id === incomingEdge.target);
                if (targetNode && incomingEdge.data?.targetField) {
                    fieldDef += `.references(() => ${targetNode.data.name}.${incomingEdge.data.targetField})`;
                }
            }

            lines.push(`  ${field.name}: ${fieldDef},`);
        });

        const extras: string[] = [];
        if (node.data.indexes?.length) {
            node.data.indexes.forEach(idx => {
                const cols = idx.columns?.length ? idx.columns.map(c => `table.${c}`).join(', ') : '/* columns */';
                extras.push(`    ${idx.name}: index('${idx.name}').on(${cols})`);
            });
        }
        if (node.data.checkConstraints?.length) {
            node.data.checkConstraints.forEach(chk => {
                extras.push(`    ${chk.name}: check('${chk.name}', sql\`${chk.condition}\`)`);
            });
        }

        if (extras.length > 0) {
            lines.push(`}, (table) => ({`);
            lines.push(extras.join(',\n'));
            lines.push(`}));`);
        } else {
            lines.push(`});`);
        }
        lines.push(``);
    });

    return lines.join('\n');
}
