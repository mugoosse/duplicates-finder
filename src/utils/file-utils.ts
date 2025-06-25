import { createHash } from "crypto"
import { createReadStream, promises as fs } from "fs"
import { join, extname, basename } from "path"
import { FileMetadata } from "../types/file"

export async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256")
    const stream = createReadStream(filePath)

    stream.on("data", (data) => hash.update(data))
    stream.on("end", () => resolve(hash.digest("hex")))
    stream.on("error", reject)
  })
}

export async function getFileMetadata(filePath: string): Promise<FileMetadata> {
  const stats = await fs.stat(filePath)
  const name = basename(filePath)
  const extension = extname(filePath).toLowerCase()

  return {
    path: filePath,
    name,
    size: stats.size,
    modified: stats.mtime,
    created: stats.birthtime,
    isDirectory: stats.isDirectory(),
    extension: extension || undefined
  }
}

export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

export function shouldIgnoreFile(
  filePath: string,
  ignorePatterns: string[]
): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/")

  return ignorePatterns.some((pattern) => {
    // Simple glob pattern matching
    const regex = new RegExp(
      pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".")
    )
    return regex.test(normalizedPath)
  })
}
