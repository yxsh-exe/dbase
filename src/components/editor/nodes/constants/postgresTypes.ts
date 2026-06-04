export const POSTGRESQL_TYPES: Record<string, readonly string[]> = {
  'Date/Time': ['date', 'time', 'timestamp'],
  Boolean: ['boolean'],
  Binary: ['blob', 'binary'],
  Numeric: ['smallint', 'integer', 'bigint', 'decimal', 'numeric', 'real', 'double precision'],
  JSON: ['json'],
  Character: ['text', 'varchar', 'char'],
  UUID: ['uuid'],
} as const;
