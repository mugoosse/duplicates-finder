import { v4 as uuidv4 } from 'uuid';
import { FileMetadata } from '../types/file';
import { DuplicateGroup, DuplicateType, DuplicateStats } from '../types/duplicate';
import { FolderComparer } from './folder-comparer';
import { logger } from '../utils/logger';

export class DuplicateDetector {
  private files: FileMetadata[];
  private directories: FileMetadata[];

  constructor(files: FileMetadata[], directories: FileMetadata[] = []) {
    this.files = files;
    this.directories = directories;
  }

  async detectDuplicates(): Promise<DuplicateGroup[]> {
    logger.info('Starting duplicate detection');
    
    const duplicateGroups: DuplicateGroup[] = [];
    
    // Find name-based duplicates
    const nameBasedGroups = this.findNameBasedDuplicates();
    duplicateGroups.push(...nameBasedGroups);
    
    // Find content-based duplicates
    const contentBasedGroups = this.findContentBasedDuplicates();
    duplicateGroups.push(...contentBasedGroups);
    
    // Find folder-based duplicates
    const folderBasedGroups = await this.findFolderBasedDuplicates();
    duplicateGroups.push(...folderBasedGroups);
    
    logger.info('Duplicate detection completed', { 
      totalGroups: duplicateGroups.length,
      nameBasedGroups: nameBasedGroups.length,
      contentBasedGroups: contentBasedGroups.length,
      folderBasedGroups: folderBasedGroups.length
    });
    
    return duplicateGroups;
  }

  private findNameBasedDuplicates(): DuplicateGroup[] {
    const nameGroups = new Map<string, FileMetadata[]>();
    
    // Group files by name
    for (const file of this.files) {
      if (!nameGroups.has(file.name)) {
        nameGroups.set(file.name, []);
      }
      nameGroups.get(file.name)!.push(file);
    }
    
    // Filter groups with more than one file
    const duplicateGroups: DuplicateGroup[] = [];
    for (const [name, files] of nameGroups) {
      if (files.length > 1) {
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const potentialSavings = totalSize - Math.max(...files.map(f => f.size));
        
        duplicateGroups.push({
          id: uuidv4(),
          type: DuplicateType.NAME_BASED,
          files,
          totalSize,
          potentialSavings,
          actions: new Map()
        });
      }
    }
    
    return duplicateGroups;
  }

  private findContentBasedDuplicates(): DuplicateGroup[] {
    const hashGroups = new Map<string, FileMetadata[]>();
    
    // Group files by content hash
    for (const file of this.files) {
      if (file.hash) {
        if (!hashGroups.has(file.hash)) {
          hashGroups.set(file.hash, []);
        }
        hashGroups.get(file.hash)!.push(file);
      }
    }
    
    // Filter groups with more than one file
    const duplicateGroups: DuplicateGroup[] = [];
    for (const [hash, files] of hashGroups) {
      if (files.length > 1) {
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const potentialSavings = totalSize - files[0].size; // Keep one copy
        
        duplicateGroups.push({
          id: uuidv4(),
          type: DuplicateType.CONTENT_BASED,
          files,
          totalSize,
          potentialSavings,
          actions: new Map()
        });
      }
    }
    
    return duplicateGroups;
  }

  private async findFolderBasedDuplicates(): Promise<DuplicateGroup[]> {
    if (this.directories.length === 0) {
      return [];
    }

    const folderComparer = new FolderComparer();
    const folderStructures = [];

    // Build structure for each directory
    for (const dir of this.directories) {
      try {
        const structure = await folderComparer.buildFolderStructure(dir.path, dir.path);
        folderStructures.push(structure);
      } catch (error) {
        logger.warn('Failed to build folder structure', { path: dir.path, error });
      }
    }

    // Find duplicate folder groups
    const duplicateFolderGroups = folderComparer.findDuplicateFolders(folderStructures);
    const duplicateGroups: DuplicateGroup[] = [];

    for (const folderGroup of duplicateFolderGroups) {
      // Convert folder structures to FileMetadata for consistency
      const files: FileMetadata[] = [];
      let totalSize = 0;

      for (const folder of folderGroup) {
        try {
          const size = await folderComparer.getFolderSize(folder.path);
          const metadata: FileMetadata = {
            path: folder.path,
            name: folder.name,
            size,
            modified: new Date(), // We'd need to get this properly
            created: new Date(),  // We'd need to get this properly
            isDirectory: true
          };
          files.push(metadata);
          totalSize += size;
        } catch (error) {
          logger.warn('Failed to get folder metadata', { path: folder.path, error });
        }
      }

      if (files.length > 1) {
        const potentialSavings = totalSize - Math.max(...files.map(f => f.size));
        duplicateGroups.push({
          id: uuidv4(),
          type: DuplicateType.FOLDER_BASED,
          files,
          totalSize,
          potentialSavings,
          actions: new Map()
        });
      }
    }

    return duplicateGroups;
  }

  static calculateStats(duplicateGroups: DuplicateGroup[]): DuplicateStats {
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
    };

    for (const group of duplicateGroups) {
      stats.totalFiles += group.files.length;
      stats.totalSize += group.totalSize;
      stats.potentialSavings += group.potentialSavings;
      stats.groupsByType[group.type]++;
    }

    return stats;
  }
}