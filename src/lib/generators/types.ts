import type { Node, Edge } from '@xyflow/react';
import type { TableNodeData, Field } from '@/components/editor/nodes/types/Field';

export interface GeneratorOptions {
    nodes: Node<TableNodeData>[];
    edges: Edge[];
    projectType: string;
}

export interface GeneratedCode {
    sql: string;
    prisma: string;
    drizzle: string;
}
