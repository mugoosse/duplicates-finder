import { promises as fs } from "fs"
import { join, dirname } from "path"
import { homedir } from "os"
import { AppConfig, DEFAULT_CONFIG } from "../types/config"
import { logger } from "./logger"

export class ConfigManager {
  private configPath: string
  private config: AppConfig

  constructor() {
    this.configPath = join(homedir(), ".duplicates-finder", "config.json")
    this.config = { ...DEFAULT_CONFIG }
  }

  async load(): Promise<AppConfig> {
    try {
      const configData = await fs.readFile(this.configPath, "utf-8")
      const userConfig = JSON.parse(configData)

      // Merge with defaults
      this.config = { ...DEFAULT_CONFIG, ...userConfig }
      logger.info("Configuration loaded", { configPath: this.configPath })
    } catch (error) {
      // Config file doesn't exist or is invalid, use defaults
      logger.info("Using default configuration", {
        reason: "Config file not found or invalid"
      })
    }

    return this.config
  }

  async save(config: Partial<AppConfig>): Promise<void> {
    this.config = { ...this.config, ...config }

    try {
      // Ensure config directory exists
      await fs.mkdir(dirname(this.configPath), { recursive: true })

      // Write config file
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        "utf-8"
      )
      logger.info("Configuration saved", { configPath: this.configPath })
    } catch (error) {
      logger.error("Failed to save configuration", {
        error,
        configPath: this.configPath
      })
      throw new Error(
        `Failed to save configuration: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  get(): AppConfig {
    return { ...this.config }
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG }
  }
}

export const configManager = new ConfigManager()
