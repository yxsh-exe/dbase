import { GeneratorOptions } from './types';
import { formatDataType } from '@/components/editor/nodes/DataTypeSelector';

export function generateSql({ nodes, edges, projectType }: GeneratorOptions): string {
    const lines: string[] = [];
    const dialect = projectType || 'PostgreSQL';

    lines.push(`-- SQL Generation for ${dialect}`);
    lines.push(`-- Generated automatically\n`);

    const sortedNodes: typeof nodes = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    function visit(nodeId: string) {
        if (visited.has(nodeId)) return;
        if (visiting.has(nodeId)) return; // skip circular dependencies
        visiting.add(nodeId);

        const dependencies = edges.filter(e => e.target === nodeId);
        for (const dep of dependencies) {
            visit(dep.source);
        }

        visiting.delete(nodeId);
        visited.add(nodeId);
        
        const node = nodeMap.get(nodeId);
        if (node) sortedNodes.push(node);
    }

    for (const node of nodes) {
        visit(node.id);
    }

    const indexLines: string[] = [];

    sortedNodes.forEach(node => {
        lines.push(`CREATE TABLE "${node.data.name}" (`);
        const fieldLines: string[] = [];
        
        // Add Fields
        node.data.fields.forEach(field => {
            const typeStr = formatDataType(field.type, field.length, field.precision, field.scale).toUpperCase();
            
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
        const targetEdges = edges.filter(e => e.target === node.id);
        targetEdges.forEach(edge => {
            const sourceNode = nodeMap.get(edge.source);
            if (sourceNode && edge.data?.targetField && edge.data?.sourceField) {
                const constraintName = `fk_${node.data.name}_${sourceNode.data.name}`;
                fieldLines.push(`  CONSTRAINT "${constraintName}" FOREIGN KEY ("${edge.data.targetField}") REFERENCES "${sourceNode.data.name}" ("${edge.data.sourceField}")`);
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
                indexLines.push(`CREATE ${idx.unique ? 'UNIQUE ' : ''}INDEX "${idx.name}" ON "${node.data.name}" (${cols});`);
            });
        }
    });

    if (indexLines.length > 0) {
        lines.push(indexLines.join('\n'));
        lines.push('');
    }

    return lines.join('\n');
}
