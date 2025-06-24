import { spawn } from 'child_process';
import { join } from 'path';
import { FileMetadata, ScanOptions, ScanResult } from '../types/file';
import { getFileMetadata, shouldIgnoreFile, calculateFileHash } from '../utils/file-utils';
import { logger } from '../utils/logger';

export class FileScanner {
  private scanOptions: ScanOptions;

  constructor(scanOptions: ScanOptions) {
    this.scanOptions = scanOptions;
  }

  async scan(): Promise<ScanResult> {
    const startTime = Date.now();
    logger.info('Starting file scan', { directory: this.scanOptions.directory });

    try {
      const filePaths = await this.getFilePathsWithEza();
      const files: FileMetadata[] = [];
      const directories: FileMetadata[] = [];
      let totalSize = 0;

      for (const filePath of filePaths) {
        if (shouldIgnoreFile(filePath, this.scanOptions.ignorePatterns)) {
          continue;
        }

        try {
          const metadata = await getFileMetadata(filePath);
          
          if (metadata.isDirectory) {
            directories.push(metadata);
          } else {
            // Calculate hash for content-based duplicate detection
            if (metadata.size > 0) {
              metadata.hash = await calculateFileHash(filePath);
            }
            files.push(metadata);
            totalSize += metadata.size;
          }
        } catch (error) {
          logger.warn('Failed to get metadata for file', { filePath, error });
          continue;
        }
      }

      const scanTime = Date.now() - startTime;
      logger.info('File scan completed', { 
        totalFiles: files.length, 
        totalDirectories: directories.length,
        totalSize,
        scanTime 
      });

      return {
        files,
        directories,
        totalFiles: files.length,
        totalSize,
        scanTime
      };
    } catch (error) {
      logger.error('File scan failed', { error });
      throw error;
    }
  }

  private async getFilePathsWithEza(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const args = [
        '--oneline',
        '--all',
        '--recurse',
        '--git-ignore',
        '--classify=never'  // Don't add type indicators
      ];

      if (this.scanOptions.maxDepth) {
        args.push('--level', this.scanOptions.maxDepth.toString());
      }

      args.push(this.scanOptions.directory);

      const ezaProcess = spawn('eza', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      ezaProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      ezaProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ezaProcess.on('close', (code) => {
        if (code !== 0) {
          logger.error('eza command failed', { code, errorOutput });
          reject(new Error(`eza command failed with code ${code}: ${errorOutput}`));
          return;
        }

        const filePaths: string[] = [];
        const lines = output.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        let currentDirectory = this.scanOptions.directory;

        for (const line of lines) {
          // Check if this line represents a directory header (ends with :)
          if (line.endsWith(':')) {
            // This is a directory path, update currentDirectory
            const dirPath = line.slice(0, -1); // Remove the trailing ':'
            if (dirPath.startsWith('./')) {
              // Relative path from base directory
              currentDirectory = join(this.scanOptions.directory, dirPath.slice(2));
            } else if (dirPath.startsWith(this.scanOptions.directory)) {
              // Already an absolute path
              currentDirectory = dirPath;
            } else {
              // Relative to the scan directory
              currentDirectory = join(this.scanOptions.directory, dirPath);
            }
          } else {
            // This is a file/directory name within the current directory
            const fullPath = join(currentDirectory, line);
            filePaths.push(fullPath);
          }
        }

        resolve(filePaths);
      });

      ezaProcess.on('error', (error) => {
        logger.error('Failed to execute eza command', { error });
        reject(new Error(`Failed to execute eza: ${error.message}`));
      });
    });
  }
}