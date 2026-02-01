/**
 * @mcp-weave/express
 *
 * Express middleware for MCP (Model Context Protocol) servers.
 * Provides easy integration of MCP servers with Express applications.
 */

export { createMcpMiddleware, type McpMiddlewareOptions } from './middleware.js';
export { McpExpressServer, type McpExpressOptions } from './server.js';
export { createMcpRouter } from './router.js';

// Re-export common decorators from nestjs for convenience
export {
  McpServer,
  McpTool,
  McpResource,
  McpPrompt,
  McpInput,
  McpParam,
  McpPromptArg,
} from '@mcp-weave/nestjs';
