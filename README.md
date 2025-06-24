# Duplicate Finder CLI

An interactive CLI tool for finding and managing duplicate files and folders
using eza for enhanced file listing.

## Features

### 🔍 **Comprehensive Duplicate Detection**

- **Name-based duplicates**: Files with identical names in different locations
- **Content-based duplicates**: Files with same SHA-256 hash regardless of name
- **Folder-based duplicates**: Directories with identical structure and content

### 🎯 **Interactive Management Interface**

- Browse duplicate groups with intuitive keyboard navigation
- Per-file actions: Keep, Delete, Move, Rename
- Bulk actions for entire duplicate groups
- Real-time preview and comparison of file contents
- Beautiful CLI interface similar to Claude Code

### 📋 **Professional Reporting**

- Generate comprehensive markdown reports with prettier formatting
- Executive summary with space savings analysis
- Detailed breakdown by duplicate type
- Recommended cleanup action plans
- Before/after directory structure visualization

### ⚡ **Enhanced Performance**

- Leverages eza with `--git-ignore` for fast file discovery
- Async file processing with SHA-256 hashing
- Efficient recursive directory scanning
- Memory-optimized for large directory structures

### 🔒 **Advanced Safety Features**

- Complete undo system with automatic backups
- Configuration management with user preferences
- Comprehensive logging for troubleshooting
- Confirmation prompts for all destructive actions
- Git integration respects .gitignore files automatically

## Installation

### Prerequisites

