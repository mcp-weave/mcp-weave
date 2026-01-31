import 'reflect-metadata';
import { METADATA_KEYS } from '@mcp-weave/core';
import type { McpResourceMetadata } from '@mcp-weave/core';

/**
 * Options for @McpResource decorator
 */
export interface McpResourceOptions {
  /**
   * Resource URI template (e.g., 'user://{userId}')
   */
  uri: string;

  /**
   * Resource name
   */
  name: string;

  /**
   * Resource description
   */
  description?: string;

  /**
   * MIME type (default: 'application/json')
   */
  mimeType?: string;
}

/**
 * Marks a method as an MCP resource
 *
 * @example
 * ```typescript
 * @McpResource({
 *   uri: 'user://{userId}',
 *   name: 'User Profile',
 *   mimeType: 'application/json'
 * })
 * async getUserProfile(@McpParam('userId') userId: string) {
 *   return { contents: [...] };
 * }
 * ```
 */
export function McpResource(options: McpResourceOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) => {
    const constructor = target.constructor;

    const existingResources: McpResourceMetadata[] =
      Reflect.getMetadata(METADATA_KEYS.RESOURCES, constructor) ?? [];

    const metadata: McpResourceMetadata = {
      uri: options.uri,
      name: options.name,
      description: options.description,
      mimeType: options.mimeType ?? 'application/json',
      propertyKey,
      target: constructor,
    };

    Reflect.defineMetadata(METADATA_KEYS.RESOURCES, [...existingResources, metadata], constructor);
  };
}
