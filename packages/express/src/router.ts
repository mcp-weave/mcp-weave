import { Router, type RequestHandler } from 'express';

import { createMcpMiddleware, type McpMiddlewareOptions } from './middleware.js';

/**
 * Create an Express Router for MCP endpoints
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createMcpRouter, McpServer, McpTool } from '@mcp-weave/express';
 *
 * @McpServer({ name: 'my-server', version: '1.0.0' })
 * class MyServer {
 *   @McpTool({ name: 'hello', description: 'Say hello' })
 *   hello(input: { name: string }) {
 *     return `Hello, ${input.name}!`;
 *   }
 * }
 *
 * const app = express();
 * app.use(express.json());
 * app.use('/api/mcp', createMcpRouter(MyServer));
 * app.listen(3000);
 * ```
 */
export function createMcpRouter(target: Function, options: McpMiddlewareOptions = {}): Router {
  const router = Router();
  router.use(createMcpMiddleware(target, options) as RequestHandler);
  return router;
}
