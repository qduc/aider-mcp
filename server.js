import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from "child_process";

const server = new McpServer({
  name: "Aider MCP Server",
  version: "1.0.0",
});

// Helper function to execute Aider CLI commands
async function executeAider(args, options = {}) {
  return new Promise((resolve, reject) => {
    // Log detailed command information
    console.log(`Spawning process:`, {
      command: 'aider',
      args: args,
      options: options
    });

    const aider = spawn("aider", args, {
      stdio: ["pipe", "pipe", "pipe"],
      ...options
    });

    let stdout = "";
    let stderr = "";

    aider.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    aider.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    aider.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, exitCode: code });
      } else {
        reject(new Error(`Aider CLI exited with code ${code}: ${stderr}`));
      }
    });

    aider.on("error", (error) => {
      reject(new Error(`Failed to spawn Aider CLI: ${error.message}`));
    });
  });
}

// Tool: Execute Aider CLI commands
server.tool(
  "aider_execute",
  "Execute Aider CLI commands with natural language prompts. Runs Aider CLI with auto-commit enabled, allowing AI-powered code generation, debugging, refactoring, and file operations within a specified working directory.",
  {
    prompt: z.string().describe("The natural language prompt or instruction to send to Aider CLI. This can be any programming task, question, or request such as 'create a Python script that reads CSV files', 'fix the bug in main.js', 'explain this function', etc."),
    workingDir: z.string().optional().describe("The absolute path to the working directory where Aider CLI should execute. If not provided, uses the current directory. This determines the context and scope of file operations."),
    model: z.string().optional().default("deepseek/deepseek-v3").describe("AI model to use with Aider. Recommended models: 'deepseek/deepseek-v3' (fast & cost-effective for most tasks), 'deepseek/deepseek-reasoner' (complex debugging & analysis). If not specified, defaults to 'deepseek/deepseek-v3'.")
  },
  async ({ prompt, workingDir, model }) => {
    try {
      // Default options: auto-commit enabled
      const args = ["--yes", "--auto-commits"];

      // Add model option if specified
      if (model) {
        args.push("--model", model);
      }

      // Add the prompt at the end
      args.push(`"${prompt}"`);

      const execOptions = {};
      if (workingDir) {
        execOptions.cwd = workingDir;
      }

      const result = await executeAider(args, execOptions);

      return {
        content: [{
          type: "text",
          text: `Aider CLI Output:\n${result.stdout}\n\nErrors (if any):\n${result.stderr}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error executing Aider CLI: ${error.message}`
        }]
      };
    }
  }
);

// Resource: Aider CLI documentation
server.resource("aider://help", async () => ({
  contents: [{
    uri: "aider://help",
    mimeType: "text/plain",
    text: `Aider CLI Help and Usage Information

Usage:
  $ aider [options] [files...]
  $ aider --help

Key Options:
  --yes                Accept all suggestions automatically
  --auto-commits       Automatically commit changes
  --model <model>      AI model to use (sonnet, gpt-4o, deepseek, etc.)
  --no-pretty          Disable pretty output
  --message <msg>      Single message mode
  --help               Show usage information

For complete documentation, visit: https://aider.chat/docs/`
  }]
}));

// Prompt: Code assistance with Aider
server.prompt(
  "aider_assistance",
  "Get coding assistance using Aider CLI",
  {
    task: z.string().describe("The coding task or problem to solve"),
    context: z.string().optional().describe("Additional context or requirements")
  },
  async ({ task, context }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Help me with this coding task: ${task}${context ? `\n\nAdditional context: ${context}` : ""}`
      }
    }]
  })
);

// Start the server with stdio transport
const transport = new StdioServerTransport();

server.connect(transport).catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

console.log("Aider MCP Server started successfully");