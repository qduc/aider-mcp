import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from "child_process";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const server = new McpServer({
  name: "Aider MCP Server",
  version: "1.0.0",
});

// Enhanced result structure
class EnhancedAiderResult {
  constructor({
    summary = null,
    executionSuccessful = false
  } = {}) {
    this.summary = summary;
    this.executionSuccessful = executionSuccessful;
  }
}

// Enhanced Aider execution with recovery
async function executeAiderWithRecovery(args, options = {}) {
  const workingDir = options.cwd || process.cwd();
  const chatHistoryPath = join(workingDir, '.aider.chat.history.md');

  // Record chat history size before execution
  let preSize = 0;
  if (existsSync(chatHistoryPath)) {
    try {
      preSize = statSync(chatHistoryPath).size;
    } catch (error) {
      console.error('Warning: Could not read chat history size:', error.message);
    }
  }

  // Execute original Aider command
  const truncatedResult = await executeAider(args, options);

  // Small delay to ensure file is written
  await new Promise(resolve => setTimeout(resolve, 100));

  // Extract recovered content from chat history
  const recoveredContent = extractNewChatContent(chatHistoryPath, preSize);

  // Debug logging
  console.error('Debug - Chat history path:', chatHistoryPath);
  console.error('Debug - Pre-execution size:', preSize);
  console.error('Debug - Recovered content length:', recoveredContent.length);
  console.error('Debug - Recovered content preview:', recoveredContent.substring(0, 200));

  // Analyze complete output
  const analysis = analyzeCompleteOutput(truncatedResult.stdout, recoveredContent);

  return new EnhancedAiderResult({
    summary: analysis.summary,
    executionSuccessful: analysis.successful
  });
}

// Extract new content from chat history after execution
function extractNewChatContent(chatHistoryPath, preSize) {
  if (!existsSync(chatHistoryPath)) {
    return "";
  }

  try {
    const content = readFileSync(chatHistoryPath, 'utf-8');
    const newContent = content.slice(preSize);
    return parseLatestConversation(newContent);
  } catch (error) {
    console.error('Warning: Could not read chat history:', error.message);
    return "";
  }
}

// Parse latest conversation to find post-action content
function parseLatestConversation(chatContent) {
  // Look for complete <summarize>...</summarize> blocks (must start with opening tag on new line)
  const summarizeBlocks = chatContent.matchAll(/\n<summarize>(.*?)<\/summarize>/gs) || [];

  if (summarizeBlocks.length > 0) {
    // Return just the content of the last summarize block, trimmed
    return summarizeBlocks[summarizeBlocks.length - 1][1].trim();
  }

  // If no complete summarize blocks found, return empty string
  return "";
}

// Analyze complete output combining truncated + recovered
function analyzeCompleteOutput(truncatedOutput, recoveredContent) {
  // The recoveredContent is already the extracted summary content
  const summary = recoveredContent && recoveredContent.trim() ? recoveredContent.trim() : null;

  // Check if execution was successful (basic check for any meaningful output)
  const successful = summary !== null;

  return {
    summary,
    successful
  };
}

// Extract summary from recovered content
function extractSummary(text) {
  const match = text.match(/<summarize>(.*?)<\/summarize>/s);
  return match ? match[1].trim() : null;
}

