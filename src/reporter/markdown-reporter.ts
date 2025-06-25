import { promises as fs } from "fs"
import { join, dirname } from "path"
import { spawn } from "child_process"
import {
  DuplicateGroup,
  DuplicateStats,
  DuplicateType
} from "../types/duplicate"
import { formatFileSize, formatRelativeTime } from "../utils/file-utils"
import { logger } from "../utils/logger"

export class MarkdownReporter {
  async generateReport(
    duplicateGroups: DuplicateGroup[],
    outputPath: string,
    baseDirectory: string
  ): Promise<void> {
    logger.info("Generating markdown report", {
      outputPath,
      groupCount: duplicateGroups.length
    })

    const stats = this.calculateStats(duplicateGroups)
    const report = this.buildReportContent(
      duplicateGroups,
      stats,
      baseDirectory
    )

    // Ensure output directory exists
    await fs.mkdir(dirname(outputPath), { recursive: true })

    // Write report to file
    await fs.writeFile(outputPath, report, "utf-8")

    // Format with prettier
    await this.formatWithPrettier(outputPath)

    logger.info("Markdown report generated and formatted successfully", {
      outputPath
    })
  }

  private buildReportContent(
    duplicateGroups: DuplicateGroup[],
    stats: DuplicateStats,
    baseDirectory: string
  ): string {
    const timestamp = new Date().toISOString().split("T")[0]

    let report = [
      `# Duplicate Files Report`,
      ``,
      `Generated on: ${timestamp}`,
      `Directory: \`${baseDirectory}\``,
      ``,
      `## Executive Summary`,
      ``,
      `🔍 **Scan Results:**`,
      `- Duplicate groups found: **${stats.totalGroups}**`,
      `- Total files in duplicates: **${stats.totalFiles}**`,
      `- Total size of duplicates: **${formatFileSize(stats.totalSize)}**`,
      `- **Potential space savings: ${formatFileSize(stats.potentialSavings)}**`,
      ``,
      `📊 **Breakdown by Type:**`,
      `- Name-based duplicates: ${stats.groupsByType[DuplicateType.NAME_BASED]} groups`,
      `- Content-based duplicates: ${stats.groupsByType[DuplicateType.CONTENT_BASED]} groups`,
      `- Folder-based duplicates: ${stats.groupsByType[DuplicateType.FOLDER_BASED]} groups`,
      ``,
      `## Cleanup Action Plan`,
      ``,
      `### Recommended Actions`,
      ``,
      `1. **Review Content-Based Duplicates First** 📋`,
      `   - These are files with identical content but potentially different names`,
      `   - High confidence for safe deletion`,
      `   - Estimated savings: ${formatFileSize(this.calculateSavingsByType(duplicateGroups, DuplicateType.CONTENT_BASED))}`,
      ``,
      `2. **Review Name-Based Duplicates** 📝`,
      `   - Files with same names in different locations`,
      `   - Verify contents before deletion`,
      `   - May indicate organizational issues`,
      ``,
      `3. **Clean Up Folder Duplicates** 📁`,
      `   - Entire directories with duplicate content`,
      `   - Review for any unique files before deletion`,
      ``,
      `### Safety Guidelines`,
      ``,
      `⚠️ **Before Taking Action:**`,
      `- Always backup important data`,
      `- Review file contents when in doubt`,
      `- Start with smallest, most obvious duplicates`,
      `- Use the interactive mode for safer management`,
      ``,
      `## Detailed Findings`,
      ``
    ]

    // Add detailed duplicate groups
    duplicateGroups.forEach((group, index) => {
      report.push(`### Group ${index + 1}: ${this.getGroupTitle(group)}`)
      report.push(``)
      report.push(`**Type:** ${group.type}`)
      report.push(`**Files:** ${group.files.length}`)
      report.push(`**Total Size:** ${formatFileSize(group.totalSize)}`)
      report.push(
        `**Potential Savings:** ${formatFileSize(group.potentialSavings)}`
      )
      report.push(``)

      report.push(`| File Path | Size | Modified | Action |`)
      report.push(`|-----------|------|----------|---------|`)

      group.files.forEach((file) => {
        const relativePath = file.path.replace(baseDirectory, ".")
        const size = formatFileSize(file.size)
        const modified = formatRelativeTime(file.modified)
        const action = group.actions.get(file.path) || "Pending"

        report.push(
          `| \`${relativePath}\` | ${size} | ${modified} | ${action} |`
        )
      })

      report.push(``)
    })

    // Add footer with recommendations
    report.push(`## Next Steps`)
    report.push(``)
    report.push(`### Using Interactive Mode`)
    report.push(``)
    report.push(`\`\`\`bash`)
    report.push(`duplicates-finder interactive "${baseDirectory}"`)
    report.push(`\`\`\``)
    report.push(``)
    report.push(`### Manual Cleanup Commands`)
    report.push(``)
    report.push(
      `For experienced users, here are some sample commands to get started:`
    )
    report.push(``)
    report.push(`\`\`\`bash`)
    report.push(`# Review files before deletion:`)
    report.push(`ls -la "path/to/duplicate/file"`)
    report.push(``)
    report.push(`# Compare file contents:`)
    report.push(`diff "file1" "file2"`)
    report.push(``)
    report.push(`# Safe deletion (move to trash on macOS):`)
    report.push(`trash "path/to/duplicate/file"`)
    report.push(`\`\`\``)
    report.push(``)
    report.push(`---`)
    report.push(`*Report generated by Duplicate Finder CLI*`)

    return report.join("\n")
  }

