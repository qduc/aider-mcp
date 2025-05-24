#!/bin/bash

echo "🚀 Setting up Codex CLI MCP Server..."

# Check if Node.js is installed and version is adequate
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v22 or later."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Node.js version is too old. Please install Node.js v22 or later."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check syntax
echo "🔍 Checking server syntax..."
node -c server.js

if [ $? -eq 0 ]; then
    echo "✅ Server syntax is valid"
else
    echo "❌ Server syntax check failed"
    exit 1
fi

echo ""
echo "🎉 Codex CLI MCP Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure Codex CLI is installed and available in your PATH"
echo "2. Add this server to your Claude Desktop configuration:"
echo "   File: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo ""
echo "   Add this configuration:"
echo "   {"
echo "     \"mcpServers\": {"
echo "       \"codex-cli\": {"
echo "         \"command\": \"node\","
echo "         \"args\": [\"$(pwd)/server.js\"]"
echo "       }"
echo "     }"
echo "   }"
echo ""
echo "3. Restart Claude Desktop to load the new server"
echo ""
echo "To start the server manually: npm start"
