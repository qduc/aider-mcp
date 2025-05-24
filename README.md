# Codex CLI MCP Server

An MCP (Model Context Protocol) server that provides AI models with tools to interact with the Codex CLI in various modes.

## Features

### Tools
- **codex_suggest**: Execute Codex CLI in suggest mode (interactive, asks for permission)
- **codex_auto_edit**: Execute Codex CLI in auto-edit mode (auto-edits files, asks for shell approval)
- **codex_full_auto**: Execute Codex CLI in full-auto mode (completely autonomous)
- **codex_status**: Check Codex CLI installation and status
- **list_directory**: List files in a directory for context

### Resources
- **codex://usage**: Codex CLI usage documentation
- **codex://cwd**: Current working directory information

### Prompts
- **codex-request**: Generate properly formatted requests for Codex CLI

## Prerequisites

- Node.js v22 or later
- Codex CLI installed and available in PATH

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Integration with Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codex-cli": {
      "command": "node",
      "args": ["/Users/qduc/src/codex-mcp/server.js"]
    }
  }
}
```

## Tool Examples

### Using codex_suggest
Execute Codex in interactive mode:
```
Use the codex_suggest tool with request: "Help me implement a user authentication system"
```

### Using codex_auto_edit
Execute Codex in auto-edit mode:
```
Use the codex_auto_edit tool with request: "Refactor this React component to use TypeScript"
```

### Using codex_full_auto
Execute Codex in fully autonomous mode:
```
Use the codex_full_auto tool with request: "Analyze the data.csv file and create a comprehensive report"
```

### Using list_directory
Get context about the current project:
```
Use the list_directory tool with directory: "/path/to/project" and recursive: true
```

## Resource Examples

### Access usage documentation
```
Read the codex://usage resource for complete Codex CLI documentation
```

### Get current directory info
```
Read the codex://cwd resource for current working directory details
```

## Prompt Examples

### Generate optimized Codex requests
```
Use the codex-request prompt with:
- task_description: "Create a REST API with authentication"
- mode: "auto-edit"
- context: "This is a Node.js Express project"
```

## Security

This MCP server executes Codex CLI commands with the same security model as Codex itself. Even in full-auto mode, Codex runs in a sandboxed environment for safety.

## Error Handling

The server includes comprehensive error handling for:
- Missing Codex CLI installation
- Invalid working directories
- Command execution failures
- File system access errors

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
