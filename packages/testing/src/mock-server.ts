import type {
  McpSpec,
  ToolDefinition,
  ResourceDefinition,
  PromptDefinition,
} from '@mcp-weave/core';

/**
 * Mock MCP server for testing
 */
export class McpTestServer {
  private toolHandlers: Map<string, (args: unknown) => unknown> = new Map();
  private resourceHandlers: Map<string, (uri: string) => unknown> = new Map();
  private promptHandlers: Map<string, (args: unknown) => unknown> = new Map();

  constructor(private spec?: McpSpec) {}

  /**
   * Register a tool handler
   */
  registerTool(name: string, handler: (args: unknown) => unknown): void {
    this.toolHandlers.set(name, handler);
  }

  /**
   * Register a resource handler
   */
  registerResource(uriPattern: string, handler: (uri: string) => unknown): void {
    this.resourceHandlers.set(uriPattern, handler);
  }

  /**
   * Register a prompt handler
   */
  registerPrompt(name: string, handler: (args: unknown) => unknown): void {
    this.promptHandlers.set(name, handler);
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: unknown = {}): Promise<unknown> {
    const handler = this.toolHandlers.get(name);
    if (!handler) {
      throw new Error(`Tool not found: ${name}`);
    }
    return handler(args);
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<unknown> {
    for (const [pattern, handler] of this.resourceHandlers) {
      if (this.matchesPattern(pattern, uri)) {
        return handler(uri);
      }
    }
    throw new Error(`Resource not found: ${uri}`);
  }

  /**
   * Get a prompt
   */
  async getPrompt(name: string, args: unknown = {}): Promise<unknown> {
    const handler = this.promptHandlers.get(name);
    if (!handler) {
      throw new Error(`Prompt not found: ${name}`);
    }
    return handler(args);
  }

  /**
   * List available tools
   */
  listTools(): ToolDefinition[] {
    return this.spec?.tools ?? [];
  }

  /**
   * List available resources
   */
  listResources(): ResourceDefinition[] {
    return this.spec?.resources ?? [];
  }

  /**
   * List available prompts
   */
  listPrompts(): PromptDefinition[] {
    return this.spec?.prompts ?? [];
  }

  private matchesPattern(pattern: string, uri: string): boolean {
    const regex = pattern.replace(/\{(\w+)\}/g, '[^/]+');
    return new RegExp(`^${regex}$`).test(uri);
  }
}

/**
 * Create a test server from a spec
 */
export function createTestServer(spec?: McpSpec): McpTestServer {
  return new McpTestServer(spec);
}