- [Node.js 16+](https://nodejs.org/)
- [eza](https://eza.rocks/) - Modern replacement for `ls`
- Git (for .gitignore support)

```bash
# Install eza (macOS with Homebrew)
brew install eza

# Clone the repository
git clone git@github.com:mugoosse/duplicates-finder.git
cd duplicates-finder

# Install dependencies
npm install

# Build the project
npm run build

# Link for global usage (optional)
npm link
```

### Quick Start

```bash
# Scan current directory
npm run dev scan .

# Launch interactive mode
npm run dev interactive .

# Get help
npm run dev --help
```

## Usage

### 🎯 Interactive Mode (Recommended)

Launch the beautiful interactive interface to browse and manage duplicates:

```bash
# Scan current directory
npm run dev interactive

# Scan specific directory
npm run dev interactive /path/to/directory
```

**Features:**

- Navigate duplicate groups with arrow keys
- Choose actions for individual files or entire groups
- Generate reports directly from the interface
- Preview file contents and differences
- Safe operations with confirmation prompts

### 📊 Scan Mode

Quick scan to get an overview of duplicates:

```bash
# Basic scan
npm run dev scan /path/to/directory

# Scan with options
npm run dev scan /path/to/directory -a --max-depth 5
```

**Options:**

- `-a, --all`: Include hidden files
- `-d, --max-depth <depth>`: Maximum depth to scan
- `-o, --output <file>`: Save results to file

**Example Output:**

```
📊 Scan Summary:
• Total files scanned: 293
• Duplicate groups found: 8
• Files in duplicates: 584
• Total duplicate size: 1.2 MB
• Potential space savings: 1.2 MB
• Name-based duplicates: 5 groups
• Content-based duplicates: 2 groups
• Folder-based duplicates: 1 groups
```

### 📋 Report Generation

Generate professionally formatted markdown reports:

```bash
# Generate report from interactive mode
# (Use "Generate report" option in interactive interface)

# Manual report generation
npm run dev report -i <input-file> -o <output-file>
```

**Report Features:**

- Executive summary with space savings analysis
- Detailed breakdown by duplicate type
- Recommended cleanup action plans
- Manual cleanup commands for advanced users
- Automatically formatted with prettier

## 🏗️ Technical Architecture

### Project Structure

```
src/
├── cli/           # CLI commands and main entry point
├── scanner/       # File discovery with eza integration
├── detector/      # Duplicate detection algorithms
├── ui/           # Interactive interface components
├── reporter/     # Markdown report generation with prettier
├── utils/        # Shared utilities and helpers
└── types/        # TypeScript type definitions
```

### Detection Algorithms

**Name-based Detection:**

- Groups files by identical names
- Identifies organizational issues
- Fast comparison using filename matching

**Content-based Detection:**

- SHA-256 hashing for accurate content comparison
- Detects files with same content but different names
- Handles large files efficiently with streaming

**Folder-based Detection:**

- Recursive structure comparison
- Content hash aggregation for entire directories
- Identifies duplicate folder hierarchies

## 🎨 Interface Examples

### Interactive Browse Mode

```
╭─────────────────╮
│ 📝 Group 1 of 8 │
╰─────────────────╯
Type: content-based
Files: 2
Total size: 26.0 B
Potential savings: 13.0 B

1. ./documents/report.pdf
   1.2 MB • Modified 2 days ago
2. ./backup/reports/report.pdf
   1.2 MB • Modified 2 days ago

? What would you like to do with this group?
❯ ✅ Keep all files
  🎯 Select actions for individual files
  🗑️  Delete all but one
  ➡️  Next group
```

### Scan Results Summary

```
🔍 Duplicate Finder - Scan Mode
Scanning: /Users/username/Documents

📊 Scan Summary:
• Total files scanned: 1,247
• Duplicate groups found: 23
• Files in duplicates: 156
• Total duplicate size: 847.3 MB
• Potential space savings: 423.1 MB
• Name-based duplicates: 12 groups
• Content-based duplicates: 8 groups
• Folder-based duplicates: 3 groups

⏱️  Scan completed in 2.3s
```

## ⚙️ Configuration

### Default Ignore Patterns

The tool automatically ignores common directories and files:

```json
{
  "ignorePatterns": [
    "node_modules/",
    ".venv/",
    "venv/",
    "env/",
    ".git/",
    "dist/",
    "build/",
    "out/",
    "*.log",
    "*.tmp",
    ".DS_Store",
    "Thumbs.db"
  ]
}
```

### User Configuration

Customize settings in `~/.duplicates-finder/config.json`:

```json
{
  "ignorePatterns": ["custom-folder/", "*.backup"],
  "defaultActions": {
    "content-based": "delete-all-but-one",
    "name-based": "review-individual"
  },
  "reportOutputPath": "./cleanup-report.md",
  "colorScheme": "auto",
  "confirmDestructiveActions": true,
  "maxFileSize": 104857600,
  "enableUndo": true
}
```

## 🔒 Safety Features

### Comprehensive Safety System

- **🔄 Undo System**: Complete operation history with rollback capability
- **💾 Automatic Backups**: Files backed up before any destructive operations
- **✅ Confirmation Prompts**: Multiple confirmations for destructive actions
- **📝 Detailed Logging**: Comprehensive logs stored in `duplicate-finder.log`
- **🛡️ Safe Mode**: Preview actions without executing them
- **🔍 Git Integration**: Automatically respects .gitignore files

### Backup Location

Backups are stored in `~/.duplicates-finder/backups/` with timestamps.

## 🛠️ Development

### Development Scripts

```bash
# Development mode with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Watch mode for continuous development
npm run watch

# Type checking without building
npm run typecheck

# Format markdown files with prettier
npm run format

# Start built application
npm start
```

### Project Dependencies

- **Runtime**: Node.js 16+ with TypeScript
- **CLI Framework**: Commander.js for command parsing
- **UI Libraries**: chalk, inquirer, ora, boxen for beautiful interface
- **File Operations**: Native Node.js fs/promises with crypto for hashing
- **Formatting**: Prettier for markdown report formatting

### Testing

```bash
# Test on sample directory
npm run dev scan ./test-data
npm run dev interactive ./test-data
```

## 📋 Requirements

### System Requirements

- **Node.js 16+** - [Download](https://nodejs.org/)
- **eza** - Modern ls replacement - [Install Guide](https://eza.rocks/)
- **Git** - For .gitignore support (optional)

### Platform Support

- ✅ **macOS** - Fully supported
- ✅ **Linux** - Fully supported
- ⚠️ **Windows** - Basic support (eza required)

## 🤝 Contributing

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/amazing-feature`
5. Make your changes and test thoroughly
6. Submit a pull request

### Code Style

- TypeScript with strict type checking
- Prettier for code formatting
- Modular architecture with clear separation of concerns
- Comprehensive error handling and logging

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [eza](https://eza.rocks/) - Modern replacement for ls
- [Commander.js](https://github.com/tj/commander.js/) - CLI framework
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js/) - Interactive prompts
- [Prettier](https://prettier.io/) - Code and markdown formatting
