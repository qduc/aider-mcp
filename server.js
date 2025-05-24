import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

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

// Helper function to check if a directory is a git repository
function isGitRepository(dir) {
  const gitDir = join(dir, '.git');
  return existsSync(gitDir);
}

// Tool: Execute Aider CLI commands
server.tool(
  "aider_execute",
  "Execute Aider CLI commands with natural language prompts. Runs Aider CLI with auto-commit enabled, allowing AI-powered code generation, debugging, refactoring, and file operations within a specified working directory.",
  {
    prompt: z.string().describe("The natural language prompt or instruction to send to Aider CLI. This can be any programming task, question, or request such as 'create a Python script that reads CSV files', 'fix the bug in main.js', 'explain this function', etc."),
    workingDir: z.string().optional().describe("The absolute path to the working directory where Aider CLI should execute. If not provided, uses the current directory. This determines the context and scope of file operations."),
    model: z.string().optional().default("deepseek").describe("AI model to use with Aider. Available models: 'deepseek/deepseek-reasoner' (excellent reasoning and cost-effective), 'gemini/gemini-2.5-pro-preview-05-06' (high performance and excellent balance), 'deepseek' (fast and economical).")
  },
  async ({ prompt, workingDir, model }) => {
    try {
      // Default options
      const args = ["--yes", "--no-stream"];

      // Determine working directory
      const targetDir = workingDir || process.cwd();

      // Only add auto-commits if we're in a git repository
      if (isGitRepository(targetDir)) {
        args.push("--auto-commits");
      }

      // Add model option if specified
      if (model) {
        args.push("--model", model);
      }

      // Add the message flag and prompt
      args.push("--message", prompt);

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

// Tool: Execute Aider CLI in Architect Mode
server.tool(
  "aider_architect",
  "Execute Aider CLI in architect mode for complex coding tasks. Uses a two-model approach: an architect model for high-level planning and an editor model for implementation. Best for complex refactoring, feature development, and architectural changes.",
  {
    prompt: z.string().describe("The complex coding task or architectural challenge to solve. Architect mode excels at breaking down large problems, planning implementations, and coordinating multiple file changes."),
    workingDir: z.string().optional().describe("The absolute path to the working directory where Aider CLI should execute. If not provided, uses the current directory."),
    architectModel: z.string().optional().default("deepseek/deepseek-reasoner").describe("Architect model for high-level planning. Available models: 'deepseek/deepseek-reasoner' (excellent reasoning and cost-effective), 'gemini/gemini-2.5-pro-preview-05-06' (high performance), 'deepseek' (fast and economical). The architect describes solutions without editing files."),
    editorModel: z.string().optional().describe("Editor model for implementation. Available models: 'deepseek/deepseek-reasoner', 'gemini/gemini-2.5-pro-preview-05-06', 'deepseek'. If not specified, Aider chooses a suitable default based on the architect model.")
  },
  async ({ prompt, workingDir, architectModel, editorModel }) => {
    try {
      // Default options for architect mode
      const args = ["--yes", "--no-stream", "--architect"];

      // Determine working directory
      const targetDir = workingDir || process.cwd();

      // Only add auto-commits if we're in a git repository
      if (isGitRepository(targetDir)) {
        args.push("--auto-commits");
      }

      // Add architect model (main model in architect mode)
      if (architectModel) {
        args.push("--model", architectModel);
      }

      // Add editor model if specified
      if (editorModel) {
        args.push("--editor-model", editorModel);
      }

      // Add the message flag and prompt
      args.push("--message", prompt);

      const execOptions = {};
      if (workingDir) {
        execOptions.cwd = workingDir;
      }

      const result = await executeAider(args, execOptions);

      return {
        content: [{
          type: "text",
          text: `Aider Architect Mode Output:\n${result.stdout}\n\nErrors (if any):\n${result.stderr}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error executing Aider in architect mode: ${error.message}`
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