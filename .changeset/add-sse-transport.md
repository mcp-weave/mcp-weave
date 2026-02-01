---
'@mcp-weave/nestjs': minor
---

Add SSE (Server-Sent Events) transport support

- New `startSSE()` method on `McpRuntimeServer` for HTTP-based MCP servers
- Support `transport: 'sse'` option in server configuration
- CORS enabled by default for cross-origin requests
- Health check endpoint at `/health`
- Session management for multiple concurrent clients
- Automatic cleanup on connection close
