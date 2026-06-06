export const ORACLE_TYPES: Record<string, readonly string[]> = {
  'Integer': ['number', 'smallint', 'integer', 'bigint'],
  'Exact Decimal': ['number'],
  'Float': ['binary_float', 'binary_double', 'float'],
  'Character': ['char', 'varchar2', 'clob'],
  'Unicode': ['nchar', 'nvarchar2', 'nclob'],
  'Binary': ['raw', 'blob', 'bfile'],
  'Date & Time': ['date', 'timestamp', 'timestamp with time zone', 'interval year to month', 'interval day to second'],
  'JSON': ['json'],
  'XML': ['xmltype'],
  'Geometric / Spatial': ['sdo_geometry'],
  'Row identifiers': ['rowid', 'urowid'],
} as const;
