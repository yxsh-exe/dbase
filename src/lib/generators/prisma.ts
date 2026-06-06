import { GeneratorOptions } from './types';

function mapToPrismaType(sqlType: string): string {
    const t = sqlType.toLowerCase();
    if (t.includes('int')) return 'Int';
    if (t.includes('char') || t.includes('text')) return 'String';
    if (t.includes('bool') || t.includes('bit')) return 'Boolean';
    if (t.includes('date') || t.includes('time')) return 'DateTime';
    if (t.includes('numeric') || t.includes('decimal') || t.includes('real') || t.includes('float') || t.includes('double')) return 'Float';
    if (t.includes('json')) return 'Json';
    if (t.includes('uuid')) return 'String';
    if (t.includes('blob') || t.includes('binary')) return 'Bytes';
    return 'String'; // fallback
}

export function generatePrisma({ nodes, edges, projectType }: GeneratorOptions): string {
    const lines: string[] = [];
    
    let provider = 'postgresql';
    if (projectType === 'MySQL') provider = 'mysql';
    else if (projectType === 'SQLite') provider = 'sqlite';
    else if (projectType === 'SQL Server') provider = 'sqlserver';

    lines.push(`generator client {`);
    lines.push(`  provider = "prisma-client"`);
    lines.push(`  output   = "./generated/client"`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`datasource db {`);
    lines.push(`  provider = "${provider}"`);
    lines.push(`}`);
    lines.push(``);

    nodes.forEach(node => {
        lines.push(`model ${node.data.name} {`);
        
        node.data.fields.forEach(field => {
            let pType = mapToPrismaType(field.type);
            let pAttrs = [];

            if (field.primary) pAttrs.push('@id');
            if (field.identity || field.type.includes('serial')) pAttrs.push('@default(autoincrement())');
            if (field.type === 'uuid' && field.primary) pAttrs.push('@default(uuid())');
            if (field.unique && !field.primary) pAttrs.push('@unique');

            const isOptional = field.nullable ? '?' : '';
            
            lines.push(`  ${field.name} ${pType}${isOptional} ${pAttrs.join(' ')}`.trimEnd());
        });

        // Outgoing edges (where this node is the TARGET, so it HAS the foreign key)
        const outgoingEdges = edges.filter(e => e.target === node.id);
        outgoingEdges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            if (sourceNode && edge.data?.sourceField && edge.data?.targetField) {
                const relationName = `${sourceNode.data.name.toLowerCase()}_${node.data.name.toLowerCase()}`;
                lines.push(`  ${sourceNode.data.name.toLowerCase()} ${sourceNode.data.name} @relation("${relationName}", fields: [${edge.data.targetField}], references: [${edge.data.sourceField}])`);
            }
        });

        // Incoming edges (where this node is the SOURCE, so it is REFERENCED by others)
        const incomingEdges = edges.filter(e => e.source === node.id);
        incomingEdges.forEach(edge => {
            const targetNode = nodes.find(n => n.id === edge.target);
            if (targetNode) {
                const relationName = `${node.data.name.toLowerCase()}_${targetNode.data.name.toLowerCase()}`;
                lines.push(`  ${targetNode.data.name.toLowerCase()}s ${targetNode.data.name}[] @relation("${relationName}")`);
            }
        });

        // Add Indexes and Constraints
        if (node.data.indexes?.length) {
            node.data.indexes.forEach(idx => {
                const cols = idx.columns?.length ? idx.columns.join(', ') : '';
                if (cols) {
                    lines.push(`  @@index([${cols}], map: "${idx.name}")`);
                } else {
                    lines.push(`  // @@index([], map: "${idx.name}") // Add columns to index`);
                }
            });
        }
        
        if (node.data.checkConstraints?.length) {
            node.data.checkConstraints.forEach(chk => {
                lines.push(`  // @@check("${chk.name}", "${chk.condition}")`);
            });
        }

        lines.push(`}`);
        lines.push(``);
    });

    return lines.join('\n');
}
