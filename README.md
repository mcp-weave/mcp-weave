<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-weave/mcp-weave/main/assets/logo.png" alt="MCP-Weave Logo" width="200"/>
</p>

<h1 align="center">MCP-Weave</h1>

<p align="center">
  <strong>Weave your code into MCP servers - seamlessly</strong><br/>
  Like Swagger for <a href="https://spec.modelcontextprotocol.io/">Model Context Protocol</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@mcp-weave/core"><img src="https://img.shields.io/npm/v/@mcp-weave/core.svg?style=flat-square" alt="npm version"></a>
  <a href="https://github.com/mcp-weave/mcp-weave/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license"></a>
  <a href="https://github.com/mcp-weave/mcp-weave/actions"><img src="https://img.shields.io/github/actions/workflow/status/mcp-weave/mcp-weave/ci.yml?style=flat-square" alt="build status"></a>
  <a href="https://discord.gg/mcp-weave"><img src="https://img.shields.io/discord/1234567890?style=flat-square&logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-packages">Packages</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-examples">Examples</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## ✨ Features

- 🎯 **Simple Decorators** - Transform any class into an MCP server with intuitive annotations
- 🔄 **Two-Way Flow** - Code-first or Spec-first development approach
- 📝 **YAML Spec** - Define your MCP server in a readable `mcp-spec.yaml` file
- 🚀 **Multiple Frameworks** - NestJS support (Express, FastAPI coming soon)
- 🛠️ **Powerful CLI** - Generate, extract, and manage your MCP servers
- 🧪 **Testing Utilities** - Mock servers and assertions for easy testing
- 📦 **TypeScript First** - Full type safety and excellent DX

## 🚀 Quick Start

### Installation

```bash
# Using pnpm (recommended)
pnpm add @mcp-weave/nestjs

# Using npm
npm install @mcp-weave/nestjs

# Using yarn
yarn add @mcp-weave/nestjs
```

### Basic Usage

Transform your existing code into an MCP server with simple decorators:

```typescript
import {
  McpServer,
  McpTool,
  McpResource,
  McpPrompt,
  McpInput,
  McpParam,
  McpPromptArg,
} from '@mcp-weave/nestjs';

@McpServer({
  name: 'user-service',
  version: '1.0.0',
  description: 'User management service',
})
export class UserController {
  @McpTool({
    name: 'create_user',
    description: 'Creates a new user in the system',
  })
  async createUser(@McpInput() input: CreateUserDto) {
    const user = await this.userService.create(input);
    return { success: true, userId: user.id };
  }

  @McpResource({
    uri: 'user://{userId}',
    name: 'User Profile',
    mimeType: 'application/json',
  })
  async getUserProfile(@McpParam('userId') userId: string) {
    const user = await this.userService.findById(userId);
    return {
      contents: [
        {
          uri: `user://${userId}`,
          mimeType: 'application/json',
          text: JSON.stringify(user),
        },
      ],
    };
  }

  @McpPrompt({
    name: 'welcome_email',
    description: 'Generate welcome email for new user',
  })
  async generateWelcomeEmail(
    @McpPromptArg('userName') userName: string,
    @McpPromptArg('userEmail') userEmail: string
  ) {
    return {
      messages: [
        {
          role: 'user',
          content: `Generate a welcome email for ${userName} (${userEmail})`,
        },
      ],
    };
  }
}
```

## 📦 Packages

| Package                                    | Description                                       | Version                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [`@mcp-weave/core`](./packages/core)       | Core functionality - parser, validator, generator | [![npm](https://img.shields.io/npm/v/@mcp-weave/core.svg?style=flat-square)](https://www.npmjs.com/package/@mcp-weave/core)       |
| [`@mcp-weave/cli`](./packages/cli)         | Command-line interface                            | [![npm](https://img.shields.io/npm/v/@mcp-weave/cli.svg?style=flat-square)](https://www.npmjs.com/package/@mcp-weave/cli)         |
| [`@mcp-weave/nestjs`](./packages/nestjs)   | NestJS integration with decorators                | [![npm](https://img.shields.io/npm/v/@mcp-weave/nestjs.svg?style=flat-square)](https://www.npmjs.com/package/@mcp-weave/nestjs)   |
| [`@mcp-weave/testing`](./packages/testing) | Testing utilities and mocks                       | [![npm](https://img.shields.io/npm/v/@mcp-weave/testing.svg?style=flat-square)](https://www.npmjs.com/package/@mcp-weave/testing) |

## 🔄 Two Development Flows

### Code-First

Start with decorated code, extract the spec:

```
Annotated Code → Scanner → Metadata → Generator → MCP Server
```

```bash
# Extract spec from your code
mcp-weave extract --source ./src --output mcp-spec.yaml
```

### Spec-First

Start with a YAML spec, generate boilerplate:

```
mcp-spec.yaml → Parser → Validator → Generator → Boilerplate Code
```

```bash
# Generate server from spec
mcp-weave generate --spec mcp-spec.yaml --output ./server
```

## 📝 Spec Format

Define your MCP server in `mcp-spec.yaml`:

```yaml
version: '1.0'

