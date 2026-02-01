import 'reflect-metadata';

/**
 * Result from a tool call
 */
export interface ToolCallResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Result from reading a resource
 */
export interface ResourceReadResult {
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}

/**
 * Result from getting a prompt
 */
export interface PromptGetResult {
  messages: Array<{
    role: string;
    content: {
      type: string;
      text: string;
    };
  }>;
}

/**
 * MCP Test Client
 *
 * A high-level testing client that wraps a decorated class and provides
 * easy methods to test tools, resources, and prompts.
 *
 * @example
 * ```typescript
 * import { McpTestClient } from '@mcp-weave/testing';
 *
 * describe('MyServer', () => {
 *   let client: McpTestClient;
 *
 *   beforeEach(() => {
 *     client = new McpTestClient(MyServer);
 *   });
 *
 *   it('should call tool', async () => {
 *     const result = await client.callTool('my_tool', { arg: 'value' });
 *     expect(result.content[0].text).toContain('expected');
 *   });
 *
 *   it('should read resource', async () => {
 *     const result = await client.readResource('my://resource');
 *     expect(result.contents[0].text).toContain('data');
 *   });
 * });
 * ```
 */
export class McpTestClient {
  private instance: unknown;
  private metadata: ServerMetadata | null = null;

  constructor(private serverClass: Function) {
    this.instance = new (serverClass as unknown as { new (): unknown })();
    this.extractMetadata();
  }

  private extractMetadata(): void {
    // Try to extract metadata from reflect-metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ReflectMeta = Reflect as any;
    const serverMeta = ReflectMeta.getMetadata?.('mcp:server', this.serverClass);
    const tools = ReflectMeta.getMetadata?.('mcp:tools', this.serverClass) ?? [];
    const resources = ReflectMeta.getMetadata?.('mcp:resources', this.serverClass) ?? [];
    const prompts = ReflectMeta.getMetadata?.('mcp:prompts', this.serverClass) ?? [];
    const params = ReflectMeta.getMetadata?.('mcp:params', this.serverClass) ?? [];

    this.metadata = {
      server: serverMeta,
      tools,
      resources,
      prompts,
      params,
    };
  }

