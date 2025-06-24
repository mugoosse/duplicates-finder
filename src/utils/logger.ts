import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private logLevel: LogLevel;
  private logFile: string;

  constructor(logLevel: LogLevel = LogLevel.INFO, logFile: string = 'duplicate-finder.log') {
    this.logLevel = logLevel;
    this.logFile = logFile;
    
    if (!existsSync(this.logFile)) {
      writeFileSync(this.logFile, '');
    }
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (level < this.logLevel) return;

    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const logMessage = `[${timestamp}] ${levelStr}: ${message} ${args.length ? JSON.stringify(args) : ''}\n`;
    
    appendFileSync(this.logFile, logMessage);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }
}

export const logger = new Logger();