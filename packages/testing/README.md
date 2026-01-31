# @mcp-weave/testing

Testing utilities for MCP-Weave - mock servers, transports, and assertions for testing MCP servers.

## Installation

```bash
npm install @mcp-weave/testing --save-dev
# or
pnpm add @mcp-weave/testing -D
```

## Features

- **Mock Server** - Simulated MCP server for testing
- **Mock Transport** - In-memory transport for testing
- **Assertions** - Helper functions for MCP-specific assertions

## Quick Start

```typescript
import { createTestServer, McpMockTransport, assertToolExists } from '@mcp-weave/testing';

describe('My MCP Server', () => {
  it('should call a tool', async () => {
    const server = createTestServer();

    // Register a tool handler
    server.registerTool('greet', args => {
      return `Hello, ${args.name}!`;
    });

    // Call the tool
    const result = await server.callTool('greet', { name: 'World' });

    expect(result).toBe('Hello, World!');
  });
});
```

## Mock Server

### Creating a Test Server

```typescript
import { createTestServer, McpTestServer } from '@mcp-weave/testing';
import type { McpSpec } from '@mcp-weave/core';

// Create empty test server
const server = createTestServer();

// Create test server from spec
const spec: McpSpec = {
  version: '1.0',
  server: { name: 'test', version: '1.0.0' },
  tools: [{ name: 'hello', description: 'Says hello' }],
};
const serverWithSpec = createTestServer(spec);
```

### Registering Handlers

```typescript
// Register tool handler
server.registerTool('calculate', args => {
  return args.a + args.b;
});

// Register resource handler
server.registerResource('config://{key}', uri => {
  const key = uri.split('://')[1];
  return { value: `config-${key}` };
});

// Register prompt handler
server.registerPrompt('greeting', args => {
  return {
    messages: [{ role: 'user', content: { type: 'text', text: `Hello ${args.name}` } }],
  };
});
```

### Calling Handlers

```typescript
// Call tool
const toolResult = await server.callTool('calculate', { a: 1, b: 2 });

// Read resource
const resource = await server.readResource('config://database');

// Get prompt
const prompt = await server.getPrompt('greeting', { name: 'Alice' });
```

### Listing Definitions

```typescript
// List all definitions (from spec)
const tools = server.listTools();
const resources = server.listResources();
const prompts = server.listPrompts();
```

## Mock Transport

In-memory transport for testing MCP protocol communication.

```typescript
import { McpMockTransport } from '@mcp-weave/testing';

const transport = new McpMockTransport();

// Send a message
await transport.send({ type: 'request', method: 'tools/list' });

// Receive messages
const messages = transport.getMessages();

// Clear message history
transport.clear();

// Close transport
await transport.close();
```

## Assertions

Helper functions for common MCP assertions.

```typescript
import {
  assertToolExists,
  assertResourceExists,
  assertPromptExists,
  assertToolResult,
  assertValidSpec,
} from '@mcp-weave/testing';

// Assert tool exists in spec
assertToolExists(spec, 'my-tool');

// Assert resource exists
assertResourceExists(spec, 'config://settings');

// Assert prompt exists
assertPromptExists(spec, 'greeting');

// Assert tool result matches expected
assertToolResult(result, {
  content: [{ type: 'text', text: 'expected' }],
});

// Assert spec is valid
assertValidSpec(spec);
```

## Usage with Test Frameworks

### Vitest

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestServer } from '@mcp-weave/testing';

describe('Calculator Tool', () => {
  let server;

  beforeEach(() => {
    server = createTestServer();
    server.registerTool('add', ({ a, b }) => a + b);
  });

  it('should add two numbers', async () => {
    const result = await server.callTool('add', { a: 2, b: 3 });
    expect(result).toBe(5);
  });

  it('should throw for unknown tool', async () => {
    await expect(server.callTool('unknown', {})).rejects.toThrow('Tool not found');
  });
});
```

### Jest

```typescript
import { createTestServer } from '@mcp-weave/testing';

describe('Calculator Tool', () => {
  let server;

  beforeEach(() => {
    server = createTestServer();
    server.registerTool('add', ({ a, b }) => a + b);
  });

  test('should add two numbers', async () => {
    const result = await server.callTool('add', { a: 2, b: 3 });
    expect(result).toBe(5);
  });
});
```

## API Reference

### McpTestServer

| Method             | Description                     |
| ------------------ | ------------------------------- |
| `registerTool`     | Register a tool handler         |
| `registerResource` | Register a resource handler     |
| `registerPrompt`   | Register a prompt handler       |
| `callTool`         | Call a registered tool          |
| `readResource`     | Read a registered resource      |
| `getPrompt`        | Get a registered prompt         |
| `listTools`        | List tool definitions from spec |
| `listResources`    | List resource definitions       |
| `listPrompts`      | List prompt definitions         |

### McpMockTransport

| Method        | Description           |
| ------------- | --------------------- |
| `send`        | Send a message        |
| `getMessages` | Get all sent messages |
| `clear`       | Clear message history |
| `close`       | Close the transport   |

### Assertion Functions

| Function               | Description                    |
| ---------------------- | ------------------------------ |
| `assertToolExists`     | Assert tool exists in spec     |
| `assertResourceExists` | Assert resource exists in spec |
| `assertPromptExists`   | Assert prompt exists in spec   |
| `assertToolResult`     | Assert tool result matches     |
| `assertValidSpec`      | Assert spec is valid           |

## Requirements

- Node.js >= 18

## Related Packages

- [`@mcp-weave/core`](https://www.npmjs.com/package/@mcp-weave/core) - Core types and utilities
- [`@mcp-weave/nestjs`](https://www.npmjs.com/package/@mcp-weave/nestjs) - NestJS-style decorators
- [`@mcp-weave/cli`](https://www.npmjs.com/package/@mcp-weave/cli) - Command-line interface

## License

MIT
