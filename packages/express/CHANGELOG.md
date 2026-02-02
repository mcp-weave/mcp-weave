# @mcp-weave/express

## 0.3.0

### Minor Changes

- d7ee2ee: feat(auth): Add API key authentication support

  Adds comprehensive API key authentication to secure MCP server endpoints:
  - **API Key Validation**: Supports `x-api-key` header, Bearer token, and query parameter
  - **Request Tracking**: Automatic request ID generation for traceability
  - **Key Management**: Per-key metadata with name, scopes, and expiration
  - **Callbacks**: Customizable `onAuthSuccess`, `onAuthFailure`, and `customAuth` handlers
  - **Utilities**: `generateApiKey()` for creating secure prefixed API keys

  Usage:

  ```typescript
  import { McpRuntimeServer, generateApiKey } from '@mcp-weave/nestjs';

  const apiKey = generateApiKey('myapp'); // myapp_xxxxx...

  const server = new McpRuntimeServer(MyServer, {
    transport: 'sse',
    port: 3000,
    auth: {
      enabled: true,
      apiKeys: [{ key: apiKey, name: 'Production', scopes: ['read', 'write'] }],
    },
  });
  ```

### Patch Changes

- Updated dependencies [d7ee2ee]
  - @mcp-weave/nestjs@0.3.0

## 0.2.0

### Minor Changes

- a277e30: Add @mcp-weave/express package and hot reload support

  ## @mcp-weave/express (new package)
  - Express middleware for MCP servers
  - `createMcpMiddleware()` for integrating into existing apps
  - `McpExpressServer` for standalone MCP HTTP servers
  - `createMcpRouter()` for Express Router integration
  - CORS support enabled by default
  - REST API endpoints for tools, resources, and prompts

  ## @mcp-weave/cli
  - Add `--watch` flag to `mcp-weave start` for hot reload
  - Add `--port` option for SSE transport configuration

### Patch Changes

- Updated dependencies [fb04d98]
  - @mcp-weave/nestjs@0.2.0
