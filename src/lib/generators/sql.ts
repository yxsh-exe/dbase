import { GeneratorOptions } from './types';
import { formatDataType } from '@/components/editor/nodes/DataTypeSelector';

export function generateSql({ nodes, edges, projectType }: GeneratorOptions): string {
    const lines: string[] = [];
    const dialect = projectType || 'PostgreSQL';

    lines.push(`-- SQL Generation for ${dialect}`);
    lines.push(`-- Generated automatically\n`);

    nodes.forEach(node => {
        lines.push(`CREATE TABLE "${node.data.name}" (`);
        const fieldLines: string[] = [];
        
        // Add Fields
        node.data.fields.forEach(field => {
            const typeStr = formatDataType(field.type, field.length, field.precision, field.scale);
            
            let constraints = [];
            if (field.primary) constraints.push('PRIMARY KEY');
            if (field.unique && !field.primary) constraints.push('UNIQUE');
            if (!field.nullable && !field.primary) constraints.push('NOT NULL');
            
            // Basic Auto-increment mapping for simplicity
            if (field.identity) {
                if (dialect === 'PostgreSQL') constraints.push('GENERATED ALWAYS AS IDENTITY');
                else if (dialect === 'MySQL' || dialect === 'MariaDB') constraints.push('AUTO_INCREMENT');
                else if (dialect === 'SQL Server') constraints.push('IDENTITY(1,1)');
                else if (dialect === 'Oracle') constraints.push('GENERATED ALWAYS AS IDENTITY');
                else if (dialect === 'SQLite') constraints.push('AUTOINCREMENT');
            }

            fieldLines.push(`  "${field.name}" ${typeStr}${constraints.length > 0 ? ' ' + constraints.join(' ') : ''}`);
        });

        // Add Table-level Foreign Keys based on edges
        const incomingEdges = edges.filter(e => e.source === node.id);
        incomingEdges.forEach(edge => {
            const targetNode = nodes.find(n => n.id === edge.target);
            if (targetNode && edge.data?.sourceField && edge.data?.targetField) {
                fieldLines.push(`  FOREIGN KEY ("${edge.data.sourceField}") REFERENCES "${targetNode.data.name}" ("${edge.data.targetField}")`);
            }
        });

        // Add Check Constraints
        if (node.data.checkConstraints?.length) {
            node.data.checkConstraints.forEach(chk => {
                if (chk.condition) {
                    fieldLines.push(`  CONSTRAINT "${chk.name}" CHECK (${chk.condition})`);
                }
            });
        }

        lines.push(fieldLines.join(',\n'));
        lines.push(`);\n`);

        // Add Indexes
        if (node.data.indexes?.length) {
            node.data.indexes.forEach(idx => {
                const cols = idx.columns?.length ? idx.columns.map(c => `"${c}"`).join(', ') : '/* specify columns */';
                lines.push(`CREATE ${idx.unique ? 'UNIQUE ' : ''}INDEX "${idx.name}" ON "${node.data.name}" (${cols});`);
            });
            lines.push('');
        }
    });

    return lines.join('\n');
}
