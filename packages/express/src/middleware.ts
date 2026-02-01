import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { extractMetadata } from '@mcp-weave/nestjs';

/**
 * Options for MCP Express middleware
 */
export interface McpMiddlewareOptions {
  /**
   * Base path for MCP endpoints (default: '/mcp')
   */
  basePath?: string;

  /**
   * Enable CORS headers (default: true)
   */
  cors?: boolean;

  /**
   * Custom CORS origin (default: '*')
   */
  corsOrigin?: string;
}

/**
 * Internal state for MCP middleware
 */
interface McpMiddlewareState {
  metadata: ReturnType<typeof extractMetadata>;
  target: Function;
}

/**
 * Create Express middleware for an MCP server
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createMcpMiddleware, McpServer, McpTool } from '@mcp-weave/express';
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
 * app.use('/mcp', createMcpMiddleware(MyServer));
 * app.listen(3000);
 * ```
 */
export function createMcpMiddleware(
  target: Function,
  options: McpMiddlewareOptions = {}
): RequestHandler {
  const { cors = true, corsOrigin = '*' } = options;

  // Initialize metadata
  const state: McpMiddlewareState = {
    metadata: extractMetadata(target),
    target,
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Handle CORS
    if (cors) {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
    }

    const path = req.path;

    try {
      // Health check
      if (path === '/health' || path === '/') {
        res.json({
          status: 'ok',
          server: state.metadata.server?.name,
          version: state.metadata.server?.version,
          capabilities: {
            tools: state.metadata.tools.length,
            resources: state.metadata.resources.length,
            prompts: state.metadata.prompts.length,
          },
        });
        return;
      }

      // List tools
      if (path === '/tools' && req.method === 'GET') {
        res.json({
          tools: state.metadata.tools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        });
        return;
      }

      // Call tool
      if (path === '/tools/call' && req.method === 'POST') {
        const { name, arguments: args } = req.body as {
          name: string;
          arguments?: Record<string, unknown>;
        };

        if (!name) {
          res.status(400).json({ error: 'Tool name is required' });
          return;
        }

        const tool = state.metadata.tools.find(t => t.name === name);
        if (!tool) {
          res.status(404).json({ error: `Tool not found: ${name}` });
          return;
        }

        // Execute tool via internal server
        const instance = new (state.target as new () => unknown)();
        const method = Reflect.get(instance as object, tool.propertyKey);

        if (typeof method !== 'function') {
          res.status(500).json({ error: `Method ${String(tool.propertyKey)} not found` });
          return;
        }

        const result = await method.call(instance, args ?? {});
        res.json({
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result),
            },
          ],
        });
        return;
      }

      // List resources
      if (path === '/resources' && req.method === 'GET') {
        res.json({
          resources: state.metadata.resources.map(r => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType,
          })),
        });
        return;
      }

      // Read resource
      if (path === '/resources/read' && req.method === 'POST') {
        const { uri } = req.body as { uri: string };

        if (!uri) {
          res.status(400).json({ error: 'Resource URI is required' });
          return;
        }

        const instance = new (state.target as new () => unknown)();

        for (const resource of state.metadata.resources) {
          const uriParams = extractUriParams(resource.uri, uri);
          if (uriParams) {
            const method = Reflect.get(instance as object, resource.propertyKey);
            if (typeof method !== 'function') {
              res.status(500).json({ error: `Method ${String(resource.propertyKey)} not found` });
              return;
            }

            // Resolve params
            const params = state.metadata.params.filter(
              p => p.propertyKey === resource.propertyKey && p.type === 'param'
            );
            const args: unknown[] = [];
            for (const param of params) {
              if (param.name) {
                args[param.parameterIndex] = uriParams[param.name];
              }
            }

            const result = await method.apply(instance, args);
            res.json(result);
            return;
          }
        }

        res.status(404).json({ error: `Resource not found: ${uri}` });
        return;
      }

      // List prompts
      if (path === '/prompts' && req.method === 'GET') {
        res.json({
          prompts: state.metadata.prompts.map(p => ({
            name: p.name,
            description: p.description,
            arguments: p.arguments,
          })),
        });
        return;
      }

      // Get prompt
      if (path === '/prompts/get' && req.method === 'POST') {
        const { name, arguments: args } = req.body as {
          name: string;
          arguments?: Record<string, unknown>;
        };

        if (!name) {
          res.status(400).json({ error: 'Prompt name is required' });
          return;
        }

        const prompt = state.metadata.prompts.find(p => p.name === name);
        if (!prompt) {
          res.status(404).json({ error: `Prompt not found: ${name}` });
          return;
        }

        const instance = new (state.target as new () => unknown)();
        const method = Reflect.get(instance as object, prompt.propertyKey);

        if (typeof method !== 'function') {
          res.status(500).json({ error: `Method ${String(prompt.propertyKey)} not found` });
          return;
        }

        // Resolve prompt args
        const params = state.metadata.params.filter(
          p => p.propertyKey === prompt.propertyKey && p.type === 'promptArg'
        );
        const methodArgs: unknown[] = [];
        for (const param of params) {
          if (param.name && args) {
            methodArgs[param.parameterIndex] = args[param.name];
          }
        }

        const result = await method.apply(instance, methodArgs);
        res.json(result);
        return;
      }

      // Not found
      next();
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  };
}

/**
 * Extract parameters from a URI template
 */
function extractUriParams(template: string, uri: string): Record<string, string> | null {
  const paramNames: string[] = [];
  const regexStr = template.replace(/\{(\w+)\}/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });

  const regex = new RegExp(`^${regexStr}$`);
  const match = uri.match(regex);

  if (!match) return null;

  const params: Record<string, string> = {};
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1] ?? '';
  });

  return params;
}
