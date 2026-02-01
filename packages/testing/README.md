# @mcp-weave/testing

Testing utilities for MCP-Weave - test clients, mock servers, transports, and assertions for testing MCP servers.

## Installation

```bash
npm install @mcp-weave/testing --save-dev
# or
pnpm add @mcp-weave/testing -D
```

## Features

- **McpTestClient** - Test decorated classes directly (recommended)
- **Mock Server** - Simulated MCP server for testing
- **Mock Transport** - In-memory transport for testing
- **Assertions** - Helper functions for MCP-specific assertions

## Quick Start with McpTestClient

The `McpTestClient` allows you to test your decorated MCP server classes directly:

```typescript
import 'reflect-metadata';
import { McpTestClient, createTestClient } from '@mcp-weave/testing';

describe('My MCP Server', () => {
  let client: McpTestClient;

  beforeEach(() => {
    client = new McpTestClient(MyServer);
  });

  it('should call a tool', async () => {
    const result = await client.callTool('create_user', {
      name: 'John',
      email: 'john@example.com',
    });

    expect(result.content[0].text).toContain('success');
  });

  it('should read a resource', async () => {
    const result = await client.readResource('users://list');
    const data = JSON.parse(result.contents[0].text);
    expect(data.users).toBeDefined();
  });

  it('should get a prompt', async () => {
    const result = await client.getPrompt('welcome', { name: 'Alice' });
    expect(result.messages[0].content.text).toContain('Alice');
  });

  it('should list available tools', () => {
    const tools = client.listTools();
    expect(tools).toContainEqual(expect.objectContaining({ name: 'create_user' }));
  });

  it('should check tool existence', () => {
    expect(client.hasTool('create_user')).toBe(true);
    expect(client.hasTool('nonexistent')).toBe(false);
  });
});
```

## McpTestClient API

### Creating a Client

```typescript
import { McpTestClient, createTestClient } from '@mcp-weave/testing';

// Using constructor
const client = new McpTestClient(MyDecoratedServer);

// Using factory function
const client = createTestClient(MyDecoratedServer);
```

### Methods

| Method                  | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `callTool(name, args)`  | Call a tool and get the result                 |
| `readResource(uri)`     | Read a resource by URI                         |
| `getPrompt(name, args)` | Get a prompt with arguments                    |
| `listTools()`           | List all available tools                       |
| `listResources()`       | List all available resources                   |
| `listPrompts()`         | List all available prompts                     |
| `hasTool(name)`         | Check if a tool exists                         |
| `hasResource(uri)`      | Check if a resource exists (supports patterns) |
| `hasPrompt(name)`       | Check if a prompt exists                       |
| `getInstance<T>()`      | Get the raw server instance                    |

---

## Mock Server (Low-Level Testing)

For more control, use the mock server directly:

```typescript
import { createTestServer, McpTestServer } from '@mcp-weave/testing';

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
