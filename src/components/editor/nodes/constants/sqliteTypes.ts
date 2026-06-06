export const SQLITE_TYPES: Record<string, readonly string[]> = {
  'Integer': ['integer'],
  'Exact Decimal': ['numeric'],
  'Float': ['real'],
  'Character': ['text'],
  'Binary': ['blob'],
} as const;
