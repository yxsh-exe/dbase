export const MYSQL_TYPES: Record<string, readonly string[]> = {
  'Integer': ['tinyint', 'smallint', 'int', 'integer', 'mediumint', 'bigint'],
  'Exact Decimal': ['decimal', 'numeric'],
  'Float': ['float', 'double', 'real'],
  'Character': ['char', 'varchar', 'text', 'longtext', 'mediumtext', 'tinytext'],
  'Binary': ['binary', 'varbinary', 'blob', 'longblob', 'mediumblob', 'tinyblob', 'bit'],
  'Boolean': ['tinyint(1)', 'bool'],
  'Date & Time': ['date', 'time', 'datetime', 'timestamp', 'year'],
  'JSON': ['json'],
  'Enum / Set': ['enum', 'set'],
  'Geometric / Spatial': ['point', 'linestring', 'polygon', 'geometry'],
} as const;
