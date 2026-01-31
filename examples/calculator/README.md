# Calculator MCP Server Example

A simple calculator that demonstrates all MCP-Weave decorator features.

## Features

### Tools

- `add` - Add two numbers
- `subtract` - Subtract second number from first
- `multiply` - Multiply two numbers
- `divide` - Divide first number by second

### Resources

- `calculator://history` - View calculation history
- `calculator://history/{index}` - View specific calculation

### Prompts

- `solve_equation` - Generate prompt to solve an equation
- `explain_calculation` - Generate prompt to explain a calculation

## Setup

```bash
# From the monorepo root
pnpm install

# Build all packages
pnpm build

# Navigate to example
cd examples/calculator

# Build the example
pnpm build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "calculator": {
      "command": "node",
      "args": ["/path/to/mcp-weave/examples/calculator/dist/server.js"]
    }
  }
}
```

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/server.js
```

## Code Overview

```typescript
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
  name: 'calculator',
  version: '1.0.0',
  description: 'A simple calculator MCP server',
})
class CalculatorServer {
  @McpTool({
    name: 'add',
    description: 'Add two numbers together',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['a', 'b'],
    },
  })
  add(@McpInput() input: { a: number; b: number }) {
    return { result: input.a + input.b };
  }
}

createMcpServer(CalculatorServer);
```
