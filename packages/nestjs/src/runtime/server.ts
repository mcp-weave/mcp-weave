import { Server, StdioServerTransport, SSEServerTransport, AnyObjectSchema } from './sdk-compat.js';
import { extractMetadata } from '../metadata/storage.js';
import {
  createServer,
  type Server as HttpServer,
  type IncomingMessage,
  type ServerResponse,
} from 'http';

/**
 * Options for MCP runtime server
 */
export interface McpRuntimeOptions {
  /**
   * Transport type: 'stdio' (default) or 'sse'
   */
  transport?: 'stdio' | 'sse';

  /**
   * Port for SSE transport (default: 3000)
   */
  port?: number;

  /**
   * Endpoint path for SSE (default: '/sse')
   */
  endpoint?: string;
}

/**
 * Runtime MCP server that wraps a decorated class
 */
export class McpRuntimeServer {
  private server: Server;
  private instance: unknown;
  private metadata;

  constructor(target: Function, _options: McpRuntimeOptions = {}) {
    this.metadata = extractMetadata(target);

    if (!this.metadata.server) {
      throw new Error(`Class ${target.name} is not decorated with @McpServer`);
    }

    this.server = new Server(
      {
        name: this.metadata.server.name,
        version: this.metadata.server.version ?? '1.0.0',
      },
      {
        capabilities: {
          tools: this.metadata.tools.length > 0 ? {} : undefined,
          resources: this.metadata.resources.length > 0 ? {} : undefined,
          prompts: this.metadata.prompts.length > 0 ? {} : undefined,
        },
      }
    );

    // Create instance of the target class
    this.instance = new (target as unknown as { new (): unknown })();

    this.setupHandlers();
  }

  private setupHandlers() {
    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
  }

