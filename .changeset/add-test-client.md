---
"@mcp-weave/testing": minor
"@mcp-weave/core": patch
"@mcp-weave/nestjs": patch
"@mcp-weave/cli": patch
---

Add McpTestClient for easy testing of decorated MCP servers

- New `McpTestClient` class to test decorated classes directly
- Methods: `callTool()`, `readResource()`, `getPrompt()`
- Helpers: `listTools()`, `listResources()`, `listPrompts()`
- Verification: `hasTool()`, `hasResource()`, `hasPrompt()`
- New user-service example with full CRUD operations
- 21 new tests for McpTestClient (173 total tests)
