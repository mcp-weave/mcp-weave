import { extractMetadata } from '@mcp-weave/nestjs';
import express, { type Express, type RequestHandler } from 'express';

import { createMcpMiddleware, type McpMiddlewareOptions } from './middleware.js';

/**
 * Options for MCP Express server
 */
export interface McpExpressOptions extends McpMiddlewareOptions {
  /**
   * Port to listen on (default: 3000)
   */
  port?: number;

  /**
   * Host to bind to (default: '0.0.0.0')
   */
  host?: string;

  /**
   * Custom Express app (if you want to add other middleware)
   */
  app?: Express;
}

/**
 * Standalone Express server for MCP
 *
 * @example
 * ```typescript
 * import { McpExpressServer, McpServer, McpTool } from '@mcp-weave/express';
 *
 * @McpServer({ name: 'my-server', version: '1.0.0' })
 * class MyServer {
 *   @McpTool({ name: 'hello', description: 'Say hello' })
 *   hello(input: { name: string }) {
 *     return `Hello, ${input.name}!`;
 *   }
 * }
 *
 * const server = new McpExpressServer(MyServer);
 * await server.start();
 * // Server running at http://localhost:3000/mcp
 * ```
 */
export class McpExpressServer {
  private app: Express;
  private target: Function;
  private options: McpExpressOptions;
  private httpServer?: ReturnType<Express['listen']>;

  constructor(target: Function, options: McpExpressOptions = {}) {
    this.target = target;
    this.options = options;
    this.app = options.app ?? express();

    // Setup middleware
    this.app.use(express.json() as RequestHandler);
    this.app.use(
      options.basePath ?? '/mcp',
      createMcpMiddleware(target, options) as RequestHandler
    );
  }

  /**
   * Start the Express server
   */
  async start(): Promise<void> {
    const port = this.options.port ?? 3000;
    const host = this.options.host ?? '0.0.0.0';
    const basePath = this.options.basePath ?? '/mcp';

    const metadata = extractMetadata(this.target);

    return new Promise(resolve => {
      this.httpServer = this.app.listen(port, host, () => {
        console.log(`🚀 MCP Express server '${metadata.server?.name}' started`);
        console.log(
          `   Base URL: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}${basePath}`
        );
        console.log(
          `   Health:   http://${host === '0.0.0.0' ? 'localhost' : host}:${port}${basePath}/health`
        );
        console.log(`   Tools:    ${metadata.tools.length}`);
        console.log(`   Resources: ${metadata.resources.length}`);
        console.log(`   Prompts:  ${metadata.prompts.length}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.httpServer) {
        this.httpServer.close(err => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the Express app instance
   */
  getApp(): Express {
    return this.app;
  }
}
