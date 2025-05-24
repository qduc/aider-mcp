# How to Create an MCP Server

## What is MCP?

The Model Context Protocol (MCP) is an open standard developed by Anthropic that enables AI models to securely connect to external data sources, tools, and APIs. Think of it as a universal translator between AI models and various services, allowing LLMs to access real-time information and execute functions without requiring direct integration with each data source.

## Core Concepts

MCP servers can implement three main primitives:

1. **Tools** - Functions that AI models can execute (API calls, data updates)
2. **Resources** - Data objects accessible through the server (files, API responses)
3. **Prompts** - Template instructions that guide AI models

## Getting Started

### Option 1: JavaScript/TypeScript (Recommended for beginners)

**Prerequisites:**
- Node.js v22 or later
- Basic JavaScript knowledge

**Setup:**
```bash
mkdir my-mcp-server
cd my-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk zod
```

**Basic Server Example:**
```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({
  name: "My First MCP Server",
  version: "1.0.0",
});

// Define a simple tool
server.tool(
  "translate",
  {
    text: z.string(),
    targetLanguage: z.enum(["spanish", "french", "german"]),
  },
  async ({ text, targetLanguage }) => {
    // Your translation logic here
    const translatedText = `[Translated: "${text}" to ${targetLanguage}]`;
    return {
      content: [{ type: "text", text: translatedText }],
    };
  }
);

// Start the server
server.connect({
  capabilities: {
    tools: {}
  }
});
```

### Option 2: Python

**Setup:**
```bash
uv init mcp-server-demo
cd mcp-server-demo
uv add mcp
```

**Basic Python Server:**
```python
from mcp import McpServer
import asyncio

server = McpServer("my-server")

@server.tool()
async def get_weather(city: str) -> str:
    """Get weather for a city"""
    return f"The weather in {city} is sunny!"

async def main():
    async with server:
        await server.run()

if __name__ == "__main__":
    asyncio.run(main())
```

### Option 3: C#/.NET

**Setup:**
```bash
dotnet new console -n MCPServer
cd MCPServer
dotnet add package ModelContextProtocol --version 0.1.0-preview.1.25171.12
```

**Basic C# Server:**
```csharp
var builder = Host.CreateEmptyApplicationBuilder(settings: null);
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithTools();

await builder.Build().RunAsync();

[McpToolType]
public static class MyTools
{
    [McpTool, Description("Get the current time for a city")]
    public static string GetCurrentTime(string city) =>
        $"It is {DateTime.Now.Hour}:{DateTime.Now.Minute} in {city}.";
}
```

## Advanced Features

### Adding Resources
```javascript
server.resource("city://new-york", async () => ({
  contents: [{
    uri: "city://new-york",
    mimeType: "application/json",
    text: JSON.stringify({ name: "New York", population: 8000000 })
  }]
}));
```

### Adding Prompts
```javascript
server.prompt("weather-advice", "Get weather advice for a location", {
  location: z.string()
}, async ({ location }) => ({
  messages: [{
    role: "user",
    content: {
      type: "text",
      text: `Give weather advice for ${location}`
    }
  }]
}));
```

## Running Your Server

### Development Mode
Most MCP servers use stdio (standard input/output) transport for communication:

```bash
node server.js
```

### Integration with Claude Desktop
Add your server to Claude Desktop's configuration file:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/your/server.js"]
    }
  }
}
```

## Key Benefits

- **Standardized Protocol**: Works with any MCP-compatible AI client
- **Security**: Controlled access to external resources
- **Flexibility**: Support for real-time data, tools, and prompts
- **Scalability**: Can handle complex integrations and multiple data sources
