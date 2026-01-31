# @mcp-weave/nestjs

NestJS-style decorators for building Model Context Protocol (MCP) servers with TypeScript.

## Installation

```bash
npm install @mcp-weave/nestjs reflect-metadata
# or
pnpm add @mcp-weave/nestjs reflect-metadata
```

**Important:** Enable decorators in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Features

- **Class Decorators** - `@McpServer` to define MCP servers
- **Method Decorators** - `@McpTool`, `@McpResource`, `@McpPrompt`
- **Parameter Decorators** - `@McpInput`, `@McpParam`, `@McpPromptArg`
- **Runtime Server** - Start MCP servers from decorated classes

## Quick Start

```typescript
import 'reflect-metadata';
import {
  McpServer,
  McpTool,
  McpResource,
  McpPrompt,
  McpInput,
  McpParam,
  McpPromptArg,
  createMcpServer,
} from '@mcp-weave/nestjs';

@McpServer({
  name: 'my-server',
  version: '1.0.0',
  description: 'My MCP server',
})
class MyServer {
  @McpTool({
    name: 'greet',
    description: 'Greets a user',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name to greet' },
      },
      required: ['name'],
    },
  })
  greet(@McpInput() input: { name: string }) {
    return `Hello, ${input.name}!`;
  }

  @McpResource({
    uri: 'config://settings',
    name: 'Settings',
    description: 'Application settings',
  })
  getSettings() {
    return {
      contents: [
        {
          uri: 'config://settings',
          mimeType: 'application/json',
          text: JSON.stringify({ theme: 'dark' }),
        },
      ],
    };
  }

  @McpPrompt({
    name: 'welcome',
    description: 'Welcome message prompt',
    arguments: [{ name: 'username', description: 'User name', required: true }],
  })
  welcomePrompt(@McpPromptArg('username') username: string) {
    return {
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: `Welcome ${username} to our service!` },
        },
      ],
    };
  }
}

// Start the server
createMcpServer(MyServer);
```

## Decorators

### @McpServer

Marks a class as an MCP server.

```typescript
@McpServer({
  name: 'server-name',
  version: '1.0.0',
  description: 'Optional description',
})
class MyServer {}
```

### @McpTool

Defines an MCP tool (callable function).

```typescript
@McpTool({
  name: 'tool_name',
  description: 'What the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string' },
      param2: { type: 'number' },
    },
    required: ['param1'],
  },
})
myTool(@McpInput() input: ToolInput) {
  return result;
}
```

### @McpResource

Defines an MCP resource (readable data).

```typescript
@McpResource({
  uri: 'resource://path/{id}',
  name: 'Resource Name',
  description: 'Resource description',
  mimeType: 'application/json',
})
getResource(@McpParam('id') id: string) {
  return {
    contents: [{ uri: `resource://path/${id}`, text: 'content' }],
  };
}
```

### @McpPrompt

Defines an MCP prompt template.

```typescript
@McpPrompt({
  name: 'prompt_name',
  description: 'Prompt description',
  arguments: [
    { name: 'arg1', description: 'Argument 1', required: true },
    { name: 'arg2', description: 'Argument 2', required: false },
  ],
})
myPrompt(
  @McpPromptArg('arg1') arg1: string,
  @McpPromptArg('arg2') arg2?: string
) {
  return {
    messages: [{ role: 'user', content: { type: 'text', text: `...` } }],
  };
}
```

## Parameter Decorators

| Decorator             | Use Case               |
| --------------------- | ---------------------- |
| `@McpInput()`         | Tool input object      |
| `@McpParam(name)`     | Resource URI parameter |
| `@McpPromptArg(name)` | Prompt argument        |

## Runtime Server

### createMcpServer

Creates and starts an MCP server from a decorated class.

```typescript
import { createMcpServer } from '@mcp-weave/nestjs';

// Starts server on stdio transport
await createMcpServer(MyServer);
```

### McpRuntimeServer

For more control, use the class directly:

```typescript
import { McpRuntimeServer } from '@mcp-weave/nestjs';

const server = new McpRuntimeServer(MyServer, {
  transport: 'stdio',
});

await server.start();
```

## Metadata Extraction

Extract metadata from decorated classes for code generation:

```typescript
import { extractMetadata, getServerMetadata, getToolsMetadata } from '@mcp-weave/nestjs';

const metadata = extractMetadata(MyServer);
console.log(metadata.server);
console.log(metadata.tools);
console.log(metadata.resources);
console.log(metadata.prompts);
```

## Requirements

- Node.js >= 18
- TypeScript >= 5.0
- `reflect-metadata` package

## Related Packages

- [`@mcp-weave/core`](https://www.npmjs.com/package/@mcp-weave/core) - Core types and utilities
- [`@mcp-weave/testing`](https://www.npmjs.com/package/@mcp-weave/testing) - Testing utilities
- [`@mcp-weave/cli`](https://www.npmjs.com/package/@mcp-weave/cli) - Command-line interface

## License

MIT
