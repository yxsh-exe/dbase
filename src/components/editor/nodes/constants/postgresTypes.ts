export const POSTGRESQL_TYPES: Record<string, readonly string[]> = {
  'Date/Time': ['date', 'time', 'timetz', 'timestamp', 'timestamptz'],
  Boolean: ['bool'],
  Binary: ['bytea'],
  Numeric: ['int2', 'int4', 'int8', 'float4', 'float8', 'numeric'],
  JSON: ['json', 'jsonb'],
  Character: ['text', 'varchar'],
  UUID: ['uuid'],
} as const;
