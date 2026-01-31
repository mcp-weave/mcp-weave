# MCP-Weave - Project Context

## Overview
MCP-Weave is an open-source library that works like "Swagger for MCP" (Model Context Protocol). It allows developers to transform existing code into MCP servers using simple annotations/decorators.

**Repository:** https://github.com/mcp-weave/mcp-weave  
**License:** MIT  
**Tagline:** "Weave your code into MCP servers - seamlessly"

## Core Concept

Transform annotated code into MCP servers:
```typescript
@McpServer({ name: 'user-service' })
export class UserController {
  @McpTool({ name: 'create_user', description: 'Creates a new user' })
  async createUser(@McpInput() input: CreateUserDto) {
    return this.userService.create(input);
  }
}
```

## Architecture

### Two Main Flows

**Code-First:**
```
Annotated Code → Scanner → Metadata → Generator → MCP Server
```

**Spec-First:**
```
mcp-spec.yaml → Parser → Validator → Generator → Boilerplate Code
```

## Packages

### @mcp-weave/core
Core functionality:
- Parse and validate mcp-spec.yaml
- Scan decorators and extract metadata
- Generate code from specs
- Template engine

### @mcp-weave/cli
Command line interface:
- `generate` - Generate MCP server from spec
- `extract` - Extract spec from annotated code
- `start` - Start MCP server
- `export` - Export spec in different formats
- `scaffold` - Scaffold new project

### @mcp-weave/nestjs
NestJS integration:
- Decorators: `@McpServer`, `@McpTool`, `@McpResource`, `@McpPrompt`
- Parameter decorators: `@McpInput`, `@McpParam`, `@McpPromptArg`
- Runtime MCP server
- Auto-discovery of controllers
- Integration with NestJS DI

### @mcp-weave/testing
Testing utilities:
- Mock MCP server
- Test assertions
- Mock transport

## Spec Format (mcp-spec.yaml)
```yaml
version: "1.0"

server:
  name: "user-management"
  version: "1.0.0"
  description: "User management service"
  
tools:
  - name: create_user
    description: "Creates a new user"
    inputSchema:
      type: object
      properties:
        name: { type: string }
        email: { type: string, format: email }
      required: [name, email]
    handler: "/handlers/user/create"
    
resources:
  - uri: "user://{userId}"
    name: "User Profile"
    mimeType: "application/json"
    handler: "/handlers/user/get"

prompts:
  - name: "welcome_email"
    description: "Generate welcome email"
    arguments:
      - name: userName
        required: true
    handler: "/handlers/prompts/welcome"

transport:
  - type: stdio
  - type: sse
    endpoint: "/mcp/sse"
```

## Decorators API

### @McpServer(options)
Marks a class as an MCP server.
```typescript
@McpServer({
  name: string;
  version?: string;
  description?: string;
})
```

### @McpTool(options)
Marks a method as an MCP tool.
```typescript
@McpTool({
  name: string;
  description: string;
  inputSchema?: object;
})
```

### @McpResource(options)
Marks a method as an MCP resource.
```typescript
@McpResource({
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
})
```

### @McpPrompt(options)
Marks a method as an MCP prompt.
```typescript
@McpPrompt({
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
})
```

### Parameter Decorators
- `@McpInput()` - Tool input
- `@McpParam(name)` - URI parameter
- `@McpPromptArg(name)` - Prompt argument

## Project Structure
```
mcp-weave/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── spec/         # YAML parser, validator
│   │   │   ├── generator/    # Code generator
│   │   │   ├── scanner/      # Metadata scanner
│   │   │   └── index.ts
│   │   └── package.json
│   ├── cli/
│   │   ├── src/
│   │   │   ├── commands/     # CLI commands
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   ├── bin/
│   │   │   └── mcp-weave.js
│   │   └── package.json
│   ├── nestjs/
│   │   ├── src/
│   │   │   ├── decorators/   # All decorators
│   │   │   ├── runtime/      # MCP server runtime
│   │   │   ├── metadata/     # Metadata storage
│   │   │   └── index.ts
│   │   └── package.json
│   └── testing/
│       └── package.json
├── examples/
│   ├── nestjs-basic/
│   └── nestjs-advanced/
├── docs/
├── .github/workflows/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

## Tech Stack

- **Language:** TypeScript
- **Build:** Turbo (monorepo)
- **Package Manager:** pnpm
- **Testing:** Vitest
- **Linting:** ESLint + Prettier
- **Versioning:** Changesets
- **CI/CD:** GitHub Actions

## Roadmap

### v0.1.0 - MVP
- Core spec parser and validator
- NestJS decorators (@McpServer, @McpTool, @McpResource)
- CLI with `generate` and `start` commands
- Stdio transport
- Basic example
- Initial documentation

### v0.2.0
- Express support
- SSE transport
- Testing utilities
- `extract` command
- Hot reload

### v0.3.0+
- Python/FastAPI support
- WebSocket transport
- Web UI for testing
- Go/Gin support

## CLI Commands (Planned)
```bash
# Generate server from spec
mcp-weave generate --spec mcp-spec.yaml --output ./server

# Extract spec from code
mcp-weave extract --source ./src --output mcp-spec.yaml

# Start MCP server
mcp-weave start --transport stdio

# Export spec
mcp-weave export --format yaml --output spec.yaml

# Scaffold new project
mcp-weave init --name my-service --framework nestjs
```

## Example Usage
```typescript
import { 
  McpServer, 
  McpTool, 
  McpResource, 
  McpPrompt,
  McpInput, 
  McpParam,
  McpPromptArg 
} from '@mcp-weave/nestjs';

@McpServer({ 
  name: 'user-service',
  version: '1.0.0',
  description: 'User management service'
})
export class UserController {
  
  @McpTool({
    name: 'create_user',
    description: 'Creates a new user in the system'
  })
  async createUser(@McpInput() input: CreateUserDto) {
    const user = await this.userService.create(input);
    return { 
      success: true, 
      userId: user.id 
    };
  }
  
  @McpResource({
    uri: 'user://{userId}',
    name: 'User Profile',
    description: 'Get user profile data',
    mimeType: 'application/json'
  })
  async getUserProfile(@McpParam('userId') userId: string) {
    const user = await this.userService.findById(userId);
    return {
      contents: [{
        uri: `user://${userId}`,
        mimeType: 'application/json',
        text: JSON.stringify(user)
      }]
    };
  }
  
  @McpPrompt({
    name: 'welcome_email',
    description: 'Generate welcome email for new user'
  })
  async generateWelcomeEmail(
    @McpPromptArg('userName') userName: string,
    @McpPromptArg('userEmail') userEmail: string
  ) {
    return {
      messages: [{
        role: 'user',
        content: `Generate a welcome email for ${userName} (${userEmail})`
      }]
    };
  }
}
```

## Key Design Decisions

### Why Decorators?
- Familiar to NestJS developers
- Non-invasive - doesn't change existing logic
- Type-safe with TypeScript
- Self-documenting

### Why YAML for Spec?
- More readable than JSON
- Standard in similar tools (OpenAPI)
- Easy to version control
- Supports comments

### Why Monorepo?
- Coordinated development
- Code reuse
- Synchronized versioning
- Better DX

## Development Setup
```bash
# Clone repo
git clone git@github.com:mcp-weave/mcp-weave.git
cd mcp-weave

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Format
pnpm format
```

## Links

- **MCP Specification:** https://spec.modelcontextprotocol.io/
- **Anthropic MCP:** https://www.anthropic.com/news/model-context-protocol
- **Repository:** https://github.com/mcp-weave/mcp-weave