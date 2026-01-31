import 'reflect-metadata';
import { METADATA_KEYS } from '@mcp-weave/core';
import type { McpToolMetadata, ToolInputSchema } from '@mcp-weave/core';

/**
 * Options for @McpTool decorator
 */
export interface McpToolOptions {
  /**
   * Tool name
   */
  name: string;

  /**
   * Tool description
   */
  description: string;

  /**
   * Input schema (JSON Schema)
   */
  inputSchema?: ToolInputSchema;
}

/**
 * Marks a method as an MCP tool
 *
 * @example
 * ```typescript
 * @McpTool({
 *   name: 'create_user',
 *   description: 'Creates a new user'
 * })
 * async createUser(@McpInput() input: CreateUserDto) {
 *   return { success: true };
 * }
 * ```
 */
export function McpTool(options: McpToolOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) => {
    const constructor = target.constructor;

    const existingTools: McpToolMetadata[] =
      Reflect.getMetadata(METADATA_KEYS.TOOLS, constructor) ?? [];

    const metadata: McpToolMetadata = {
      name: options.name,
      description: options.description,
      inputSchema: options.inputSchema,
      propertyKey,
      target: constructor,
    };

    Reflect.defineMetadata(METADATA_KEYS.TOOLS, [...existingTools, metadata], constructor);
  };
}
