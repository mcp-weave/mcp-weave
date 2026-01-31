import { ZodError } from 'zod';

import { McpSpecSchema, type McpSpec } from './types.js';

/**
 * Validation error with details
 */
export class SpecValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'SpecValidationError';
  }
}

/**
 * Validate MCP spec object
 */
export function validateSpec(data: unknown): McpSpec {
  try {
    return McpSpecSchema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      throw new SpecValidationError(
        `Invalid MCP spec: ${errors.map(e => `${e.path}: ${e.message}`).join(', ')}`,
        errors
      );
    }
    throw error;
  }
}

/**
 * Check if spec is valid (returns boolean)
 */
export function isValidSpec(data: unknown): data is McpSpec {
  try {
    validateSpec(data);
    return true;
  } catch {
    return false;
  }
}