  /**
   * Call a tool by name with the given arguments
   */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<ToolCallResult> {
    if (!this.metadata) {
      throw new Error('Server metadata not found. Make sure the class is decorated with @McpServer');
    }

    const tool = this.metadata.tools.find((t: ToolMeta) => t.name === name);
    if (!tool) {
      const availableTools = this.metadata.tools.map((t: ToolMeta) => t.name).join(', ');
      throw new Error(`Tool '${name}' not found. Available tools: ${availableTools || 'none'}`);
    }

    const method = Reflect.get(this.instance as object, tool.propertyKey);
    if (typeof method !== 'function') {
      throw new Error(`Method ${String(tool.propertyKey)} not found on server instance`);
    }

    // Resolve args based on parameter decorators
    const resolvedArgs = this.resolveToolArgs(tool.propertyKey, args);
    const result = await method.apply(this.instance as object, resolvedArgs);

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result),
        },
      ],
    };
  }

  /**
   * Read a resource by URI
   */
  async readResource(uri: string): Promise<ResourceReadResult> {
    if (!this.metadata) {
      throw new Error('Server metadata not found. Make sure the class is decorated with @McpServer');
    }

    for (const resource of this.metadata.resources) {
      const uriParams = this.extractUriParams(resource.uri, uri);
      if (uriParams) {
        const method = Reflect.get(this.instance as object, resource.propertyKey);
        if (typeof method !== 'function') {
          throw new Error(`Method ${String(resource.propertyKey)} not found on server instance`);
        }

        const resolvedArgs = this.resolveResourceArgs(resource.propertyKey, uriParams);
        return await method.apply(this.instance as object, resolvedArgs);
      }
    }

    const availableResources = this.metadata.resources.map((r: ResourceMeta) => r.uri).join(', ');
    throw new Error(`Resource '${uri}' not found. Available resources: ${availableResources || 'none'}`);
  }

  /**
   * Get a prompt by name with the given arguments
   */
  async getPrompt(name: string, args: Record<string, unknown> = {}): Promise<PromptGetResult> {
    if (!this.metadata) {
      throw new Error('Server metadata not found. Make sure the class is decorated with @McpServer');
    }

    const prompt = this.metadata.prompts.find((p: PromptMeta) => p.name === name);
    if (!prompt) {
      const availablePrompts = this.metadata.prompts.map((p: PromptMeta) => p.name).join(', ');
      throw new Error(`Prompt '${name}' not found. Available prompts: ${availablePrompts || 'none'}`);
    }

    const method = Reflect.get(this.instance as object, prompt.propertyKey);
    if (typeof method !== 'function') {
      throw new Error(`Method ${String(prompt.propertyKey)} not found on server instance`);
    }

    const resolvedArgs = this.resolvePromptArgs(prompt.propertyKey, args);
    return await method.apply(this.instance as object, resolvedArgs);
  }

  /**
   * List all available tools
   */
  listTools(): Array<{ name: string; description?: string }> {
    if (!this.metadata) return [];
    return this.metadata.tools.map((t: ToolMeta) => ({
      name: t.name,
      description: t.description,
    }));
  }

  /**
   * List all available resources
   */
  listResources(): Array<{ uri: string; name?: string; description?: string }> {
    if (!this.metadata) return [];
    return this.metadata.resources.map((r: ResourceMeta) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
    }));
  }

  /**
   * List all available prompts
   */
  listPrompts(): Array<{ name: string; description?: string }> {
    if (!this.metadata) return [];
    return this.metadata.prompts.map((p: PromptMeta) => ({
      name: p.name,
      description: p.description,
    }));
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    if (!this.metadata) return false;
    return this.metadata.tools.some((t: ToolMeta) => t.name === name);
  }

  /**
   * Check if a resource exists (by URI pattern or exact URI)
   */
  hasResource(uri: string): boolean {
    if (!this.metadata) return false;
    return this.metadata.resources.some((r: ResourceMeta) => {
      if (r.uri === uri) return true;
      // Check if URI matches the pattern
      return this.extractUriParams(r.uri, uri) !== null;
    });
  }

  /**
   * Check if a prompt exists
   */
  hasPrompt(name: string): boolean {
    if (!this.metadata) return false;
    return this.metadata.prompts.some((p: PromptMeta) => p.name === name);
  }

  /**
   * Get the raw server instance for advanced testing
   */
  getInstance<T>(): T {
    return this.instance as T;
  }

  private resolveToolArgs(propertyKey: string | symbol, input: Record<string, unknown>): unknown[] {
    if (!this.metadata) return [input];

    const params = this.metadata.params.filter(
      (p: ParamMeta) => p.propertyKey === propertyKey && p.type === 'input'
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

  private resolveResourceArgs(propertyKey: string | symbol, uriParams: Record<string, string>): unknown[] {
    if (!this.metadata) return [];

    const params = this.metadata.params.filter(
      (p: ParamMeta) => p.propertyKey === propertyKey && p.type === 'param'
    );

    if (params.length === 0) {
      return [];
    }

    const args: unknown[] = [];
    for (const param of params) {
      args[param.parameterIndex] = param.name ? uriParams[param.name] : uriParams;
    }
    return args;
  }

  private resolvePromptArgs(propertyKey: string | symbol, input: Record<string, unknown>): unknown[] {
    if (!this.metadata) return [];

    const params = this.metadata.params.filter(
      (p: ParamMeta) => p.propertyKey === propertyKey && p.type === 'promptArg'
    );

    if (params.length === 0) {
      return [];
    }

    const args: unknown[] = [];
    for (const param of params) {
      args[param.parameterIndex] = param.name ? input[param.name] : input;
    }
    return args;
  }

  private extractUriParams(pattern: string, uri: string): Record<string, string> | null {
    const paramNames: string[] = [];
    const regexStr = pattern.replace(/\{(\w+)\}/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${regexStr}$`);
    const match = uri.match(regex);

    if (!match) return null;

    const params: Record<string, string> = {};
    paramNames.forEach((name, i) => {
      const value = match[i + 1];
      if (value !== undefined) {
        params[name] = value;
      }
    });

    return params;
  }
}

// Internal types
interface ToolMeta {
  name: string;
  description?: string;
  propertyKey: string | symbol;
}

interface ResourceMeta {
  uri: string;
  name?: string;
  description?: string;
  propertyKey: string | symbol;
}

interface PromptMeta {
  name: string;
  description?: string;
  propertyKey: string | symbol;
}

interface ParamMeta {
  propertyKey: string | symbol;
  parameterIndex: number;
  type: 'input' | 'param' | 'promptArg';
  name?: string;
}

interface ServerMetadata {
  server: unknown;
  tools: ToolMeta[];
  resources: ResourceMeta[];
  prompts: PromptMeta[];
  params: ParamMeta[];
}

/**
 * Create a test client for a decorated server class
 */
export function createTestClient(serverClass: Function): McpTestClient {
  return new McpTestClient(serverClass);
}
