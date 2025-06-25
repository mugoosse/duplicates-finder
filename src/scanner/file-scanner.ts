import { promises as fs } from "fs"
import { join, relative } from "path"
import { FileMetadata, ScanOptions, ScanResult } from "../types/file"
import {
  getFileMetadata,
  shouldIgnoreFile,
  calculateFileHash
} from "../utils/file-utils"
import { GitignoreParser } from "../utils/gitignore-parser"
import { logger } from "../utils/logger"

export class FileScanner {
  private scanOptions: ScanOptions

  constructor(scanOptions: ScanOptions) {
    this.scanOptions = scanOptions
  }

  async scan(): Promise<ScanResult> {
    const startTime = Date.now()
    logger.info("Starting file scan", { directory: this.scanOptions.directory })

    try {
      const filePaths = await this.getFilePathsNative()
      const files: FileMetadata[] = []
      const directories: FileMetadata[] = []
      let totalSize = 0

      for (const filePath of filePaths) {
        if (shouldIgnoreFile(filePath, this.scanOptions.ignorePatterns)) {
          continue
        }

        try {
          const metadata = await getFileMetadata(filePath)

          if (metadata.isDirectory) {
            directories.push(metadata)
          } else {
            // Calculate hash for content-based duplicate detection
            if (metadata.size > 0) {
              metadata.hash = await calculateFileHash(filePath)
            }
            files.push(metadata)
            totalSize += metadata.size
          }
        } catch (error) {
          logger.warn("Failed to get metadata for file", { filePath, error })
          continue
        }
      }

      const scanTime = Date.now() - startTime
      logger.info("File scan completed", {
        totalFiles: files.length,
        totalDirectories: directories.length,
        totalSize,
        scanTime
      })

      return {
        files,
        directories,
        totalFiles: files.length,
        totalSize,
        scanTime
      }
    } catch (error) {
      logger.error("File scan failed", { error })
      throw error
    }
  }

  private async getFilePathsNative(): Promise<string[]> {
    const filePaths: string[] = []
    const gitignoreParser = await GitignoreParser.createCombinedParser(
      this.scanOptions.directory
    )

    const scanDirectory = async (
      directory: string,
      currentDepth: number = 0
    ): Promise<void> => {
      // Check depth limit
      if (
        this.scanOptions.maxDepth &&
        currentDepth >= this.scanOptions.maxDepth
      ) {
        return
      }

      try {
        const entries = await fs.readdir(directory, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = join(directory, entry.name)
          const relativePath = relative(this.scanOptions.directory, fullPath)

          // Skip hidden files unless includeHidden is true
          if (!this.scanOptions.includeHidden && entry.name.startsWith(".")) {
            continue
          }

          // Check if path should be ignored by gitignore
          if (gitignoreParser.shouldIgnore(relativePath, entry.isDirectory())) {
            continue
          }

          // Add to results
          filePaths.push(fullPath)

          // Recursively scan subdirectories
          if (entry.isDirectory()) {
            await scanDirectory(fullPath, currentDepth + 1)
          } else if (
            entry.isSymbolicLink() &&
            this.scanOptions.followSymlinks
          ) {
            try {
              const stats = await fs.stat(fullPath)
              if (stats.isDirectory()) {
                await scanDirectory(fullPath, currentDepth + 1)
              }
            } catch (error) {
              // Ignore broken symlinks
              logger.warn("Broken symlink encountered", {
                path: fullPath,
                error
              })
            }
          }
        }
      } catch (error) {
        logger.warn("Failed to read directory", { directory, error })
      }
    }

    await scanDirectory(this.scanOptions.directory)
    return filePaths
  }
}