  private setupToolHandlers() {
    const tools = this.metadata.tools;
    if (tools.length === 0) return;

    // List tools
    this.server.setRequestHandler(
      { method: 'tools/list' } as unknown as AnyObjectSchema,
      async () => ({
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema ?? { type: 'object' as const, properties: {} },
        })),
      })
    );

    // Call tool
    this.server.setRequestHandler(
      { method: 'tools/call' } as unknown as AnyObjectSchema,
      async (request: Record<string, unknown>) => {
        if (!request || typeof request !== 'object') throw new Error('Invalid request');
        const params = (request as { params?: Record<string, unknown> }).params;
        if (!params || typeof params !== 'object') throw new Error('Invalid params');
        const toolName = params.name as string;
        const tool = tools.find(t => t.name === toolName);
        if (!tool) {
          throw new Error(`Unknown tool: ${toolName}`);
        }
        const method = Reflect.get(this.instance as object, tool.propertyKey);
        if (typeof method !== 'function') {
          throw new Error(`Method ${String(tool.propertyKey)} not found`);
        }
        const args = this.resolveToolArgs(
          tool.propertyKey,
          (params.arguments ?? {}) as Record<string, unknown>
        );
        const result = await method.apply(this.instance as object, args);
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result),
            },
          ],
        };
      }
    );
  }

  private setupResourceHandlers() {
    const resources = this.metadata.resources;
    if (resources.length === 0) return;

    // List resources
    this.server.setRequestHandler(
      { method: 'resources/list' } as unknown as AnyObjectSchema,
      async () => ({
        resources: resources.map(resource => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        })),
      })
    );

    // Read resource
    this.server.setRequestHandler(
      { method: 'resources/read' } as unknown as AnyObjectSchema,
      async (request: Record<string, unknown>) => {
        if (!request || typeof request !== 'object') throw new Error('Invalid request');
        const params = (request as { params?: Record<string, unknown> }).params;
        if (!params || typeof params !== 'object') throw new Error('Invalid params');
        const uri = params.uri as string;
        // Find matching resource
        for (const resource of resources) {
          const uriParams = this.extractUriParams(resource.uri, uri);
          if (uriParams) {
            const method = Reflect.get(this.instance as object, resource.propertyKey);
            if (typeof method !== 'function') {
              throw new Error(`Method ${String(resource.propertyKey)} not found`);
            }
            const args = this.resolveResourceArgs(resource.propertyKey, uriParams);
            return await method.apply(this.instance as object, args);
          }
        }
        throw new Error(`Resource not found: ${uri}`);
      }
    );
  }

  private setupPromptHandlers() {
    const prompts = this.metadata.prompts;
    if (prompts.length === 0) return;

    // List prompts
    this.server.setRequestHandler(
      { method: 'prompts/list' } as unknown as AnyObjectSchema,
      async () => ({
        prompts: prompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments ?? [],
        })),
      })
    );

    // Get prompt
    this.server.setRequestHandler(
      { method: 'prompts/get' } as unknown as AnyObjectSchema,
      async (request: Record<string, unknown>) => {
        if (!request || typeof request !== 'object') throw new Error('Invalid request');
        const params = (request as { params?: Record<string, unknown> }).params;
        if (!params || typeof params !== 'object') throw new Error('Invalid params');
        const promptName = params.name as string;
        const prompt = prompts.find(p => p.name === promptName);
        if (!prompt) {
          throw new Error(`Unknown prompt: ${promptName}`);
        }
        const method = Reflect.get(this.instance as object, prompt.propertyKey);
        if (typeof method !== 'function') {
          throw new Error(`Method ${String(prompt.propertyKey)} not found`);
        }
        const args = this.resolvePromptArgs(
          prompt.propertyKey,
          (params.arguments ?? {}) as Record<string, unknown>
        );
        return await method.apply(this.instance as object, args);
      }
    );
  }

  private resolveToolArgs(propertyKey: string | symbol, input: Record<string, unknown>): unknown[] {
    const params = this.metadata.params.filter(
      p => p.propertyKey === propertyKey && p.type === 'input'
    );

    if (params.length === 0) {
      return [input];
    }

    const args: unknown[] = [];
    for (const param of params) {
      args[param.parameterIndex] = input;
    }
    return args;
  }

  private resolveResourceArgs(
    propertyKey: string | symbol,
    uriParams: Record<string, string>
  ): unknown[] {
    const params = this.metadata.params.filter(
      p => p.propertyKey === propertyKey && p.type === 'param'
    );

    const args: unknown[] = [];
    for (const param of params) {
      if (param.name) {
        args[param.parameterIndex] = uriParams[param.name];
      }
    }
    return args;
  }

  private resolvePromptArgs(
    propertyKey: string | symbol,
    promptArgs: Record<string, unknown>
  ): unknown[] {
    const params = this.metadata.params.filter(
      p => p.propertyKey === propertyKey && p.type === 'promptArg'
    );

    const args: unknown[] = [];
    for (const param of params) {
      if (param.name) {
        args[param.parameterIndex] = promptArgs[param.name];
      }
    }
    return args;
  }

  private extractUriParams(template: string, uri: string): Record<string, string> | null {
    // Convert template to regex: user://{userId} -> user://([^/]+)
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

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`MCP server '${this.metadata.server?.name}' started on stdio`);
  }

  /**
   * Start the MCP server with SSE transport
   */
  async startSSE(options: { port?: number; endpoint?: string } = {}): Promise<HttpServer> {
    const port = options.port ?? 3000;
    const endpoint = options.endpoint ?? '/sse';

    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // Handle CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url ?? '/', `http://localhost:${port}`);

      // SSE endpoint
      if (url.pathname === endpoint && req.method === 'GET') {
        const transport = new SSEServerTransport(endpoint, res);
        await this.server.connect(transport);
        return;
      }

      // Message endpoint (POST to /sse/message or similar)
      if (url.pathname === `${endpoint}/message` && req.method === 'POST') {
        // Handle message posting for SSE
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ received: true }));
        });
        return;
      }

      // Health check
      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            server: this.metadata.server?.name,
            version: this.metadata.server?.version,
          })
        );
        return;
      }

      // 404 for other routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    return new Promise((resolve, reject) => {
      httpServer.on('error', reject);
      httpServer.listen(port, () => {
        console.error(
          `MCP server '${this.metadata.server?.name}' started on http://localhost:${port}${endpoint}`
        );
        resolve(httpServer);
      });
    });
  }

  /**
   * Get the underlying MCP server instance
   */
  getServer(): Server {
    return this.server;
  }
}

/**
 * Create and start an MCP server from a decorated class
 *
 * @example
 * // Stdio transport (default)
 * await createMcpServer(MyServer);
 *
 * @example
 * // SSE transport
 * await createMcpServer(MyServer, { transport: 'sse', port: 3000 });
 */
export async function createMcpServer(
  target: Function,
  options: McpRuntimeOptions = {}
): Promise<McpRuntimeServer> {
  const server = new McpRuntimeServer(target, options);

  if (options.transport === 'sse') {
    await server.startSSE({ port: options.port, endpoint: options.endpoint });
  } else {
    await server.start();
  }

  return server;
}
