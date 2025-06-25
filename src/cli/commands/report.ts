import { resolve } from "path"
import { promises as fs } from "fs"
import chalk from "chalk"
import { MarkdownReporter } from "../../reporter/markdown-reporter"
import { DuplicateGroup } from "../../types/duplicate"
import { logger } from "../../utils/logger"

interface ReportOptions {
  input?: string
  output: string
}

export async function reportCommand(options: ReportOptions): Promise<void> {
  console.log(chalk.cyan.bold("📋 Duplicate Finder - Report Generation"))

  if (!options.input) {
    console.log(
      chalk.red("Error: Input file is required for report generation")
    )
    console.log(
      chalk.gray(
        "Use the scan command first to generate results, then specify the input file."
      )
    )
    process.exit(1)
  }

  const inputFile = resolve(options.input)
  const outputFile = resolve(options.output)

  console.log(chalk.gray(`Input: ${inputFile}`))
  console.log(chalk.gray(`Output: ${outputFile}\n`))

  try {
    // Load duplicate groups from JSON file
    const scanData = await fs.readFile(inputFile, "utf-8")
    const parsedData = JSON.parse(scanData)
    const duplicateGroups: DuplicateGroup[] = parsedData.duplicateGroups || []
    const baseDirectory: string = parsedData.baseDirectory || "."

    const reporter = new MarkdownReporter()
    await reporter.generateReport(duplicateGroups, outputFile, baseDirectory)

    console.log(chalk.green("✅ Report generated successfully!"))
    console.log(chalk.gray(`📄 Report saved to: ${outputFile}`))
  } catch (error) {
    logger.error("Report generation failed", { error })
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : "Unknown error"
    )
    process.exit(1)
  }
}
