# @mcp-weave/express

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
