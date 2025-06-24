import { FileMetadata } from './file';

export enum DuplicateType {
  NAME_BASED = 'name-based',
  CONTENT_BASED = 'content-based',
  FOLDER_BASED = 'folder-based'
}

export enum DuplicateAction {
  KEEP = 'keep',
  DELETE = 'delete',
  MOVE = 'move',
  RENAME = 'rename'
}

export interface DuplicateGroup {
  id: string;
  type: DuplicateType;
  files: FileMetadata[];
  totalSize: number;
  potentialSavings: number;
  actions: Map<string, DuplicateAction>;
}

export interface DuplicateStats {
  totalGroups: number;
  totalFiles: number;
  totalSize: number;
  potentialSavings: number;
  groupsByType: Record<DuplicateType, number>;
}

export interface ActionPlan {
  duplicateGroup: DuplicateGroup;
  selectedActions: Map<string, DuplicateAction>;
  estimatedSavings: number;
}