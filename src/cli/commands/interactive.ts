import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { FileScanner } from '../../scanner/file-scanner';
import { DuplicateDetector } from '../../detector/duplicate-detector';
import { InteractiveUI } from '../../ui/interactive-ui';
import { DEFAULT_CONFIG } from '../../types/config';
import { logger } from '../../utils/logger';

export async function interactiveCommand(directory: string): Promise<void> {
  const targetDir = resolve(directory);
  
  console.clear();
  console.log(chalk.cyan.bold('🔍 Duplicate Finder - Interactive Mode'));
  console.log(chalk.gray(`Directory: ${targetDir}\n`));

  const scanner = new FileScanner({
    directory: targetDir,
    includeHidden: false,
    followSymlinks: false,
    ignorePatterns: DEFAULT_CONFIG.ignorePatterns
  });

  let spinner = ora('Scanning files...').start();
  let scanResult;

  try {
    scanResult = await scanner.scan();
    spinner.succeed(`Scanned ${scanResult.totalFiles} files`);
  } catch (error) {
    spinner.fail('Failed to scan files');
    logger.error('Interactive scan failed', { error });
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }

  spinner = ora('Detecting duplicates...').start();
  
  try {
    const detector = new DuplicateDetector(scanResult.files, scanResult.directories);
    const duplicateGroups = await detector.detectDuplicates();
    
    spinner.succeed(`Found ${duplicateGroups.length} duplicate groups`);
    
    if (duplicateGroups.length === 0) {
      console.log(chalk.green('\n🎉 No duplicates found! Your directory is clean.'));
      return;
    }

    // Launch interactive UI
    console.log(chalk.gray('\n🎯 Launching interactive duplicate manager...\n'));
    
    const ui = new InteractiveUI(duplicateGroups, targetDir);
    await ui.start();
    
  } catch (error) {
    spinner.fail('Failed to detect duplicates');
    logger.error('Interactive duplicate detection failed', { error });
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}