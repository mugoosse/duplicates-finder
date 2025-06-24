export interface AppConfig {
  ignorePatterns: string[];
  defaultActions: Record<string, string>;
  reportOutputPath: string;
  colorScheme: 'auto' | 'always' | 'never';
  confirmDestructiveActions: boolean;
  maxFileSize: number;
  enableUndo: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  ignorePatterns: [
    'node_modules/',
    '.venv/',
    'venv/',
    'env/',
    '.git/',
    'dist/',
    'build/',
    'out/',
    '*.log',
    '*.tmp',
    '.DS_Store',
    'Thumbs.db'
  ],
  defaultActions: {},
  reportOutputPath: './duplicate-report.md',
  colorScheme: 'auto',
  confirmDestructiveActions: true,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  enableUndo: true
};