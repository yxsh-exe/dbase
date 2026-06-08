import { Parser } from 'node-sql-parser';
import { Node, Edge } from '@xyflow/react';
import { TableNodeData, Field, ConstraintType, EnhancedConstraint } from '@/components/editor/nodes/types/Field';

export function parseSqlToNodes(sql: string, dialect: string = 'postgresql', merge: boolean = false) {
    const parser = new Parser();
    const opt = { database: dialect };
    const astList = parser.astify(sql, opt);
    
    const asts = Array.isArray(astList) ? astList : [astList];
    
    const nodes: Node<TableNodeData>[] = [];
    const edges: Edge[] = [];
    
    // Auto-layout starting coordinates
    let currentX = 100;
    let currentY = 100;
    const X_OFFSET = 350;
    const Y_OFFSET = 300;
    let index = 0;

    for (const ast of asts) {
        if (!ast) continue;

        if (ast.type === 'create' && ast.keyword === 'table') {
            const tableArray = ast.table as any[];
            const tableName = tableArray?.[0]?.table || (ast.table as any)?.table;
            
            const fields: Field[] = [];
            const tableId = `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Process columns and constraints
            if (ast.create_definitions) {
                for (const def of ast.create_definitions) {
                    if (def.resource === 'column') {
                        const columnName = (def.column as any)?.column;
                        const dataType = def.definition?.dataType || 'VARCHAR';
                        
                        const field: Field = {
                            name: columnName,
                            type: dataType.toUpperCase(),
                            constraints: []
                        };

                        // Primary Key
                        if ((def as any).primary_key) {
                            field.primary = true;
                            field.constraints!.push({ type: 'primary_key' });
                        }

                        // Not Null
                        if (def.nullable?.value === 'not null') {
                            field.nullable = false;
                            field.constraints!.push({ type: 'not_null' });
                        }

                        // Length
                        if (def.definition?.length) {
                            field.length = def.definition.length;
                        }

                        fields.push(field);
                    } else if (def.resource === 'constraint' && def.constraint_type === 'FOREIGN KEY') {
                        // Table-level foreign key constraint
                        const sourceColumn = (def.definition[0] as any)?.column;
                        const targetTable = (def.reference_definition?.table as any)?.[0]?.table || (def.reference_definition?.table as any)?.table;
                        const targetColumn = (def.reference_definition?.definition[0] as any)?.column;
                        
                        if (sourceColumn && targetTable && targetColumn) {
                            // Find the field and mark it as foreign
                            const field = fields.find(f => f.name === sourceColumn);
                            if (field) {
                                field.foreign = true;
                                field.referencedTable = targetTable;
                                field.referencedField = targetColumn;
                                field.constraints!.push({
                                    type: 'foreign_key',
                                    referencedTable: targetTable,
                                    referencedField: targetColumn
                                });
                            }
                        }
                    }
                }
            }

            nodes.push({
                id: tableName, // Using table name as ID temporarily for easy mapping of edges
                type: 'tableNode',
                position: { x: currentX, y: currentY },
                data: {
                    name: tableName,
                    fields,
                }
            });

            // Grid layout calculation
            index++;
            currentX += X_OFFSET;
            if (index % 4 === 0) {
                currentX = 100;
                currentY += Y_OFFSET;
            }
        }
    }

    // Now, let's create edges based on the defined foreign keys
    for (const node of nodes) {
        const tableData = node.data as TableNodeData;
        
        for (const field of tableData.fields) {
            if (field.foreign && field.referencedTable && field.referencedField) {
                // Find target node ID
                const targetNode = nodes.find(n => n.data.name === field.referencedTable);
                
                if (targetNode) {
                    const edgeId = `edge-${node.id}-${targetNode.id}-${field.name}`;
                    edges.push({
                        id: edgeId,
                        source: node.id,
                        target: targetNode.id,
                        sourceHandle: `${node.id}-${field.name}-source`,
                        targetHandle: `${targetNode.id}-${field.referencedField}-target`,
                        type: 'relation',
                        data: {
                            sourceField: field.name,
                            targetField: field.referencedField
                        }
                    });
                }
            }
        }
    }

    return { nodes, edges };
}
