import 'reflect-metadata';
import { METADATA_KEYS } from '@mcp-weave/core';
import type { McpPromptMetadata, PromptArgument } from '@mcp-weave/core';

/**
 * Options for @McpPrompt decorator
 */
export interface McpPromptOptions {
  /**
   * Prompt name
   */
  name: string;
  
  /**
   * Prompt description
   */
  description: string;
  
  /**
   * Prompt arguments
   */
  arguments?: PromptArgument[];
}

/**
 * Marks a method as an MCP prompt
 * 
 * @example
 * ```typescript
 * @McpPrompt({
 *   name: 'welcome_email',
 *   description: 'Generate welcome email for new user'
 * })
 * async generateWelcomeEmail(
 *   @McpPromptArg('userName') userName: string
 * ) {
 *   return { messages: [...] };
 * }
 * ```
 */
export function McpPrompt(options: McpPromptOptions): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) => {
    const constructor = target.constructor;
    
    const existingPrompts: McpPromptMetadata[] = 
      Reflect.getMetadata(METADATA_KEYS.PROMPTS, constructor) ?? [];
    
    const metadata: McpPromptMetadata = {
      name: options.name,
      description: options.description,
      arguments: options.arguments,
      propertyKey,
      target: constructor,
    };
    
    Reflect.defineMetadata(METADATA_KEYS.PROMPTS, [...existingPrompts, metadata], constructor);
  };
}
