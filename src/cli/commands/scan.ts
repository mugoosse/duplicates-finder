import { resolve } from "path"
import chalk from "chalk"
import ora from "ora"
import { FileScanner } from "../../scanner/file-scanner"
import { DuplicateDetector } from "../../detector/duplicate-detector"
import { DEFAULT_CONFIG } from "../../types/config"
import { formatFileSize } from "../../utils/file-utils"
import { logger } from "../../utils/logger"

interface ScanOptions {
  all?: boolean
  maxDepth?: number
  output?: string
}

export async function scanCommand(
  directory: string,
  options: ScanOptions
): Promise<void> {
  const targetDir = resolve(directory)

  console.log(chalk.cyan.bold("🔍 Duplicate Finder - Scan Mode"))
  console.log(chalk.gray(`Scanning: ${targetDir}\n`))

  const scanner = new FileScanner({
    directory: targetDir,
    includeHidden: options.all || false,
    followSymlinks: false,
    ignorePatterns: DEFAULT_CONFIG.ignorePatterns,
    maxDepth: options.maxDepth
  })

  let spinner = ora("Scanning files...").start()
  let scanResult

  try {
    scanResult = await scanner.scan()
    spinner.succeed(
      `Found ${scanResult.totalFiles} files (${formatFileSize(scanResult.totalSize)})`
    )
  } catch (error) {
    spinner.fail("Failed to scan files")
    logger.error("Scan failed", { error })
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : "Unknown error"
    )
    process.exit(1)
  }

  spinner = ora("Detecting duplicates...").start()

  try {
    const detector = new DuplicateDetector(
      scanResult.files,
      scanResult.directories
    )
    const duplicateGroups = await detector.detectDuplicates()
    const stats = DuplicateDetector.calculateStats(duplicateGroups)

    spinner.succeed(
      `Found ${stats.totalGroups} duplicate groups with ${stats.totalFiles} files`
    )

    // Display summary
    console.log(chalk.yellow("\n📊 Scan Summary:"))
    console.log(chalk.white(`• Total files scanned: ${scanResult.totalFiles}`))
    console.log(chalk.white(`• Duplicate groups found: ${stats.totalGroups}`))
    console.log(chalk.white(`• Files in duplicates: ${stats.totalFiles}`))
    console.log(
      chalk.white(`• Total duplicate size: ${formatFileSize(stats.totalSize)}`)
    )
    console.log(
      chalk.green(
        `• Potential space savings: ${formatFileSize(stats.potentialSavings)}`
      )
    )

    if (stats.groupsByType["name-based"] > 0) {
      console.log(
        chalk.cyan(
          `• Name-based duplicates: ${stats.groupsByType["name-based"]} groups`
        )
      )
    }
    if (stats.groupsByType["content-based"] > 0) {
      console.log(
        chalk.cyan(
          `• Content-based duplicates: ${stats.groupsByType["content-based"]} groups`
        )
      )
    }
    if (stats.groupsByType["folder-based"] > 0) {
      console.log(
        chalk.cyan(
          `• Folder-based duplicates: ${stats.groupsByType["folder-based"]} groups`
        )
      )
    }

    console.log(chalk.gray(`\n⏱️  Scan completed in ${scanResult.scanTime}ms`))
    console.log(
      chalk.gray(
        '\n💡 Use "duplicates-finder interactive" to manage duplicates interactively'
      )
    )
  } catch (error) {
    spinner.fail("Failed to detect duplicates")
    logger.error("Duplicate detection failed", { error })
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : "Unknown error"
    )
    process.exit(1)
  }
}
