import 'reflect-metadata';
import { METADATA_KEYS } from '@mcp-weave/core';
import type { McpServerMetadata } from '@mcp-weave/core';

/**
 * Options for @McpServer decorator
 */
export interface McpServerOptions {
  /**
   * Server name
   */
  name: string;
  
  /**
   * Server version (default: '1.0.0')
   */
  version?: string;
  
  /**
   * Server description
   */
  description?: string;
}

/**
 * Marks a class as an MCP server
 * 
 * @example
 * ```typescript
 * @McpServer({ name: 'my-service', version: '1.0.0' })
 * export class MyController {
 *   // ...
 * }
 * ```
 */
export function McpServer(options: McpServerOptions): ClassDecorator {
  return (target: Function) => {
    const metadata: McpServerMetadata = {
      name: options.name,
      version: options.version ?? '1.0.0',
      description: options.description,
      target,
    };
    
    Reflect.defineMetadata(METADATA_KEYS.SERVER, metadata, target);
  };
}
