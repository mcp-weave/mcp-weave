# @mcp-weave/express

Express middleware and server for MCP (Model Context Protocol) servers.

## Installation

```bash
npm install @mcp-weave/express express
# or
pnpm add @mcp-weave/express express
```

## Features

- **Middleware** - Integrate MCP servers into existing Express apps
- **Standalone Server** - Quick setup for MCP-only servers
- **Router** - Mount MCP endpoints on any path
- **CORS Support** - Built-in CORS handling
- **REST API** - HTTP endpoints for tools, resources, and prompts

## Quick Start

### Standalone Server

```typescript
import 'reflect-metadata';
import { McpExpressServer, McpServer, McpTool, McpInput } from '@mcp-weave/express';

@McpServer({ name: 'my-server', version: '1.0.0' })
class MyServer {
  @McpTool({
    name: 'greet',
    description: 'Greets a user',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  })
  greet(@McpInput() input: { name: string }) {
    return `Hello, ${input.name}!`;
  }
}

const server = new McpExpressServer(MyServer, { port: 3000 });
await server.start();
// Server running at http://localhost:3000/mcp
```

### Middleware Integration

```typescript
import express from 'express';
import { createMcpMiddleware, McpServer, McpTool } from '@mcp-weave/express';

@McpServer({ name: 'my-server', version: '1.0.0' })
class MyServer {
  @McpTool({ name: 'hello', description: 'Say hello' })
  hello() {
    return 'Hello!';
  }
}

const app = express();
app.use(express.json());
app.use('/mcp', createMcpMiddleware(MyServer));

// Your other routes
app.get('/', (req, res) => res.send('Welcome!'));

app.listen(3000);
```

### Router

```typescript
import express from 'express';
import { createMcpRouter, McpServer, McpTool } from '@mcp-weave/express';

@McpServer({ name: 'my-server', version: '1.0.0' })
class MyServer {
  @McpTool({ name: 'hello', description: 'Say hello' })
  hello() {
    return 'Hello!';
  }
}

const app = express();
app.use(express.json());
app.use('/api/v1/mcp', createMcpRouter(MyServer));
app.listen(3000);
```

## API Endpoints

Once mounted, the following endpoints are available:

| Method | Endpoint          | Description                    |
| ------ | ----------------- | ------------------------------ |
| GET    | `/health`         | Server health and capabilities |
| GET    | `/tools`          | List available tools           |
| POST   | `/tools/call`     | Call a tool                    |
| GET    | `/resources`      | List available resources       |
| POST   | `/resources/read` | Read a resource                |
| GET    | `/prompts`        | List available prompts         |
| POST   | `/prompts/get`    | Get a prompt                   |

### Example Requests

**Call a tool:**

```bash
curl -X POST http://localhost:3000/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "greet", "arguments": {"name": "World"}}'
```

**Read a resource:**

```bash
curl -X POST http://localhost:3000/mcp/resources/read \
  -H "Content-Type: application/json" \
  -d '{"uri": "config://settings"}'
```

**Get a prompt:**

```bash
curl -X POST http://localhost:3000/mcp/prompts/get \
  -H "Content-Type: application/json" \
  -d '{"name": "welcome", "arguments": {"username": "Alice"}}'
```

## Options

### McpMiddlewareOptions

| Option       | Type      | Default  | Description                 |
| ------------ | --------- | -------- | --------------------------- |
| `basePath`   | `string`  | `'/mcp'` | Base path for MCP endpoints |
| `cors`       | `boolean` | `true`   | Enable CORS headers         |
| `corsOrigin` | `string`  | `'*'`    | CORS origin header          |

### McpExpressOptions

Extends `McpMiddlewareOptions` with:

| Option | Type      | Default     | Description        |
| ------ | --------- | ----------- | ------------------ |
| `port` | `number`  | `3000`      | Server port        |
| `host` | `string`  | `'0.0.0.0'` | Server host        |
| `app`  | `Express` | -           | Custom Express app |

## Related Packages

- [`@mcp-weave/nestjs`](https://www.npmjs.com/package/@mcp-weave/nestjs) - NestJS-style decorators
- [`@mcp-weave/testing`](https://www.npmjs.com/package/@mcp-weave/testing) - Testing utilities
- [`@mcp-weave/cli`](https://www.npmjs.com/package/@mcp-weave/cli) - CLI tools

## License

MIT