server:
  name: 'user-management'
  version: '1.0.0'
  description: 'User management service'

tools:
  - name: create_user
    description: 'Creates a new user'
    inputSchema:
      type: object
      properties:
        name: { type: string }
        email: { type: string, format: email }
      required: [name, email]
    handler: '/handlers/user/create'

resources:
  - uri: 'user://{userId}'
    name: 'User Profile'
    mimeType: 'application/json'
    handler: '/handlers/user/get'

prompts:
  - name: 'welcome_email'
    description: 'Generate welcome email'
    arguments:
      - name: userName
        required: true
    handler: '/handlers/prompts/welcome'

transport:
  - type: stdio
  - type: sse
    endpoint: '/mcp/sse'
```

## 🛠️ CLI Commands

```bash
# Initialize a new project
mcp-weave init --name my-service --framework nestjs

# Generate server from spec
mcp-weave generate --spec mcp-spec.yaml --output ./server

# Extract spec from annotated code
mcp-weave extract --source ./src --output mcp-spec.yaml

# Start MCP server
mcp-weave start --transport stdio

# Export spec in different formats
mcp-weave export --format yaml --output spec.yaml
```

## 🎨 Decorators API

### Class Decorators

| Decorator             | Description                    |
| --------------------- | ------------------------------ |
| `@McpServer(options)` | Marks a class as an MCP server |

### Method Decorators

| Decorator               | Description                       |
| ----------------------- | --------------------------------- |
| `@McpTool(options)`     | Marks a method as an MCP tool     |
| `@McpResource(options)` | Marks a method as an MCP resource |
| `@McpPrompt(options)`   | Marks a method as an MCP prompt   |

### Parameter Decorators

| Decorator             | Description             |
| --------------------- | ----------------------- |
| `@McpInput()`         | Injects tool input      |
| `@McpParam(name)`     | Injects URI parameter   |
| `@McpPromptArg(name)` | Injects prompt argument |

## 📚 Documentation

- [Getting Started Guide](./docs/getting-started.md)
- [API Reference](./docs/api-reference.md)
- [Spec Format Reference](./docs/spec-format.md)
- [NestJS Integration](./docs/nestjs-integration.md)
- [CLI Reference](./docs/cli-reference.md)
- [Examples](./examples)

## 🧪 Testing

```typescript
import { McpTestServer, mockTransport } from '@mcp-weave/testing';

describe('UserController', () => {
  let server: McpTestServer;

  beforeEach(() => {
    server = new McpTestServer(UserController);
  });

  it('should create a user', async () => {
    const result = await server.callTool('create_user', {
      name: 'John Doe',
      email: 'john@example.com',
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBeDefined();
  });
});
```

## � Examples

| Example | Description |
|---------|-------------|
| [calculator](./examples/calculator) | Basic calculator with arithmetic tools |
| [user-service](./examples/user-service) | Full CRUD service with tools, resources, and prompts |

```bash
# Run the calculator example
cd examples/calculator
pnpm install && pnpm build && pnpm start

# Run the user-service example
cd examples/user-service
pnpm install && pnpm build && pnpm start
```

## 🗺️ Roadmap

### v0.1.0 - MVP ✨

- [x] Core spec parser and validator
- [x] NestJS decorators (`@McpServer`, `@McpTool`, `@McpResource`, `@McpPrompt`)
- [x] CLI with `generate`, `init`, `start`, `extract` commands
- [x] Stdio transport
- [x] 152 unit tests passing
- [x] CI/CD with GitHub Actions
- [x] Examples (calculator, user-service)
- [x] Testing utilities package

### v0.2.0

- [ ] Express support (`@mcp-weave/express`)
- [ ] SSE transport
- [ ] Enhanced testing utilities
- [ ] Hot reload (`mcp-weave start --watch`)

### v0.3.0+

- [ ] Python/FastAPI support
- [ ] WebSocket transport
- [ ] Web UI for testing
- [ ] Go/Gin support

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

```bash
# Clone the repo
git clone https://github.com/mcp-weave/mcp-weave.git
cd mcp-weave

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format
```

## 📄 License

[MIT](./LICENSE) © 2026 MCP-Weave

## 🔗 Links

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Anthropic MCP Announcement](https://www.anthropic.com/news/model-context-protocol)
- [Discord Community](https://discord.gg/mcp-weave)
- [GitHub Discussions](https://github.com/mcp-weave/mcp-weave/discussions)

---

<p align="center">
  Made with ❤️ by the MCP-Weave community
</p>
