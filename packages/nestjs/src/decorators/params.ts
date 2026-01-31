import 'reflect-metadata';
import { METADATA_KEYS } from '@mcp-weave/core';
import type { McpParamMetadata } from '@mcp-weave/core';

/**
 * Injects the tool input
 *
 * @example
 * ```typescript
 * @McpTool({ name: 'create_user', description: 'Creates a user' })
 * async createUser(@McpInput() input: CreateUserDto) {
 *   // input contains the tool arguments
 * }
 * ```
 */
export function McpInput(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) return;

    const constructor = target.constructor;
    const existingParams: McpParamMetadata[] =
      Reflect.getMetadata(METADATA_KEYS.PARAMS, constructor) ?? [];

    const metadata: McpParamMetadata = {
      type: 'input',
      parameterIndex,
      propertyKey,
      target: constructor,
    };

    Reflect.defineMetadata(METADATA_KEYS.PARAMS, [...existingParams, metadata], constructor);
  };
}

/**
 * Injects a URI parameter from a resource
 *
 * @example
 * ```typescript
 * @McpResource({ uri: 'user://{userId}', name: 'User' })
 * async getUser(@McpParam('userId') userId: string) {
 *   // userId is extracted from the URI
 * }
 * ```
 */
export function McpParam(name: string): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) return;

    const constructor = target.constructor;
    const existingParams: McpParamMetadata[] =
      Reflect.getMetadata(METADATA_KEYS.PARAMS, constructor) ?? [];

    const metadata: McpParamMetadata = {
      type: 'param',
      name,
      parameterIndex,
      propertyKey,
      target: constructor,
    };

    Reflect.defineMetadata(METADATA_KEYS.PARAMS, [...existingParams, metadata], constructor);
  };
}

/**
 * Injects a prompt argument
 *
 * @example
 * ```typescript
 * @McpPrompt({ name: 'welcome', description: 'Welcome prompt' })
 * async generateWelcome(@McpPromptArg('userName') userName: string) {
 *   // userName is the prompt argument
 * }
 * ```
 */
export function McpPromptArg(name: string): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) return;

    const constructor = target.constructor;
    const existingParams: McpParamMetadata[] =
      Reflect.getMetadata(METADATA_KEYS.PARAMS, constructor) ?? [];

    const metadata: McpParamMetadata = {
      type: 'promptArg',
      name,
      parameterIndex,
      propertyKey,
      target: constructor,
    };

    Reflect.defineMetadata(METADATA_KEYS.PARAMS, [...existingParams, metadata], constructor);
  };
}
