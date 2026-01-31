# @mcp-weave/core

Core functionality for MCP-Weave - the TypeScript framework for building Model Context Protocol (MCP) servers.

## Installation

```bash
npm install @mcp-weave/core
# or
pnpm add @mcp-weave/core
```

## Features

- **Spec Types** - TypeScript types and Zod schemas for MCP specifications
- **Parser** - Parse MCP spec files (YAML/JSON)
- **Validator** - Validate MCP specifications
- **Scanner** - Extract metadata from decorated classes
- **Generator** - Generate MCP server code from specs

## Usage

### Spec Types

```typescript
import type { McpSpec, ToolDefinition, ResourceDefinition } from '@mcp-weave/core';

const spec: McpSpec = {
  version: '1.0',
  server: {
    name: 'my-server',
    version: '1.0.0',
  },
  tools: [
    {
      name: 'hello',
      description: 'Says hello',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    },
  ],
};
```

### Parser

```typescript
import { parseSpec, parseSpecFromFile } from '@mcp-weave/core';

// Parse from string
const spec = parseSpec(`
version: "1.0"
server:
  name: my-server
  version: "1.0.0"
tools:
  - name: hello
    description: Says hello
`);

// Parse from file
const specFromFile = await parseSpecFromFile('./mcp.yaml');
```

### Validator

```typescript
import { validateSpec, ValidationError } from '@mcp-weave/core';

try {
  validateSpec(spec);
  console.log('Spec is valid!');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation errors:', error.errors);
  }
}
```

### Scanner (Metadata Extraction)

```typescript
import { extractMetadata, METADATA_KEYS } from '@mcp-weave/core';

// Extract metadata from a decorated class
const metadata = extractMetadata(MyDecoratedClass);

console.log(metadata.server); // Server metadata
console.log(metadata.tools); // Tool definitions
console.log(metadata.resources); // Resource definitions
console.log(metadata.prompts); // Prompt definitions
```

### Generator

```typescript
import { generateServerCode } from '@mcp-weave/core';

const code = generateServerCode(spec, {
  language: 'typescript',
  framework: 'standalone',
});

console.log(code);
```

## API Reference

### Types

| Type                 | Description                          |
| -------------------- | ------------------------------------ |
| `McpSpec`            | Complete MCP specification           |
| `ToolDefinition`     | Tool definition with input schema    |
| `ResourceDefinition` | Resource definition with URI pattern |
| `PromptDefinition`   | Prompt definition with arguments     |
| `ServerConfig`       | Server configuration                 |
| `TransportConfig`    | Transport configuration              |

### Functions

| Function             | Description                           |
| -------------------- | ------------------------------------- |
| `parseSpec`          | Parse spec from YAML/JSON string      |
| `parseSpecFromFile`  | Parse spec from file path             |
| `validateSpec`       | Validate an MCP spec                  |
| `extractMetadata`    | Extract metadata from decorated class |
| `metadataToSpec`     | Convert metadata to MCP spec          |
| `generateServerCode` | Generate server code from spec        |

## Requirements

- Node.js >= 18
- TypeScript >= 5.0 (for TypeScript users)

## Related Packages

- [`@mcp-weave/nestjs`](https://www.npmjs.com/package/@mcp-weave/nestjs) - NestJS-style decorators
- [`@mcp-weave/testing`](https://www.npmjs.com/package/@mcp-weave/testing) - Testing utilities
- [`@mcp-weave/cli`](https://www.npmjs.com/package/@mcp-weave/cli) - Command-line interface

## License

MIT
