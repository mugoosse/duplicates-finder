#!/usr/bin/env node

import { Command } from "commander"
import chalk from "chalk"
import { scanCommand } from "./commands/scan"
import { interactiveCommand } from "./commands/interactive"
import { reportCommand } from "./commands/report"

const program = new Command()

program
  .name("duplicates-finder")
  .description(
    "Interactive CLI tool for finding and managing duplicate files and folders"
  )
  .version("1.0.0")

program
  .command("scan")
  .description("Scan directory for duplicate files")
  .argument("[directory]", "Directory to scan", ".")
  .option("-a, --all", "Include hidden files")
  .option("-d, --max-depth <depth>", "Maximum depth to scan", parseInt)
  .option("-o, --output <file>", "Output file for results")
  .action(scanCommand)

program
  .command("interactive")
  .alias("i")
  .description("Launch interactive duplicate management interface")
  .argument("[directory]", "Directory to scan", ".")
  .action(interactiveCommand)

program
  .command("report")
  .description("Generate markdown report from scan results")
  .option("-i, --input <file>", "Input scan results file")
  .option("-o, --output <file>", "Output report file", "duplicate-report.md")
  .action(reportCommand)

program.parse()

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan.bold("🔍 Duplicate Finder"))
  console.log(
    chalk.gray(
      "Interactive CLI tool for finding and managing duplicate files\n"
    )
  )
  program.outputHelp()
}
