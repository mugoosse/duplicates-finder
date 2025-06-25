import { promises as fs } from "fs"
import { join } from "path"

export interface GitignoreRule {
  pattern: string
  isNegation: boolean
  isDirectory: boolean
  regex: RegExp
}

export class GitignoreParser {
  private rules: GitignoreRule[] = []

  constructor(rules: GitignoreRule[] = []) {
    this.rules = rules
  }

  static async fromFile(gitignorePath: string): Promise<GitignoreParser> {
    try {
      const content = await fs.readFile(gitignorePath, "utf-8")
      return GitignoreParser.fromContent(content)
    } catch (error) {
      // If .gitignore doesn't exist, return empty parser
      return new GitignoreParser()
    }
  }

  static fromContent(content: string): GitignoreParser {
    const rules: GitignoreRule[] = []
    const lines = content.split("\n")

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue
      }

      const rule = GitignoreParser.parseRule(trimmed)
      if (rule) {
        rules.push(rule)
      }
    }

    return new GitignoreParser(rules)
  }

  private static parseRule(pattern: string): GitignoreRule | null {
    let cleanPattern = pattern
    const isNegation = pattern.startsWith("!")

    if (isNegation) {
      cleanPattern = pattern.slice(1)
    }

    // Check if it's a directory pattern
    const isDirectory = cleanPattern.endsWith("/")
    if (isDirectory) {
      cleanPattern = cleanPattern.slice(0, -1)
    }

    // Convert gitignore pattern to regex
    const regex = GitignoreParser.patternToRegex(cleanPattern)
    if (!regex) {
      return null
    }

    return {
      pattern: cleanPattern,
      isNegation,
      isDirectory,
      regex
    }
  }

  private static patternToRegex(pattern: string): RegExp | null {
    try {
      // Escape special regex characters except *, ?, [, ]
      let regexPattern = pattern
        .replace(/[.+^${}()|\\]/g, "\\$&")
        .replace(/\?/g, "[^/]")
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")

      // Handle leading slash
      if (pattern.startsWith("/")) {
        regexPattern = "^" + regexPattern.slice(1)
      } else {
        regexPattern = "(^|/)" + regexPattern
      }

      // Add end anchor
      regexPattern += "(/.*)?$"

      return new RegExp(regexPattern)
    } catch (error) {
      return null
    }
  }

  shouldIgnore(filePath: string, isDirectory: boolean = false): boolean {
    // Normalize path for consistent matching
    const normalizedPath = filePath.replace(/\\/g, "/")
    let isIgnored = false

    for (const rule of this.rules) {
      // Skip directory rules for files and vice versa
      if (rule.isDirectory && !isDirectory) {
        continue
      }

      const matches = rule.regex.test(normalizedPath)

      if (matches) {
        if (rule.isNegation) {
          isIgnored = false
        } else {
          isIgnored = true
        }
      }
    }

    return isIgnored
  }

  addRules(otherParser: GitignoreParser): void {
    this.rules.push(...otherParser.rules)
  }

  static async findGitignoreFiles(
    directory: string,
    maxDepth: number = 10
  ): Promise<string[]> {
    const gitignoreFiles: string[] = []

    const searchDirectory = async (
      dir: string,
      depth: number
    ): Promise<void> => {
      if (depth > maxDepth) {
        return
      }

      try {
        const gitignorePath = join(dir, ".gitignore")
        try {
          await fs.access(gitignorePath)
          gitignoreFiles.push(gitignorePath)
        } catch {
          // .gitignore doesn't exist in this directory
        }

        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith(".")) {
            await searchDirectory(join(dir, entry.name), depth + 1)
          }
        }
      } catch {
        // Directory not accessible
      }
    }

    await searchDirectory(directory, 0)
    return gitignoreFiles
  }

  static async createCombinedParser(
    directory: string
  ): Promise<GitignoreParser> {
    const gitignoreFiles = await GitignoreParser.findGitignoreFiles(directory)
    const combinedParser = new GitignoreParser()

    for (const gitignoreFile of gitignoreFiles) {
      const parser = await GitignoreParser.fromFile(gitignoreFile)
      combinedParser.addRules(parser)
    }

    return combinedParser
  }
}
