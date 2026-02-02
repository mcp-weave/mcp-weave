# @mcp-weave/webui

Web UI dashboard for testing MCP servers interactively.

## Installation

```bash
pnpm add @mcp-weave/webui
```

## Usage

### Quick Start

```typescript
import { McpServer, McpTool } from '@mcp-weave/nestjs';
import { McpWebUI } from '@mcp-weave/webui';

@McpServer({ name: 'my-server', version: '1.0.0' })
class MyServer {
  @McpTool({ name: 'add', description: 'Add two numbers' })
  add(input: { a: number; b: number }) {
    return { result: input.a + input.b };
  }
}

// Start the Web UI
const webui = new McpWebUI(MyServer, {
  port: 3000,
  title: 'My MCP Server Dashboard',
});

await webui.start();
// Dashboard available at http://localhost:3000
```

### Features

- **Interactive Tool Testing**: Call tools with custom inputs and see results
- **Resource Browser**: Browse and read resources
- **Prompt Tester**: Test prompts with different arguments
- **Real-time Logs**: View server logs and messages
- **JSON Editor**: Edit complex inputs with syntax highlighting
- **Schema Validation**: Automatic validation based on tool schemas

### CLI Usage

```bash
# Start dashboard for your server
mcp-weave webui --port 3000

# With custom title
mcp-weave webui --port 3000 --title "My Dashboard"
```

### Dashboard Components

1. **Server Info Panel**: Shows server name, version, and capabilities
2. **Tools Panel**: List all tools with input forms
3. **Resources Panel**: Browse and read resources
4. **Prompts Panel**: Test prompts with argument inputs
5. **History Panel**: View call history and responses
6. **Logs Panel**: Real-time server logs

## API Reference

### McpWebUI

```typescript
interface McpWebUIOptions {
  port?: number;         // Default: 3000
  host?: string;         // Default: 'localhost'
  title?: string;        // Dashboard title
  theme?: 'light' | 'dark';  // UI theme
  enableLogs?: boolean;  // Show server logs
}

class McpWebUI {
  constructor(serverClass: any, options?: McpWebUIOptions);
  
  start(): Promise<void>;
  stop(): Promise<void>;
  
  getUrl(): string;
}
```

### Events

```typescript
webui.on('tool:call', (toolName, input) => { ... });
webui.on('tool:result', (toolName, result) => { ... });
webui.on('resource:read', (uri) => { ... });
webui.on('prompt:get', (name, args) => { ... });
```

## License

MIT
