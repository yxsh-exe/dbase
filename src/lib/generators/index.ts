import { GeneratorOptions, GeneratedCode } from './types';
import { generateSql } from './sql';
import { generatePrisma } from './prisma';
import { generateDrizzle } from './drizzle';

export function generateSchemaCode(options: GeneratorOptions): GeneratedCode {
    return {
        sql: generateSql(options),
        prisma: generatePrisma(options),
        drizzle: generateDrizzle(options)
    };
}