  private getGroupTitle(group: DuplicateGroup): string {
    if (group.files.length === 0) return "Empty Group"

    const firstFile = group.files[0]
    if (group.type === DuplicateType.NAME_BASED) {
      return `"${firstFile.name}" (${group.files.length} locations)`
    } else if (group.type === DuplicateType.CONTENT_BASED) {
      return `Content Match (${group.files.length} files)`
    } else {
      return `Folder Match (${group.files.length} folders)`
    }
  }

  private calculateStats(duplicateGroups: DuplicateGroup[]): DuplicateStats {
    const stats: DuplicateStats = {
      totalGroups: duplicateGroups.length,
      totalFiles: 0,
      totalSize: 0,
      potentialSavings: 0,
      groupsByType: {
        [DuplicateType.NAME_BASED]: 0,
        [DuplicateType.CONTENT_BASED]: 0,
        [DuplicateType.FOLDER_BASED]: 0
      }
    }

    duplicateGroups.forEach((group) => {
      stats.totalFiles += group.files.length
      stats.totalSize += group.totalSize
      stats.potentialSavings += group.potentialSavings
      stats.groupsByType[group.type]++
    })

    return stats
  }

  private calculateSavingsByType(
    duplicateGroups: DuplicateGroup[],
    type: DuplicateType
  ): number {
    return duplicateGroups
      .filter((group) => group.type === type)
      .reduce((sum, group) => sum + group.potentialSavings, 0)
  }

  private async formatWithPrettier(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const prettierProcess = spawn(
        "npx",
        ["prettier", "--write", "--parser", "markdown", filePath],
        {
          stdio: ["pipe", "pipe", "pipe"]
        }
      )

      let errorOutput = ""

      prettierProcess.stderr.on("data", (data) => {
        errorOutput += data.toString()
      })

      prettierProcess.on("close", (code) => {
        if (code !== 0) {
          logger.warn("Prettier formatting failed", { code, errorOutput })
          // Don't reject, just continue without formatting
          resolve()
          return
        }

        logger.info("Report formatted with prettier successfully")
        resolve()
      })

      prettierProcess.on("error", (error) => {
        logger.warn("Failed to run prettier", { error })
        // Don't reject, just continue without formatting
        resolve()
      })
    })
  }
}
