# Aider MCP Server

A Model Context Protocol (MCP) server that integrates with Aider CLI, enabling AI models to execute natural language programming tasks through the Aider AI pair programming assistant.

## Overview

This MCP server acts as a bridge between AI models and Aider CLI, allowing you to:

- Execute natural language programming prompts via Aider CLI
- Perform code generation, debugging, and refactoring tasks
- Access file operations within specified working directories
- Select from various AI models (Claude, GPT-4, DeepSeek, etc.)

## Features

- **Natural Language Processing**: Send programming tasks and questions in plain English
- **Auto-commit Mode**: Automatically apply and commit code changes suggested by Aider
- **Working Directory Control**: Specify custom working directories for file operations
- **Model Selection**: Choose from various AI models (Claude, GPT-4, DeepSeek, etc.)
- **Error Handling**: Comprehensive error reporting and logging

## Prerequisites

- **Node.js**: Version 22.0.0 or later
- **Aider CLI**: Must be installed and accessible in your PATH
- **MCP Client**: Compatible with Claude Desktop, VS Code with MCP extension, or other MCP clients

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd aider-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Ensure Aider CLI is installed:**
   ```bash
   # Verify Aider CLI is available
   aider --help
   ```

## Usage

### Starting the Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Configuration

Configure your MCP client to connect to this server. For Claude Desktop, add the following to your configuration:

```json
{
  "mcpServers": {
    "aider": {
      "command": "node",
      "args": ["/path/to/aider-mcp/server.js"]
    }
  }
}
```

### Available Tools

#### `aider_execute`

Execute Aider CLI commands with natural language prompts.

**Parameters:**
- `prompt` (required): Natural language instruction for Aider CLI
- `workingDir` (optional): Absolute path to working directory
- `model` (optional): AI model to use (e.g., "sonnet", "gpt-4o", "deepseek", "o3-mini")

**Example Usage:**
```
Create a Python script that reads CSV files and generates a summary report
```

### Available Resources

#### `aider://help`

Access Aider CLI help and usage information directly through the MCP interface.

### Available Prompts

#### `aider_assistance`

Get structured coding assistance using Aider CLI.

**Parameters:**
- `task` (required): The coding task or problem to solve
- `context` (optional): Additional context or requirements

## Examples

### Basic Code Generation
```
Generate a React component for a todo list with add, edit, and delete functionality
```

### Bug Fixing
```
Fix the memory leak in the Node.js application in the /path/to/project directory
```

### Code Refactoring
```
Refactor the legacy jQuery code to modern vanilla JavaScript
```

### File Operations
```
Create a comprehensive test suite for the API endpoints in the current project
```

## API Reference

### Tool: aider_execute

Executes Aider CLI with the following options:
- `--yes`: Accept all suggestions automatically
- `--auto-commits`: Automatically commit changes
- `--model <model>`: Specify the AI model to use

### Error Handling

The server provides detailed error messages for:
- Aider CLI execution failures
- Invalid working directories
- Missing dependencies
- Permission issues

## Development

### Project Structure

```
aider-mcp/
├── server.js          # Main MCP server implementation
├── package.json       # Node.js dependencies and scripts
├── README.md          # This file
├── mcp_develop_guide.md # MCP development guide
└── aider-help.txt     # Aider CLI reference
```

### Adding New Features

1. **Tools**: Add new tool definitions in `server.js` using `server.tool()`
2. **Resources**: Implement new resources using `server.resource()`
3. **Prompts**: Create prompt templates using `server.prompt()`

### Testing

Test the server manually by running:

```bash
npm start
```

Then connect with an MCP client to verify functionality.

## Troubleshooting

### Common Issues

1. **"Aider CLI not found"**
   - Ensure Aider CLI is installed and in your PATH
   - Verify with `which aider` or `aider --version`

2. **Permission denied errors**
   - Check file permissions in the working directory
   - Ensure the user has write access to target directories

3. **Connection issues**
   - Verify the MCP client configuration
   - Check that Node.js version meets requirements (≥22.0.0)

### Debug Mode

Enable detailed logging by checking the console output when running the server:

```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is licensed under the MIT License. See the package.json file for details.

## Related Projects

- [Model Context Protocol](https://github.com/modelcontextprotocol/specification)
- [Aider CLI](https://github.com/Aider-AI/aider) - The underlying CLI tool
- [Claude Desktop](https://claude.ai/desktop) - MCP client

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Aider CLI documentation
3. Open an issue in the repository

---

**Note**: This server requires Aider CLI to be properly installed and configured on your system. Make sure you have the necessary permissions and access to use Aider CLI before using this MCP server.
