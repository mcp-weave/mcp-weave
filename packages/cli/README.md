# @mcp-weave/cli

Command-line interface for MCP-Weave - initialize, generate, and manage MCP servers.

## Installation

```bash
# Global installation (recommended)
npm install -g @mcp-weave/cli

# Or with pnpm
pnpm add -g @mcp-weave/cli

# Or use with npx
npx @mcp-weave/cli <command>
```

## Quick Start

```bash
# Create a new MCP project
mcp-weave init --name my-server

# Navigate to project
cd my-server

# Install dependencies
npm install

# Generate server code from spec
mcp-weave generate

# Start the server
mcp-weave start
```

## Commands

### `mcp-weave init`

Initialize a new MCP-Weave project with boilerplate code.

```bash
mcp-weave init [options]
```

**Options:**

| Option                   | Description                        | Default         |
| ------------------------ | ---------------------------------- | --------------- |
| `-n, --name <name>`      | Project name                       | `my-mcp-server` |
| `-f, --framework <type>` | Framework (`nestjs`, `standalone`) | `standalone`    |
| `-d, --dir <directory>`  | Output directory                   | Project name    |

**Examples:**

```bash
# Create standalone project
mcp-weave init --name my-server

# Create NestJS project
mcp-weave init --name my-server --framework nestjs

# Create in specific directory
mcp-weave init --name my-server --dir ./projects/mcp
```

**Generated structure (standalone):**

```
my-server/
├── package.json
├── tsconfig.json
├── mcp-spec.yaml
└── src/
```

**Generated structure (NestJS):**

```
my-server/
├── package.json
├── mcp-spec.yaml
└── src/
    └── app.controller.ts
```

### `mcp-weave generate`

Generate MCP server code from a spec file.

```bash
mcp-weave generate [options]
```

**Options:**

| Option                   | Description       | Default         |
| ------------------------ | ----------------- | --------------- |
| `-s, --spec <path>`      | Path to spec file | `mcp-spec.yaml` |
| `-o, --output <dir>`     | Output directory  | `./generated`   |
| `-f, --framework <type>` | Target framework  | `standalone`    |

**Examples:**

```bash
# Generate from default spec
mcp-weave generate

# Generate from custom spec file
mcp-weave generate --spec ./config/server.yaml

# Generate to custom directory
mcp-weave generate --output ./src/generated
```

### `mcp-weave extract`

Extract MCP spec from decorated TypeScript code.

```bash
mcp-weave extract [options]
```

**Options:**

| Option                | Description      | Default         |
| --------------------- | ---------------- | --------------- |
| `-s, --source <path>` | Source directory | `./src`         |
| `-o, --output <path>` | Output spec file | `mcp-spec.yaml` |

**Example:**

```bash
# Extract spec from source code
mcp-weave extract --source ./src --output mcp-spec.yaml
```

> **Note:** Full decorator extraction coming in v0.2.0

### `mcp-weave start`

Start the MCP server.

```bash
mcp-weave start [options]
```

**Options:**

| Option                   | Description                | Default         |
| ------------------------ | -------------------------- | --------------- |
| `-s, --spec <path>`      | Path to spec file          | `mcp-spec.yaml` |
| `-t, --transport <type>` | Transport (`stdio`, `sse`) | `stdio`         |

**Example:**

```bash
# Start with default config
mcp-weave start

# Start with custom spec
mcp-weave start --spec ./config/server.yaml

# Start with SSE transport
mcp-weave start --transport sse
```

## Spec File Format

MCP-Weave uses YAML spec files to define servers:

```yaml
version: '1.0'

server:
  name: 'my-server'
  version: '1.0.0'
  description: 'My MCP server'

tools:
  - name: greet
    description: 'Greet a user'
    inputSchema:
      type: object
      properties:
        name:
          type: string
          description: 'Name to greet'
      required: [name]

resources:
  - uri: 'config://settings'
    name: 'Settings'
    description: 'Application settings'
    mimeType: 'application/json'

prompts:
  - name: welcome
    description: 'Welcome message'
    arguments:
      - name: username
        required: true

transport:
  - type: stdio
```

## Workflow

### Spec-First Development

1. Define your server in `mcp-spec.yaml`
2. Generate code with `mcp-weave generate`
3. Implement tool/resource/prompt logic
4. Run the server

### Code-First Development

1. Write decorated TypeScript code
2. Extract spec with `mcp-weave extract`
3. Use spec for documentation or validation

## Requirements

- Node.js >= 18
- npm, pnpm, or yarn

## Related Packages

- [`@mcp-weave/core`](https://www.npmjs.com/package/@mcp-weave/core) - Core types and utilities
- [`@mcp-weave/nestjs`](https://www.npmjs.com/package/@mcp-weave/nestjs) - NestJS-style decorators
- [`@mcp-weave/testing`](https://www.npmjs.com/package/@mcp-weave/testing) - Testing utilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT
