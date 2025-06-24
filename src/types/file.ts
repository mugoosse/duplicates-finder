export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  modified: Date;
  created: Date;
  isDirectory: boolean;
  hash?: string;
  extension?: string;
}

export interface ScanOptions {
  directory: string;
  includeHidden: boolean;
  followSymlinks: boolean;
  ignorePatterns: string[];
  maxDepth?: number;
}

export interface ScanResult {
  files: FileMetadata[];
  directories: FileMetadata[];
  totalFiles: number;
  totalSize: number;
  scanTime: number;
}