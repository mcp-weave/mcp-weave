---
"@mcp-weave/nestjs": minor
"@mcp-weave/express": minor
"@mcp-weave/webui": minor
---

feat(auth): Add API key authentication support

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
