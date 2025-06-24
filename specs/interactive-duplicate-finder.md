# Interactive CLI Duplicate Finder Specification

## Project Overview

Build an interactive CLI tool that leverages `eza` for file listings and provides a comprehensive duplicate file/folder management system with visual appeal similar to the Claude Code CLI interface.

## Core Requirements

### Functional Requirements

1. **File Discovery**
   - Scan current directory or user-provided directory recursively
   - Use `eza --git-ignore` to respect .gitignore files
   - Hardcode ignore patterns for `node_modules`, `.venv`, `venv`, `.env`, `dist`, `build`
   - Collect file metadata (size, modified date, permissions, path)

2. **Duplicate Detection**
   - **Name-based duplicates**: Files with identical names in different locations
   - **Content-based duplicates**: Files with same content hash regardless of name
   - **Folder duplicates**: Directories with identical structure and content
   - Performance optimization using size-first filtering

3. **Interactive Management**
   - Browse through duplicate groups with keyboard navigation
   - Per-file actions: Keep, Delete, Move, Rename
   - Bulk actions for entire duplicate groups
   - Preview mode to compare file contents
   - Safe mode to preview actions without executing

4. **Report Generation**
   - Generate comprehensive markdown reports
   - Include executive summary, detailed breakdown, space savings potential
   - Provide suggested cleanup action plan
   - Show before/after directory structure visualization

### Non-Functional Requirements

1. **User Experience**
   - Visual appeal similar to Claude Code CLI
   - Colored output with file type icons
   - Progress bars and loading spinners
   - Clear visual hierarchy and status indicators
   - Intuitive keyboard shortcuts and navigation

2. **Performance**
   - Efficient handling of large directory structures
   - Stream processing for memory efficiency
   - Async operations to prevent blocking

3. **Safety**
   - Undo system for recent operations
   - Confirmation dialogs for destructive actions
   - Detailed logging for troubleshooting
   - Graceful error handling

## Technical Architecture

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **CLI Framework**: Commander.js
- **UI Components**: chalk, inquirer, ora, boxen
- **File Operations**: Native Node.js fs/promises
- **Hashing**: Node.js crypto module

### Project Structure
```
src/
├── cli/
│   ├── commands/         # CLI command definitions
│   ├── prompts/         # Interactive prompts
│   └── index.ts         # Main CLI entry point
├── scanner/
│   ├── file-scanner.ts  # File discovery with eza integration
│   ├── metadata.ts      # File metadata collection
│   └── ignore-patterns.ts # Ignore pattern handling
├── detector/
│   ├── duplicate-detector.ts # Main duplicate detection logic
│   ├── content-hasher.ts    # Content-based hashing
│   └── folder-comparer.ts   # Folder structure comparison
├── ui/
│   ├── components/      # Reusable UI components
│   ├── themes/         # Color schemes and styling
│   └── navigation.ts   # Keyboard navigation handling
├── reporter/
│   ├── markdown-reporter.ts # Report generation
│   └── templates/           # Report templates
├── utils/
│   ├── file-utils.ts   # File operation utilities
│   ├── logger.ts       # Logging system
│   └── config.ts       # Configuration management
└── types/
    ├── duplicate.ts    # Duplicate-related types
    ├── file.ts        # File metadata types
    └── config.ts      # Configuration types
```

## Implementation Phases

### Phase 1: Project Foundation
- Initialize TypeScript project with proper configuration
- Set up build system and development tools
- Configure package.json with dependencies and scripts
- Implement basic CLI structure with Commander.js

### Phase 2: File Discovery Engine
- Integrate eza for file listing with --git-ignore
- Implement recursive directory scanning
- Add ignore pattern system for common directories
- Build file metadata collection system

### Phase 3: Duplicate Detection
- Implement content-based hashing for files
- Build name-based duplicate detection
- Add folder structure comparison
- Optimize for performance with size filtering

### Phase 4: Interactive Interface
- Create main menu system
- Implement duplicate browser with keyboard navigation
- Add action selection interface
- Build preview and comparison modes

### Phase 5: Visual Design & UX
- Implement colored output and icons
- Add progress indicators and loading states
- Create consistent visual hierarchy
- Implement status indicators and confirmations

### Phase 6: Report Generation
- Build markdown report templates
- Implement data aggregation for reports
- Add visualization for directory structures
- Create action plan suggestions

### Phase 7: Advanced Features
- Implement undo system
- Add configuration management
- Build comprehensive logging
- Add bulk operation capabilities

## User Interface Design

### Main Menu
```
┌─ Duplicate Finder ─────────────────────────────────┐
│                                                    │
│  🔍 Scan for duplicates                           │
│  📊 View last scan results                        │
│  📋 Generate report                               │
│  ⚙️  Settings                                     │
│  ❌ Exit                                          │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Duplicate Browser
```
┌─ Duplicates Found: 15 groups, 42 files ───────────┐
│                                                    │
│  📁 Group 1: config.json (3 files)               │
│  ├─ ./src/config.json (2.1 KB) ✓                 │
│  ├─ ./backup/config.json (2.1 KB)                │
│  └─ ./old/config.json (2.1 KB)                   │
│                                                    │
│  📄 Group 2: image.png (2 files, different names) │
│  ├─ ./assets/logo.png (45.2 KB) ✓                │
│  └─ ./public/brand.png (45.2 KB)                 │
│                                                    │
│  [K]eep [D]elete [M]ove [R]ename [B]ulk [Q]uit    │
└────────────────────────────────────────────────────┘
```

## Configuration Options

### Default Ignore Patterns
- `node_modules/`
- `.venv/`, `venv/`, `env/`
- `.git/`
- `dist/`, `build/`, `out/`
- `*.log`, `*.tmp`
- `.DS_Store`, `Thumbs.db`

### User Configurable Settings
- Additional ignore patterns
- Default actions for duplicate types
- Report output location
- UI color scheme
- Confirmation preferences

## Success Criteria

1. **Functionality**: Successfully identifies all types of duplicates
2. **Performance**: Handles directories with 10,000+ files efficiently
3. **Usability**: Intuitive interface requiring minimal learning
4. **Safety**: Zero data loss incidents during testing
5. **Reports**: Generates actionable cleanup recommendations

## Future Enhancements

- Integration with cloud storage services
- Advanced similarity detection (fuzzy matching)
- Scheduled duplicate scans
- Integration with other file management tools
- API for programmatic access