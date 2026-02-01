# @mcp-weave/cli

## 0.1.2

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
