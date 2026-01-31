# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP-Weave is a TypeScript monorepo that provides "Swagger for Model Context Protocol" - transforms code into MCP servers using decorators. It supports two development flows:

- **Code-first**: Write decorated classes → extract to mcp-spec.yaml
- **Spec-first**: Write mcp-spec.yaml → generate boilerplate code

## Commands

```bash
# Install dependencies (uses pnpm workspaces)
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage

# Run a single package's tests
pnpm --filter @mcp-weave/core test
pnpm --filter @mcp-weave/cli test

# Lint and format
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check

# Type checking
pnpm typecheck

# Clean build artifacts
pnpm clean

# Development (watch mode for all packages)
pnpm dev
```

## Monorepo Structure

| Package              | Purpose                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| `@mcp-weave/core`    | Spec parsing (YAML), validation (Zod), metadata scanning, code generation              |
| `@mcp-weave/cli`     | CLI commands: `init`, `generate`, `start`, `extract`                                   |
| `@mcp-weave/nestjs`  | NestJS decorators (`@McpServer`, `@McpTool`, `@McpResource`, `@McpPrompt`) and runtime |
| `@mcp-weave/testing` | Mock server, mock transport, test assertions                                           |

## Architecture

### Core Flow

```
Decorators (@McpTool, etc.)
    ↓ scanner/metadata.ts
Metadata (reflect-metadata)
    ↓ spec/types.ts (Zod schemas)
mcp-spec.yaml
    ↓ generator/server.ts
MCP Server Code
```

### Key Files by Package

**core:**

- `src/spec/types.ts` - Zod schemas defining McpSpec structure
- `src/spec/parser.ts` - YAML parse/stringify utilities
- `src/scanner/metadata.ts` - Extract decorator metadata from classes
- `src/generator/server.ts` - Generate server code from spec

**nestjs:**

- `src/decorators/*.ts` - All decorator implementations
- `src/metadata/storage.ts` - Reflect metadata storage/retrieval
- `src/runtime/server.ts` - Runtime MCP server

**cli:**

- `src/commands/*.ts` - Each CLI command implementation

## Code Conventions

- TypeScript strict mode with all strict options enabled
- ESM modules (NodeNext resolution)
- Decorators require `experimentalDecorators` and `emitDecoratorMetadata`
- Unused variables must be prefixed with `_` (e.g., `_unusedParam`)
- Import order: builtin → external → internal → parent/sibling → index
- Uses tsup for dual CJS/ESM builds
- Each package outputs to `dist/` with declaration files

## Dependencies

- **reflect-metadata**: Required for decorator metadata storage
- **zod**: Schema validation for spec files
- **yaml**: YAML parsing/stringifying
- **commander**: CLI framework
- **@modelcontextprotocol/sdk**: Official MCP SDK (in nestjs package)

## Versioning

Uses Changesets for version management:

```bash
pnpm changeset          # Create a changeset
pnpm version-packages   # Apply changesets to versions
pnpm release            # Build and publish
```
