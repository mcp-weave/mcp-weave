import { Server, StdioServerTransport, AnyObjectSchema } from './sdk-compat.js';

import { extractMetadata } from '../metadata/storage.js';

/**
 * Options for MCP runtime server
 */
export interface McpRuntimeOptions {
  /**
   * Transport type
   */
  transport?: 'stdio' | 'sse';
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
    this.server.setRequestHandler(({ method: 'tools/list' } as unknown) as AnyObjectSchema, async () => ({
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema ?? { type: 'object' as const, properties: {} },
      })),
    }));

    // Call tool
    this.server.setRequestHandler(({ method: 'tools/call' } as unknown) as AnyObjectSchema, async (request: any) => {
      const toolName = request.params.name;
      const tool = tools.find(t => t.name === toolName);

      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const method = (this.instance as any)[tool.propertyKey];
      if (typeof method !== 'function') {
        throw new Error(`Method ${String(tool.propertyKey)} not found`);
      }

      const args = this.resolveToolArgs(tool.propertyKey, request.params.arguments ?? {});
      const result = await method.apply(this.instance, args);

      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result),
          },
        ],
      };
    });
  }

  private setupResourceHandlers() {
    const resources = this.metadata.resources;
    if (resources.length === 0) return;

    // List resources
    this.server.setRequestHandler(({ method: 'resources/list' } as unknown) as AnyObjectSchema, async () => ({
      resources: resources.map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      })),
    }));

    // Read resource
    this.server.setRequestHandler(
      ({ method: 'resources/read' } as unknown) as AnyObjectSchema,
      async (request: any) => {
        const uri = request.params.uri as string;

        // Find matching resource
        for (const resource of resources) {
          const params = this.extractUriParams(resource.uri, uri);
          if (params) {
            const method = (this.instance as any)[resource.propertyKey];
            if (typeof method !== 'function') {
              throw new Error(`Method ${String(resource.propertyKey)} not found`);
            }

            const args = this.resolveResourceArgs(resource.propertyKey, params);
            return await method.apply(this.instance, args);
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
    this.server.setRequestHandler(({ method: 'prompts/list' } as unknown) as AnyObjectSchema, async () => ({
      prompts: prompts.map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments ?? [],
      })),
    }));

    // Get prompt
    this.server.setRequestHandler(
      ({ method: 'prompts/get' } as unknown) as AnyObjectSchema,
      async (request: any) => {
        const promptName = request.params.name;
        const prompt = prompts.find(p => p.name === promptName);

        if (!prompt) {
          throw new Error(`Unknown prompt: ${promptName}`);
        }

        const method = (this.instance as any)[prompt.propertyKey];
        if (typeof method !== 'function') {
          throw new Error(`Method ${String(prompt.propertyKey)} not found`);
        }

        const args = this.resolvePromptArgs(prompt.propertyKey, request.params.arguments ?? {});
        return await method.apply(this.instance, args);
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
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`MCP server '${this.metadata.server?.name}' started on stdio`);
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
 */
export async function createMcpServer(
  target: Function,
  options?: McpRuntimeOptions
): Promise<McpRuntimeServer> {
  const server = new McpRuntimeServer(target, options);
  await server.start();
  return server;
}
