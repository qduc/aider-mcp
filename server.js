import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from "child_process";
import { existsSync, readFileSync, statSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { error } from "console";

const server = new McpServer({
  name: "Aider MCP Server",
  version: "1.0.0",
});

// Enhanced result structure
class EnhancedAiderResult {
  constructor({
    summary = null,
    error = null,
    executionSuccessful = false
  } = {}) {
    this.summary = summary;
    this.error = error;
    this.executionSuccessful = executionSuccessful;
  }
}

// Helper function to find the git root directory from a starting directory
function findGitRoot(startDir) {
  let dir = startDir;
  while (dir !== '/' && dir !== dirname(dir)) {
    if (existsSync(join(dir, '.git'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return null;
}

// Helper function to find Aider executable path
function findAiderExecutable() {
  // Common installation paths for Aider
  const commonPaths = [
    join(homedir(), '.local', 'bin', 'aider'),
    '/usr/local/bin/aider',
    '/usr/bin/aider',
    '/opt/homebrew/bin/aider',
    join(homedir(), '.cargo', 'bin', 'aider')
  ];

  // Check each common path
  for (const path of commonPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Fallback to 'aider' in PATH - let the system resolve it
  return 'aider';
}

// Enhanced Aider execution with recovery
async function executeAiderWithRecovery(args, options = {}) {
  const workingDir = options.cwd || process.cwd();
  // Find git root if inside a git repo, else use workingDir
  const gitRoot = findGitRoot(workingDir);
  const chatHistoryDir = gitRoot || workingDir;
  const chatHistoryPath = join(chatHistoryDir, '.aider.chat.history.md');

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
  console.error('Debug - Recovered content type:', recoveredContent.type);
  console.error('Debug - Recovered content length:', recoveredContent.content.length);
  console.error('Debug - Recovered content preview:', recoveredContent.content.substring(0, 200));

  // Analyze complete output
  const analysis = analyzeCompleteOutput(truncatedResult.stdout, recoveredContent);

  return new EnhancedAiderResult({
    summary: analysis.summary,
    error: analysis.error,
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
  console.error('Debug - Chat content length:', chatContent.length);
  console.error('Debug - Chat content preview:', chatContent.substring(0, 500));

  // Look for complete <summary>...</summary> blocks (must start with opening tag on new line)
  // Use strict pattern to avoid matching incomplete tags
  const summarizeMatches = Array.from(chatContent.matchAll(/\n<summary>\s*(.*?)\s*<\/summary>/gs));

  console.error('Debug - Summarize matches found:', summarizeMatches.length);

  if (summarizeMatches.length > 0) {
    const lastMatch = summarizeMatches[summarizeMatches.length - 1][1].trim();
    console.error('Debug - Last match content:', lastMatch);
    return { type: 'summary', content: lastMatch };
  }

  // Look for error patterns - flexible matching for Error, Exception and related keywords
  const errorPatterns = [
    // LiteLLM and API errors
    /litellm\.[A-Za-z]*Error:\s*(.*?)(?=\n\n|\n[A-Z]|\n$|$)/gs,
    // General Exception patterns
    /([A-Za-z]*Exception):\s*(.*?)(?=\n\n|\n[A-Z]|\n$|$)/gs,
    // General Error patterns
    /([A-Za-z]*Error):\s*(.*?)(?=\n\n|\n[A-Z]|\n$|$)/gs,
    // Traceback patterns
    /Traceback \(most recent call last\):(.*?)(?=\n\n|\n[A-Z]|\n$|$)/gs,
    // HTTP error patterns
    /HTTP\s+\d{3}\s+Error:(.*?)(?=\n\n|\n[A-Z]|\n$|$)/gs
  ];

  for (const pattern of errorPatterns) {
    const errorMatches = Array.from(chatContent.matchAll(pattern));
    console.error('Debug - Error matches found for pattern:', pattern, 'matches:', errorMatches.length);

    if (errorMatches.length > 0) {
      const lastErrorMatch = errorMatches[errorMatches.length - 1];
      let errorContent = lastErrorMatch[0].trim();

      // Clean up the error content - remove excessive whitespace and normalize
      errorContent = errorContent.replace(/\s+/g, ' ').trim();

      console.error('Debug - Last error match content:', errorContent);
      return { type: 'error', content: errorContent };
    }
  }

  // If no complete summarize blocks or errors found, return empty
  return { type: 'none', content: "" };
}

// Analyze complete output combining truncated + recovered
function analyzeCompleteOutput(truncatedOutput, recoveredResult) {
  // recoveredResult is now an object with type and content
  let summary = null;
  let error = null;

  if (recoveredResult && recoveredResult.content && recoveredResult.content.trim()) {
    if (recoveredResult.type === 'summary') {
      summary = recoveredResult.content.trim();
    } else if (recoveredResult.type === 'error') {
      error = recoveredResult.content.trim();
    }
  }

  // Check if execution was successful (has summary and no error)
  const successful = summary !== null && error === null;

  return {
    summary,
    error,
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
    const aiderPath = findAiderExecutable();

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
  // Return error if detected
  if (result.error) {
    return `🚨 Error Detected:\n${result.error}`;
  }

  // Return the summary if available
  if (result.summary) {
    return `📋 Summary:\n${result.summary}`;
  }

  // If no summary and no error but execution was successful, provide basic feedback
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
  editorModel,
  restoreChatHistory = false
}) {
  try {
    const args = ["--yes", "--no-stream"];
    const targetDir = workingDir || process.cwd();

    // Prevent running in root directory for safety
    if (targetDir === '/') {
      return {
        content: [{
          type: "text",
          text: "⛔ ERROR: Cannot execute Aider in the root directory for safety reasons. Please specify a valid project directory.",
        }],
        error: {
          code: "ROOT_DIR_FORBIDDEN",
          message: "Cannot execute Aider in the root directory"
        }
      };
    }

    // Add architect mode if specified
    if (architectMode) {
      args.push("--architect");
    }

    // Add restore chat history if specified
    if (restoreChatHistory) {
      args.push("--restore-chat-history");
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
      if (files.length > 10) {
          // Return error
          return {
            content: [{
              type: "text",
              text: "⛔ ERROR: Too many files specified. Aider supports a maximum of 10 files per command to ensure performance and reliability."
            }]
          }
      }
      files.forEach(file => {
        args.push("--file", file);
      });
    }

    // Add the message with summary instruction
    const fullPrompt = `${prompt}\n\nAfter completing the task, please summarize the result in a <summary></summary> tag.`;
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
  "Execute Aider CLI commands with natural language prompts. Aider is a one-shot coding assistant that excels at isolated tasks focused on a specific set of files. Returns only the summary of what was accomplished.",
  {
    prompt: z.string().describe("The natural language prompt or instruction to send to Aider CLI. This can be any programming task, question, or request such as 'create a Python script that reads CSV files', 'fix the bug in main.js', 'explain this function', etc."),
    workingDir: z.string().optional().describe("The absolute path to the working directory where Aider CLI should execute. If not provided, uses the current directory. This determines the context and scope of file operations."),
    files: z.array(z.string()).optional().describe("Specific files required for the task."),
    model: z.string().optional().default("deepseek").describe("AI model to use with Aider. Available models: 'deepseek/deepseek-reasoner' (excellent reasoning and cost-effective), 'gemini/gemini-2.5-pro-preview-05-06' (high performance and excellent balance), 'deepseek' (fast and economical)."),
    restoreChatHistory: z.boolean().optional().default(false).describe("Enable Aider to remember past conversations from chat history. Useful when the current task needs to refer to previous context or build upon earlier work.")
  },
  async ({ prompt, workingDir, files, model, restoreChatHistory }) => {
    return executeAiderCommand({
      prompt,
      workingDir,
      files,
      model,
      architectMode: false,
      restoreChatHistory
    });
  }
);

// Tool: Execute Aider CLI in Architect Mode (Enhanced)
server.tool(
  "aider_architect",
  "Execute Aider CLI in architect mode for complex coding tasks. Aider is a one-shot coding assistant that excels at isolated tasks focused on a specific set of files. Architect mode is designed for breaking down large problems into manageable components. Returns only the summary of what was accomplished.",
  {
    prompt: z.string().describe("The complex coding task or architectural challenge to solve. Architect mode excels at breaking down large problems, planning implementations, and coordinating multiple file changes."),
    workingDir: z.string().optional().describe("The absolute path to the working directory where Aider CLI should execute. If not provided, uses the current directory."),
    files: z.array(z.string()).optional().describe("Specific files required for the task."),
    architectModel: z.string().optional().default("deepseek/deepseek-reasoner").describe("Architect model for high-level planning. Available models: 'deepseek/deepseek-reasoner' (excellent reasoning and cost-effective), 'gemini/gemini-2.5-pro-preview-05-06' (high performance), 'deepseek' (fast and economical). The architect describes solutions without editing files."),
    editorModel: z.string().optional().describe("Editor model for implementation. Available models: 'deepseek/deepseek-reasoner', 'gemini/gemini-2.5-pro-preview-05-06', 'deepseek'. If not specified, Aider chooses a suitable default based on the architect model."),
    restoreChatHistory: z.boolean().optional().default(false).describe("Enable Aider to remember past conversations from chat history. Useful when the current task needs to refer to previous context or build upon earlier work.")
  },
  async ({ prompt, workingDir, files, architectModel, editorModel, restoreChatHistory }) => {
    return executeAiderCommand({
      prompt,
      workingDir,
      files,
      architectMode: true,
      architectModel,
      editorModel,
      restoreChatHistory
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