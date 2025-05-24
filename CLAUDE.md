# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server project for Aider CLI integration. The server enables AI models to securely connect to and execute Aider CLI commands through the standardized MCP protocol.

**Architecture:**
- **MCP Server**: Implements tools, resources, and prompts using `@modelcontextprotocol/sdk`
- **Aider Integration**: Bridges AI models with Aider CLI through subprocess execution
- **Transport**: Uses stdio (standard input/output) for communication with MCP clients

## Development Commands

**Start the server:**
```bash
npm start
```

**Development mode with auto-restart:**
```bash
npm run dev
```

**Install dependencies:**
```bash
npm install
```

## Key Technical Requirements

- **Node.js**: Version 22+ required (specified in package.json engines)
- **Module Type**: ES modules (`"type": "module"` in package.json)
- **Dependencies**: 
  - `@modelcontextprotocol/sdk` for MCP protocol implementation
  - `zod` for schema validation
  - `child_process` for executing Codex CLI commands

## MCP Server Implementation Pattern

When implementing MCP tools, follow this structure:
```javascript
server.tool("tool-name", {
  param: z.string(),
}, async ({ param }) => {
  // Tool implementation
  return {
    content: [{ type: "text", text: result }],
  };
});
```

## Aider CLI Integration

**Available Aider CLI modes:**
- `--yes`: Accept all suggestions automatically
- `--auto-commits`: Automatically commit changes
- `--model <model>`: Specify AI model (sonnet, gpt-4o, deepseek, o3-mini, etc.)
- `--message <msg>`: Single message mode for programmatic use

**Recommended integration pattern:**
Use subprocess execution with careful output handling and error management for Aider CLI commands.

## Development Notes

- The main server file is `server.js` (referenced in package.json but needs to be created)
- All MCP servers use stdio transport for communication
- Integration testing should verify MCP protocol compliance
- Security considerations: Validate all inputs before passing to Aider CLI