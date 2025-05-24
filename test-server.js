#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('Testing Codex CLI MCP Server...');

const server = spawn('node', ['server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Test the server responds to a basic MCP protocol message
setTimeout(() => {
  const testMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };

  server.stdin.write(JSON.stringify(testMessage) + '\n');

  setTimeout(() => {
    console.log('✅ Server started successfully');
    server.kill();
    process.exit(0);
  }, 1000);
}, 1000);

server.stderr.on('data', (data) => {
  console.log('Server status:', data.toString().trim());
});

server.on('error', (error) => {
  console.error('❌ Server failed to start:', error.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('❌ Server test timed out');
  server.kill();
  process.exit(1);
}, 5000);