// Helper function to execute Aider CLI commands
async function executeAider(args, options = {}) {
  return new Promise((resolve, reject) => {
    const aiderPath = join(homedir(), '.local', 'bin', 'aider');

    console.error(`Spawning process:`, {
      command: aiderPath,
      args: args,
      options: options
    });

    const aider = spawn(aiderPath, args, {
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

// Enhanced helper function to format output with recovery
function formatEnhancedOutput(result) {
  // Return the summary if available
  if (result.summary) {
    return `📋 Summary: ${result.summary}`;
  }

  // If no summary but execution was successful, provide basic feedback
  if (result.executionSuccessful) {
    return "✅ Aider completed successfully (no summary generated)";
  }

  // If execution failed or no meaningful output
  return "❌ Aider execution completed but no summary was generated";
}

// Shared function to execute Aider commands with common logic
async function executeAiderCommand({
  prompt,
  workingDir,
  files,
  model,
  architectMode = false,
  architectModel,
  editorModel
}) {
  try {
    const args = ["--yes", "--no-stream"];
    const targetDir = workingDir || process.cwd();

    // Add architect mode if specified
    if (architectMode) {
      args.push("--architect");
    }

    // Only add auto-commits if we're in a git repository
    if (isGitRepository(targetDir)) {
      args.push("--auto-commits");
    }

    // Add model options
    if (architectMode && architectModel) {
      args.push("--model", architectModel);
      if (editorModel) {
        args.push("--editor-model", editorModel);
      }
    } else if (model) {
      args.push("--model", model);
    }

    // Add files if specified
    if (files && files.length > 0) {
      files.forEach(file => {
        args.push("--file", file);
      });
    }

    // Add the message with summary instruction
    const fullPrompt = `${prompt}\n\nAfter completing the task, please summarize what you did in a <summarize> tag. Include what files were created/modified and the key changes made.`;
    args.push("--message", fullPrompt);

    const execOptions = {};
    if (workingDir) {
      execOptions.cwd = workingDir;
    }

    // Use enhanced execution with recovery
    const result = await executeAiderWithRecovery(args, execOptions);
    const formattedOutput = formatEnhancedOutput(result);

    return {
      content: [{
        type: "text",
        text: formattedOutput
      }]
    };
  } catch (error) {
    const mode = architectMode ? "architect mode" : "CLI";
    return {
      content: [{
        type: "text",
        text: `Error executing Aider ${mode}: ${error.message}`
      }]
    };
  }
}

// Tool: Execute Aider CLI commands (Enhanced)
server.tool(
  "aider_execute",
  "Execute Aider CLI commands with natural language prompts. Returns only the summary of what was accomplished.",
  {
    prompt: z.string().describe("The natural language prompt or instruction to send to Aider CLI. This can be any programming task, question, or request such as 'create a Python script that reads CSV files', 'fix the bug in main.js', 'explain this function', etc."),
    workingDir: z.string().optional().describe("The absolute path to the working directory where Aider CLI should execute. If not provided, uses the current directory. This determines the context and scope of file operations."),
    files: z.array(z.string()).optional().describe("Specific files for Aider to focus on. Allows you to limit Aider's scope to only work with certain files."),
    model: z.string().optional().default("deepseek").describe("AI model to use with Aider. Available models: 'deepseek/deepseek-reasoner' (excellent reasoning and cost-effective), 'gemini/gemini-2.5-pro-preview-05-06' (high performance and excellent balance), 'deepseek' (fast and economical).")
  },
  async ({ prompt, workingDir, files, model }) => {
    return executeAiderCommand({
      prompt,
      workingDir,
      files,
      model,
      architectMode: false
    });
  }
);

// Tool: Execute Aider CLI in Architect Mode (Enhanced)
server.tool(
  "aider_architect",
  "Execute Aider CLI in architect mode for complex coding tasks. Returns only the summary of what was accomplished.",
  {
    prompt: z.string().describe("The complex coding task or architectural challenge to solve. Architect mode excels at breaking down large problems, planning implementations, and coordinating multiple file changes."),
    workingDir: z.string().optional().describe("The absolute path to the working directory where Aider CLI should execute. If not provided, uses the current directory."),
    files: z.array(z.string()).optional().describe("Specific files for Aider to focus on. Allows you to limit Aider's scope to only work with certain files."),
    architectModel: z.string().optional().default("deepseek/deepseek-reasoner").describe("Architect model for high-level planning. Available models: 'deepseek/deepseek-reasoner' (excellent reasoning and cost-effective), 'gemini/gemini-2.5-pro-preview-05-06' (high performance), 'deepseek' (fast and economical). The architect describes solutions without editing files."),
    editorModel: z.string().optional().describe("Editor model for implementation. Available models: 'deepseek/deepseek-reasoner', 'gemini/gemini-2.5-pro-preview-05-06', 'deepseek'. If not specified, Aider chooses a suitable default based on the architect model.")
  },
  async ({ prompt, workingDir, files, architectModel, editorModel }) => {
    return executeAiderCommand({
      prompt,
      workingDir,
      files,
      architectMode: true,
      architectModel,
      editorModel
    });
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

// Don't log to stdout as it interferes with JSON-RPC communication
// console.log("Aider MCP Server started successfully");