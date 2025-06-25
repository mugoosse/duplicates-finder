import { promises as fs } from "fs"
import { join, relative } from "path"
import { createHash } from "crypto"
import { FileMetadata } from "../types/file"
import { logger } from "../utils/logger"

export interface FolderStructure {
  path: string
  name: string
  files: Map<string, string> // relative path -> hash
  subdirectories: Map<string, FolderStructure>
  structureHash: string
}

export class FolderComparer {
  async buildFolderStructure(
    directoryPath: string,
    basePath: string
  ): Promise<FolderStructure> {
    const files = new Map<string, string>()
    const subdirectories = new Map<string, FolderStructure>()

    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true })

      for (const entry of entries) {
        const entryPath = join(directoryPath, entry.name)
        const relativePath = relative(basePath, entryPath)

        if (entry.isDirectory()) {
          const subStructure = await this.buildFolderStructure(
            entryPath,
            basePath
          )
          subdirectories.set(entry.name, subStructure)
        } else if (entry.isFile()) {
          try {
            const hash = await this.calculateFileHash(entryPath)
            files.set(relativePath, hash)
          } catch (error) {
            logger.warn("Failed to hash file", { path: entryPath, error })
            // Still include the file but with a placeholder hash
            files.set(relativePath, "error")
          }
        }
      }
    } catch (error) {
      logger.error("Failed to read directory", { path: directoryPath, error })
    }

    const structureHash = this.calculateStructureHash(files, subdirectories)

    return {
      path: directoryPath,
      name: directoryPath.split("/").pop() || "",
      files,
      subdirectories,
      structureHash
    }
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash("sha256")
      const stream = require("fs").createReadStream(filePath)

      stream.on("data", (data: Buffer) => hash.update(data))
      stream.on("end", () => resolve(hash.digest("hex")))
      stream.on("error", reject)
    })
  }

  private calculateStructureHash(
    files: Map<string, string>,
    subdirectories: Map<string, FolderStructure>
  ): string {
    const hash = createHash("sha256")

    // Hash all file paths and their content hashes
    const sortedFiles = Array.from(files.entries()).sort()
    for (const [path, fileHash] of sortedFiles) {
      hash.update(`file:${path}:${fileHash}`)
    }

    // Hash all subdirectory structures
    const sortedSubdirs = Array.from(subdirectories.entries()).sort()
    for (const [name, structure] of sortedSubdirs) {
      hash.update(`dir:${name}:${structure.structureHash}`)
    }

    return hash.digest("hex")
  }

  findDuplicateFolders(structures: FolderStructure[]): FolderStructure[][] {
    const hashGroups = new Map<string, FolderStructure[]>()

    // Group folders by their structure hash
    for (const structure of structures) {
      if (!hashGroups.has(structure.structureHash)) {
        hashGroups.set(structure.structureHash, [])
      }
      hashGroups.get(structure.structureHash)!.push(structure)
    }

    // Return only groups with more than one folder
    return Array.from(hashGroups.values()).filter((group) => group.length > 1)
  }

  async getFolderSize(folderPath: string): Promise<number> {
    let totalSize = 0

    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true })

      for (const entry of entries) {
        const entryPath = join(folderPath, entry.name)

        if (entry.isDirectory()) {
          totalSize += await this.getFolderSize(entryPath)
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(entryPath)
            totalSize += stats.size
          } catch (error) {
            logger.warn("Failed to get file size", { path: entryPath, error })
          }
        }
      }
    } catch (error) {
      logger.error("Failed to calculate folder size", {
        path: folderPath,
        error
      })
    }

    return totalSize
  }
}
