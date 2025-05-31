# Aider MCP Server

A Model Context Protocol (MCP) server that integrates with Aider CLI, enabling AI models to execute natural language programming tasks through the Aider AI pair programming assistant.

## Overview

This MCP server acts as a bridge between AI models and Aider CLI, allowing you to:

- Execute natural language programming prompts via Aider CLI
- Perform code generation, debugging, and refactoring tasks in focused, one-shot sessions
- Access file operations within specified working directories
- Select from various AI models (DeepSeek Reasoner, Gemini 2.5 Pro, etc.)
- Use architect mode for complex tasks requiring planning and coordination
- Maintain context across sessions with chat history restoration

## Features

- **Natural Language Processing**: Send programming tasks and questions in plain English
- **Architect Mode**: Break down complex problems with specialized architect and editor models
- **Auto-commit Mode**: Automatically apply and commit code changes suggested by Aider
- **Working Directory Control**: Specify custom working directories for file operations
- **Advanced Model Selection**: Choose from optimized AI models including DeepSeek Reasoner, Gemini 2.5 Pro, and more
- **Chat History Restoration**: Maintain context across sessions for continuous development
- **Enhanced Output Recovery**: Intelligent summary extraction from Aider's chat history
- **File-Specific Operations**: Target specific files for focused editing tasks
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

Execute Aider CLI commands with natural language prompts. Ideal for focused, one-shot coding tasks.

**Parameters:**
- `prompt` (required): Natural language instruction for Aider CLI
- `workingDir` (optional): Absolute path to working directory
- `files` (optional): Array of specific files required for the task
- `model` (optional): AI model to use (default: "deepseek")
  - `deepseek/deepseek-reasoner`: Excellent reasoning and cost-effective
  - `gemini/gemini-2.5-pro-preview-05-06`: High performance and excellent balance
  - `deepseek`: Fast and economical
- `restoreChatHistory` (optional): Enable Aider to remember past conversations

#### `aider_architect`

Execute Aider CLI in architect mode for complex coding tasks requiring planning and coordination.

**Parameters:**
- `prompt` (required): Complex coding task or architectural challenge
- `workingDir` (optional): Absolute path to working directory
- `files` (optional): Array of specific files required for the task
- `architectModel` (optional): Model for high-level planning (default: "deepseek/deepseek-reasoner")
- `editorModel` (optional): Model for implementation (auto-selected if not specified)
- `restoreChatHistory` (optional): Enable Aider to remember past conversations

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

### Architect Mode for Complex Tasks
```
Design and implement a microservices architecture for a task management system with authentication, real-time updates, and database persistence
```

### Working with Specific Files
```
Refactor the React components in src/components/UserManagement.js to use TypeScript and add proper error handling
```

### Chat History Context
```
Continue improving the API based on our previous discussion about rate limiting and error handling
```

## API Reference

### Tool: aider_execute

Executes Aider CLI with the following options:
- `--yes`: Accept all suggestions automatically
- `--auto-commits`: Automatically commit changes
- `--model <model>`: Specify the AI model to use

### Tool: aider_architect

Executes Aider CLI in architect mode with the following options:
- `--architect`: Enable architect mode for complex tasks
- `--model <architectModel>`: Specify the architect model for planning
- `--editor-model <editorModel>`: Specify the editor model for implementation

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
