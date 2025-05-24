#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

// Properly escape shell arguments to handle special characters
function escapeShellArg(arg) {
  // For macOS/Unix systems, wrap in single quotes and escape any single quotes within
  return "'" + arg.replace(/'/g, "'\"'\"'") + "'";
}

// Execute codex command with proper shell escaping
async function executeCodexCommand(prompt, options = {}, workingDirectory = null) {
  const {
    mode = "suggest",
    image,
    additionalArgs = []
  } = options;

  return new Promise((resolve, reject) => {
    const args = [];

    // Add quiet flag for non-interactive mode (required)
    args.push("--quiet");

    // Add mode flags
    if (mode === "auto-edit") {
      args.push("--auto-edit");
    } else if (mode === "full-auto") {
      args.push("--full-auto");
    }

    // Add image support
    if (image) {
      args.push("--image", image);
    }

    // Add additional arguments
    if (additionalArgs.length > 0) {
      args.push(...additionalArgs);
    }

    // Add the properly escaped prompt as the last argument
    args.push(prompt);

    const cwd = workingDirectory || process.cwd();
    const child = spawn("codex", args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Codex command failed with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}
const PROMPT_TEMPLATES = {
  write_code: (task, language) =>
    `Write ${language} code for the following task:\n\n${task}\n\nPlease provide only the code with helpful comments.`,

  explain_code: (code, language = "code") =>
    `Explain the following ${language} code in detail, including what it does, how it works, and any important concepts:\n\n\`\`\`\n${code}\n\`\`\``,

  debug_code: (code, issueDescription, language = "code") => {
    let prompt = `Debug the following ${language} code`;
    if (issueDescription) {
      prompt += `, which has the following issue: ${issueDescription}`;
    }
    prompt += `:\n\n\`\`\`\n${code}\n\`\`\`\n\nPlease identify any bugs, explain them, and provide the corrected code.`;
    return prompt;
  },

  refactor_code: (code, requirements, language = "code") =>
    `Refactor the following ${language} code according to these requirements: ${requirements}\n\n\`\`\`\n${code}\n\`\`\`\n\nProvide the refactored code with explanations of the changes made.`,

  optimize_code: (code, language = "code") =>
    `Optimize the following ${language} code for better performance, readability, and best practices:\n\n\`\`\`\n${code}\n\`\`\`\n\nProvide the optimized code with explanations of the improvements.`
};

const server = new McpServer({
  name: "Codex CLI MCP Server",
  version: "2.0.0",
  description: "Enhanced MCP server for Codex CLI with task-specific tools and advanced features"
});

// Tool: Write code for a specific task
server.tool(
  "write_code",
  "Generate code for a specific task in the specified programming language",
  {
    task: z.string().describe("Description of the coding task to implement"),
    language: z.string().describe("Programming language (e.g., JavaScript, Python, TypeScript, etc.)"),
    mode: z.enum(["suggest", "auto-edit", "full-auto"]).optional().describe("Execution mode"),
    workingDirectory: z.string().optional().describe("Working directory for the command")
  },
  async ({ task, language, mode = "suggest", workingDirectory }) => {
    try {
      const prompt = PROMPT_TEMPLATES.write_code(task, language);
      const { stdout, stderr } = await executeCodexCommand(prompt, { mode }, workingDirectory);

      return {
        content: [{
          type: "text",
          text: `Code Generation (${language}):\n\n${stdout}${stderr ? `\nErrors:\n${stderr}` : ""}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error generating code: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Explain code
server.tool(
  "explain_code",
  "Provide detailed explanation of code functionality and concepts",
  {
    code: z.string().describe("The code to explain"),
    language: z.string().optional().describe("Programming language of the code"),
    mode: z.enum(["suggest", "auto-edit", "full-auto"]).optional().describe("Execution mode"),
    workingDirectory: z.string().optional().describe("Working directory for the command")
  },
  async ({ code, language, mode = "suggest", workingDirectory }) => {
    try {
      const prompt = PROMPT_TEMPLATES.explain_code(code, language);
      const { stdout, stderr } = await executeCodexCommand(prompt, { mode }, workingDirectory);

      return {
        content: [{
          type: "text",
          text: `Code Explanation:\n\n${stdout}${stderr ? `\nErrors:\n${stderr}` : ""}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error explaining code: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Debug code
server.tool(
  "debug_code",
  "Find and fix bugs in code with detailed explanations",
  {
    code: z.string().describe("The code to debug"),
    issueDescription: z.string().optional().describe("Description of the issue or bug"),
    language: z.string().optional().describe("Programming language of the code"),
    mode: z.enum(["suggest", "auto-edit", "full-auto"]).optional().describe("Execution mode"),
    workingDirectory: z.string().optional().describe("Working directory for the command")
  },
  async ({ code, issueDescription, language, mode = "suggest", workingDirectory }) => {
    try {
      const prompt = PROMPT_TEMPLATES.debug_code(code, issueDescription, language);
      const { stdout, stderr } = await executeCodexCommand(prompt, { mode }, workingDirectory);

      return {
        content: [{
          type: "text",
          text: `Code Debugging:\n\n${stdout}${stderr ? `\nErrors:\n${stderr}` : ""}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error debugging code: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Refactor code
server.tool(
  "refactor_code",
  "Refactor code according to specific requirements or best practices",
  {
    code: z.string().describe("The code to refactor"),
    requirements: z.string().describe("Refactoring requirements or goals"),
    language: z.string().optional().describe("Programming language of the code"),
    mode: z.enum(["suggest", "auto-edit", "full-auto"]).optional().describe("Execution mode"),
    workingDirectory: z.string().optional().describe("Working directory for the command")
  },
  async ({ code, requirements, language, mode = "suggest", workingDirectory }) => {
    try {
      const prompt = PROMPT_TEMPLATES.refactor_code(code, requirements, language);
      const { stdout, stderr } = await executeCodexCommand(prompt, { mode }, workingDirectory);

      return {
        content: [{
          type: "text",
          text: `Code Refactoring:\n\n${stdout}${stderr ? `\nErrors:\n${stderr}` : ""}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error refactoring code: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Optimize code
server.tool(
  "optimize_code",
  "Optimize code for better performance, readability, and best practices",
  {
    code: z.string().describe("The code to optimize"),
    language: z.string().optional().describe("Programming language of the code"),
    mode: z.enum(["suggest", "auto-edit", "full-auto"]).optional().describe("Execution mode"),
    workingDirectory: z.string().optional().describe("Working directory for the command")
  },
  async ({ code, language, mode = "suggest", workingDirectory }) => {
    try {
      const prompt = PROMPT_TEMPLATES.optimize_code(code, language);
      const { stdout, stderr } = await executeCodexCommand(prompt, { mode }, workingDirectory);

      return {
        content: [{
          type: "text",
          text: `Code Optimization:\n\n${stdout}${stderr ? `\nErrors:\n${stderr}` : ""}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error optimizing code: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Tool: General Codex completion (backward compatibility)
server.tool(
  "codex_completion",
  "General-purpose Codex completion with flexible prompts and advanced options",
  {
    prompt: z.string().describe("The prompt to send to Codex CLI"),
    mode: z.enum(["suggest", "auto-edit", "full-auto"]).optional().describe("Execution mode"),
    image: z.string().optional().describe("Path to image file for multimodal requests"),
    additionalArgs: z.array(z.string()).optional().describe("Additional CLI arguments"),
    workingDirectory: z.string().optional().describe("Working directory for the command")
  },
  async ({ prompt, mode = "suggest", image, additionalArgs, workingDirectory }) => {
    try {
      const { stdout, stderr } = await executeCodexCommand(prompt, { mode, image, additionalArgs }, workingDirectory);

      return {
        content: [{
          type: "text",
          text: `Codex Response (${mode} mode):\n\n${stdout}${stderr ? `\nErrors:\n${stderr}` : ""}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error executing Codex CLI: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Resource: Enhanced Codex CLI usage documentation
server.resource("codex://usage", async () => ({
  contents: [{
    uri: "codex://usage",
    mimeType: "text/markdown",
    text: `# Enhanced Codex CLI Usage

## Task-Specific Tools

### Code Generation
- **write_code**: Generate code for specific tasks in any programming language
- **explain_code**: Get detailed explanations of code functionality
- **debug_code**: Find and fix bugs with detailed analysis
- **refactor_code**: Refactor code according to specific requirements
- **optimize_code**: Optimize code for performance and best practices

### General Purpose
- **codex_completion**: Flexible completion with advanced options

## Execution Modes

- **Suggest Mode** (default): Interactive mode with permission requests
- **Auto-Edit Mode**: Automatic file editing with shell command approval
- **Full-Auto Mode**: Completely autonomous operation

## Examples

### Code Generation
\`\`\`javascript
// Generate a React component
write_code({
  task: "Create a responsive navigation component with mobile menu",
  language: "JavaScript",
  mode: "auto-edit"
})
\`\`\`

### Code Debugging
\`\`\`javascript
// Debug problematic code
debug_code({
  code: "function add(a, b) { return a + c; }",
  issueDescription: "Function returns undefined",
  language: "JavaScript"
})
\`\`\`

### Code Explanation
\`\`\`javascript
// Explain complex code
explain_code({
  code: "const memoized = useMemo(() => expensiveCalculation(deps), [deps]);",
  language: "JavaScript"
})
\`\`\`

## Advanced Features

- **Image Support**: Include images in prompts for multimodal requests
- **Custom Arguments**: Pass additional CLI arguments
- **Working Directory**: Specify execution context`
  }]
}));

// Resource: Current working directory info
server.resource("codex://cwd", async () => {
  try {
    const cwd = process.cwd();
    const files = await fs.readdir(cwd);

    return {
      contents: [{
        uri: "codex://cwd",
        mimeType: "application/json",
        text: JSON.stringify({
          workingDirectory: cwd,
          files: files,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      contents: [{
        uri: "codex://cwd",
        mimeType: "text/plain",
        text: `Error reading current directory: ${error.message}`
      }]
    };
  }
});

// Prompt: Generate optimized Codex CLI request
server.prompt(
  "codex-task-optimizer",
  "Generate an optimized request for specific coding tasks",
  {
    taskType: z.enum(["write_code", "explain_code", "debug_code", "refactor_code", "optimize_code", "general"]).describe("Type of coding task"),
    description: z.string().describe("Detailed description of the task"),
    language: z.string().optional().describe("Programming language (if applicable)"),
    codeSnippet: z.string().optional().describe("Code to work with (for explain, debug, refactor, optimize tasks)"),
    requirements: z.string().optional().describe("Specific requirements or constraints"),
    mode: z.enum(["suggest", "auto-edit", "full-auto"]).optional().describe("Execution mode preference")
  },
  async ({ taskType, description, language, codeSnippet, requirements, mode = "suggest" }) => {
    // Generate task-specific prompt
    let prompt = "";
    let toolToUse = taskType;

    const params = {
      mode: mode
    };

    switch (taskType) {
      case "write_code":
        prompt = `Task: ${description}`;
        if (language) params.language = language;
        params.task = description;
        break;

      case "explain_code":
        if (!codeSnippet) {
          prompt = "Please provide the code you want explained.";
        } else {
          params.code = codeSnippet;
          if (language) params.language = language;
        }
        break;

      case "debug_code":
        if (!codeSnippet) {
          prompt = "Please provide the code you want debugged.";
        } else {
          params.code = codeSnippet;
          if (requirements) params.issueDescription = requirements;
          if (language) params.language = language;
        }
        break;

      case "refactor_code":
        if (!codeSnippet) {
          prompt = "Please provide the code you want refactored.";
        } else {
          params.code = codeSnippet;
          params.requirements = requirements || "Apply best practices and improve code quality";
          if (language) params.language = language;
        }
        break;

      case "optimize_code":
        if (!codeSnippet) {
          prompt = "Please provide the code you want optimized.";
        } else {
          params.code = codeSnippet;
          if (language) params.language = language;
        }
        break;

      default:
        toolToUse = "codex_completion";
        params.prompt = description;
        break;
    }

    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Optimized Codex task configuration:

**Task Type**: ${taskType}
**Execution Mode**: ${mode}
${language ? `**Language**: ${language}` : ''}

**Tool to use**: ${toolToUse}
**Parameters**:
${JSON.stringify(params, null, 2)}

${prompt ? `**Additional Context**: ${prompt}` : ''}

This configuration is optimized for your specific task type.`
        }
      }]
    };
  }
);

// Start the server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Codex CLI MCP Server started and ready for connections");
}

runServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
