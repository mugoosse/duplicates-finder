import inquirer from "inquirer"
import chalk from "chalk"
import boxen from "boxen"
import {
  DuplicateGroup,
  DuplicateAction,
  DuplicateType
} from "../types/duplicate"
import { formatFileSize, formatRelativeTime } from "../utils/file-utils"
import { logger } from "../utils/logger"

export class InteractiveUI {
  private duplicateGroups: DuplicateGroup[]
  private baseDirectory: string
  private currentGroupIndex: number = 0

  constructor(duplicateGroups: DuplicateGroup[], baseDirectory: string) {
    this.duplicateGroups = duplicateGroups
    this.baseDirectory = baseDirectory
  }

  async start(): Promise<void> {
    await this.showMainMenu()
  }

  private async showMainMenu(): Promise<void> {
    console.clear()

    const stats = this.calculateStats()
    const title = chalk.cyan.bold("🔍 Duplicate Finder - Interactive Mode")
    const summary = [
      chalk.gray(`Directory: ${this.baseDirectory}`),
      "",
      chalk.yellow("📊 Summary:"),
      chalk.white(`• Duplicate groups: ${stats.totalGroups}`),
      chalk.white(`• Total files: ${stats.totalFiles}`),
      chalk.white(`• Total size: ${formatFileSize(stats.totalSize)}`),
      chalk.green(
        `• Potential savings: ${formatFileSize(stats.potentialSavings)}`
      )
    ].join("\n")

    console.log(
      boxen(summary, {
        title,
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "cyan"
      })
    )

    const choices = [
      {
        name: chalk.cyan("🔍 Browse duplicate groups"),
        value: "browse"
      },
      {
        name: chalk.yellow("📋 Generate report"),
        value: "report"
      },
      {
        name: chalk.gray("⚙️  Settings"),
        value: "settings"
      },
      {
        name: chalk.red("❌ Exit"),
        value: "exit"
      }
    ]

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices
      }
    ])

    switch (action) {
      case "browse":
        await this.browseDuplicates()
        break
      case "report":
        await this.generateReport()
        break
      case "settings":
        await this.showSettings()
        break
      case "exit":
        console.log(chalk.green("\n👋 Goodbye!"))
        process.exit(0)
        break
    }
  }

  private async browseDuplicates(): Promise<void> {
    if (this.duplicateGroups.length === 0) {
      console.log(chalk.green("🎉 No duplicates found!"))
      await this.showMainMenu()
      return
    }

    await this.showDuplicateGroup(this.currentGroupIndex)
  }

  private async showDuplicateGroup(index: number): Promise<void> {
    if (index < 0 || index >= this.duplicateGroups.length) {
      await this.showMainMenu()
      return
    }

    console.clear()

    const group = this.duplicateGroups[index]
    const typeIcon = this.getTypeIcon(group.type)
    const title = `${typeIcon} Group ${index + 1} of ${this.duplicateGroups.length}`

    console.log(
      boxen(title, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: "round",
        borderColor: "yellow"
      })
    )

    console.log(chalk.gray(`Type: ${group.type}`))
    console.log(chalk.gray(`Files: ${group.files.length}`))
    console.log(chalk.gray(`Total size: ${formatFileSize(group.totalSize)}`))
    console.log(
      chalk.green(
        `Potential savings: ${formatFileSize(group.potentialSavings)}`
      )
    )
    console.log()

    // Display files in the group
    group.files.forEach((file, fileIndex) => {
      const relativePath = file.path.replace(this.baseDirectory, ".")
      const sizeStr = formatFileSize(file.size)
      const timeStr = formatRelativeTime(file.modified)

      console.log(chalk.white(`${fileIndex + 1}. ${relativePath}`))
      console.log(chalk.gray(`   ${sizeStr} • Modified ${timeStr}`))
    })

    console.log()

    const choices = [
      {
        name: chalk.green("✅ Keep all files"),
        value: "keep-all"
      },
      {
        name: chalk.yellow("🎯 Select actions for individual files"),
        value: "select-individual"
      },
      {
        name: chalk.red("🗑️  Delete all but one"),
        value: "delete-all-but-one"
      },
      new inquirer.Separator(),
      {
        name: chalk.blue("⬅️  Previous group"),
        value: "previous",
        disabled: index === 0
      },
      {
        name: chalk.blue("➡️  Next group"),
        value: "next",
        disabled: index === this.duplicateGroups.length - 1
      },
      {
        name: chalk.gray("🏠 Back to main menu"),
        value: "main-menu"
      }
    ]

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do with this group?",
        choices
      }
    ])

    switch (action) {
      case "keep-all":
        await this.setGroupAction(group, DuplicateAction.KEEP)
        await this.showDuplicateGroup(index + 1)
        break
      case "select-individual":
        await this.selectIndividualActions(group, index)
        break
      case "delete-all-but-one":
        await this.deleteAllButOne(group, index)
        break
      case "previous":
        await this.showDuplicateGroup(index - 1)
        break
      case "next":
        await this.showDuplicateGroup(index + 1)
        break
      case "main-menu":
        await this.showMainMenu()
        break
    }
  }

  private async selectIndividualActions(
    group: DuplicateGroup,
    groupIndex: number
  ): Promise<void> {
    console.clear()
    console.log(chalk.yellow(`🎯 Individual Actions - Group ${groupIndex + 1}`))
    console.log()

    for (let i = 0; i < group.files.length; i++) {
      const file = group.files[i]
      const relativePath = file.path.replace(this.baseDirectory, ".")

      console.log(chalk.white(`${i + 1}. ${relativePath}`))

      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "Action for this file:",
          choices: [
            { name: chalk.green("✅ Keep"), value: DuplicateAction.KEEP },
            { name: chalk.red("🗑️  Delete"), value: DuplicateAction.DELETE },
            { name: chalk.blue("📁 Move"), value: DuplicateAction.MOVE },
            { name: chalk.yellow("✏️  Rename"), value: DuplicateAction.RENAME }
          ]
        }
      ])

      group.actions.set(file.path, action)
    }

    console.log(chalk.green("\n✅ Actions set for all files in group"))
    console.log(chalk.gray("Press any key to continue..."))
    await inquirer.prompt([{ type: "input", name: "continue", message: "" }])

    await this.showDuplicateGroup(groupIndex + 1)
  }

  private async deleteAllButOne(
    group: DuplicateGroup,
    groupIndex: number
  ): Promise<void> {
    const fileChoices = group.files.map((file, index) => ({
      name: `${file.path.replace(this.baseDirectory, ".")} (${formatFileSize(file.size)})`,
      value: index
    }))

    const { keepIndex } = await inquirer.prompt([
      {
        type: "list",
        name: "keepIndex",
        message: "Which file would you like to keep?",
        choices: fileChoices
      }
    ])

    // Set actions: keep one, delete others
    group.files.forEach((file, index) => {
      const action =
        index === keepIndex ? DuplicateAction.KEEP : DuplicateAction.DELETE
      group.actions.set(file.path, action)
    })

    console.log(
      chalk.green("\n✅ Actions set: keeping one file, deleting others")
    )
    console.log(chalk.gray("Press any key to continue..."))
    await inquirer.prompt([{ type: "input", name: "continue", message: "" }])

    await this.showDuplicateGroup(groupIndex + 1)
  }

  private async setGroupAction(
    group: DuplicateGroup,
    action: DuplicateAction
  ): Promise<void> {
    group.files.forEach((file) => {
      group.actions.set(file.path, action)
    })
  }

  private async generateReport(): Promise<void> {
    const { outputPath } = await inquirer.prompt([
      {
        type: "input",
        name: "outputPath",
        message: "Report output path:",
        default: "./duplicate-report.md"
      }
    ])

    try {
      console.log(chalk.yellow("📋 Generating report..."))

      const { MarkdownReporter } = await import("../reporter/markdown-reporter")
      const reporter = new MarkdownReporter()
      await reporter.generateReport(
        this.duplicateGroups,
        outputPath,
        this.baseDirectory
      )

      console.log(chalk.green("✅ Report generated successfully!"))
      console.log(chalk.gray(`📄 Report saved to: ${outputPath}`))
    } catch (error) {
      console.log(chalk.red("❌ Failed to generate report"))
      logger.error("Report generation failed", { error })
    }

    console.log(chalk.gray("\nPress any key to continue..."))
    await inquirer.prompt([{ type: "input", name: "continue", message: "" }])
    await this.showMainMenu()
  }

  private async showSettings(): Promise<void> {
    console.log(chalk.gray("⚙️  Settings menu - Coming soon!"))
    await this.showMainMenu()
  }

  private getTypeIcon(type: DuplicateType): string {
    switch (type) {
      case DuplicateType.NAME_BASED:
        return "📝"
      case DuplicateType.CONTENT_BASED:
        return "🔍"
      case DuplicateType.FOLDER_BASED:
        return "📁"
      default:
        return "📄"
    }
  }

  private calculateStats() {
    const totalGroups = this.duplicateGroups.length
    let totalFiles = 0
    let totalSize = 0
    let potentialSavings = 0

    this.duplicateGroups.forEach((group) => {
      totalFiles += group.files.length
      totalSize += group.totalSize
      potentialSavings += group.potentialSavings
    })

    return { totalGroups, totalFiles, totalSize, potentialSavings }
  }
}
