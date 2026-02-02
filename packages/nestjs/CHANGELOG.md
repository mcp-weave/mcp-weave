# @mcp-weave/nestjs

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

## 0.2.0

### Minor Changes

- fb04d98: Add SSE (Server-Sent Events) transport support
  - New `startSSE()` method on `McpRuntimeServer` for HTTP-based MCP servers
  - Support `transport: 'sse'` option in server configuration
  - CORS enabled by default for cross-origin requests
  - Health check endpoint at `/health`
  - Session management for multiple concurrent clients
  - Automatic cleanup on connection close

## 0.1.1

### Patch Changes

- 2f96fd6: Add McpTestClient for easy testing of decorated MCP servers
  - New `McpTestClient` class to test decorated classes directly
  - Methods: `callTool()`, `readResource()`, `getPrompt()`
  - Helpers: `listTools()`, `listResources()`, `listPrompts()`
  - Verification: `hasTool()`, `hasResource()`, `hasPrompt()`
  - New user-service example with full CRUD operations
  - 21 new tests for McpTestClient (173 total tests)

- Updated dependencies [2f96fd6]
  - @mcp-weave/core@0.1.1
