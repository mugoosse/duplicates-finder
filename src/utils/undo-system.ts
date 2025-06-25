import { promises as fs } from "fs"
import { join, dirname, basename } from "path"
import { homedir } from "os"
import { DuplicateAction } from "../types/duplicate"
import { logger } from "./logger"

export interface UndoOperation {
  id: string
  timestamp: Date
  action: DuplicateAction
  originalPath: string
  backupPath?: string
  newPath?: string
}

export class UndoSystem {
  private undoHistoryPath: string
  private backupDirectory: string
  private operations: UndoOperation[] = []

  constructor() {
    const baseDir = join(homedir(), ".duplicates-finder")
    this.undoHistoryPath = join(baseDir, "undo-history.json")
    this.backupDirectory = join(baseDir, "backups")
  }

  async initialize(): Promise<void> {
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDirectory, { recursive: true })

      // Load existing undo history
      await this.loadHistory()
    } catch (error) {
      logger.error("Failed to initialize undo system", { error })
    }
  }

  async recordOperation(
    operation: Omit<UndoOperation, "id" | "timestamp">
  ): Promise<string> {
    const undoOp: UndoOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: new Date()
    }

    // For delete operations, create a backup
    if (operation.action === DuplicateAction.DELETE) {
      undoOp.backupPath = await this.createBackup(operation.originalPath)
    }

    this.operations.push(undoOp)
    await this.saveHistory()

    logger.info("Undo operation recorded", {
      operationId: undoOp.id,
      action: undoOp.action
    })
    return undoOp.id
  }

  async undoOperation(operationId: string): Promise<boolean> {
    const operationIndex = this.operations.findIndex(
      (op) => op.id === operationId
    )
    if (operationIndex === -1) {
      logger.warn("Undo operation not found", { operationId })
      return false
    }

    const operation = this.operations[operationIndex]

    try {
      switch (operation.action) {
        case DuplicateAction.DELETE:
          if (operation.backupPath) {
            await fs.copyFile(operation.backupPath, operation.originalPath)
            logger.info("File restored from backup", {
              originalPath: operation.originalPath,
              backupPath: operation.backupPath
            })
          }
          break

        case DuplicateAction.MOVE:
          if (operation.newPath) {
            await fs.rename(operation.newPath, operation.originalPath)
            logger.info("File moved back to original location", {
              from: operation.newPath,
              to: operation.originalPath
            })
          }
          break

        case DuplicateAction.RENAME:
          if (operation.newPath) {
            await fs.rename(operation.newPath, operation.originalPath)
            logger.info("File renamed back to original name", {
              from: operation.newPath,
              to: operation.originalPath
            })
          }
          break

        default:
          logger.warn("Cannot undo operation type", {
            action: operation.action
          })
          return false
      }

      // Remove the operation from history
      this.operations.splice(operationIndex, 1)
      await this.saveHistory()

      return true
    } catch (error) {
      logger.error("Failed to undo operation", { operationId, error })
      return false
    }
  }

  async getRecentOperations(limit: number = 10): Promise<UndoOperation[]> {
    return this.operations
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  async clearHistory(): Promise<void> {
    // Clean up backup files
    for (const operation of this.operations) {
      if (operation.backupPath) {
        try {
          await fs.unlink(operation.backupPath)
        } catch (error) {
          logger.warn("Failed to delete backup file", {
            backupPath: operation.backupPath,
            error
          })
        }
      }
    }

    this.operations = []
    await this.saveHistory()
    logger.info("Undo history cleared")
  }

  private async createBackup(filePath: string): Promise<string> {
    const fileName = basename(filePath)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupFileName = `${timestamp}_${fileName}`
    const backupPath = join(this.backupDirectory, backupFileName)

    await fs.copyFile(filePath, backupPath)
    logger.info("Backup created", { originalPath: filePath, backupPath })

    return backupPath
  }

  private async loadHistory(): Promise<void> {
    try {
      const historyData = await fs.readFile(this.undoHistoryPath, "utf-8")
      const parsedData = JSON.parse(historyData)

      // Convert timestamp strings back to Date objects
      this.operations = parsedData.map((op: any) => ({
        ...op,
        timestamp: new Date(op.timestamp)
      }))

      logger.info("Undo history loaded", {
        operationCount: this.operations.length
      })
    } catch (error) {
      // History file doesn't exist, start with empty history
      this.operations = []
      logger.info("Starting with empty undo history")
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      await fs.mkdir(dirname(this.undoHistoryPath), { recursive: true })
      await fs.writeFile(
        this.undoHistoryPath,
        JSON.stringify(this.operations, null, 2),
        "utf-8"
      )
    } catch (error) {
      logger.error("Failed to save undo history", { error })
    }
  }

  private generateOperationId(): string {
    return `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export const undoSystem = new UndoSystem()
