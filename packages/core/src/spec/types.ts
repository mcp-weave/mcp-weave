import { z } from 'zod';

/**
 * MCP Spec Schema Version
 */
export const SPEC_VERSION = '1.0';

/**
 * Tool Input Schema
 */
export const ToolInputSchemaSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
});

export type ToolInputSchema = z.infer<typeof ToolInputSchemaSchema>;

/**
 * Tool Definition
 */
export const ToolDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: ToolInputSchemaSchema.optional(),
  handler: z.string().optional(),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

/**
 * Resource Definition
 */
export const ResourceDefinitionSchema = z.object({
  uri: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  mimeType: z.string().default('application/json'),
  handler: z.string().optional(),
});

export type ResourceDefinition = z.infer<typeof ResourceDefinitionSchema>;

/**
 * Prompt Argument
 */
export const PromptArgumentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().default(false),
});

export type PromptArgument = z.infer<typeof PromptArgumentSchema>;

/**
 * Prompt Definition
 */
export const PromptDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  arguments: z.array(PromptArgumentSchema).optional(),
  handler: z.string().optional(),
});

export type PromptDefinition = z.infer<typeof PromptDefinitionSchema>;

/**
 * Transport Configuration
 */
export const TransportConfigSchema = z.object({
  type: z.enum(['stdio', 'sse', 'websocket']),
  endpoint: z.string().optional(),
});

export type TransportConfig = z.infer<typeof TransportConfigSchema>;

/**
 * Server Configuration
 */
export const ServerConfigSchema = z.object({
  name: z.string().min(1),
  version: z.string().default('1.0.0'),
  description: z.string().optional(),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

/**
 * Complete MCP Spec
 */
export const McpSpecSchema = z.object({
  version: z.string().default(SPEC_VERSION),
  server: ServerConfigSchema,
  tools: z.array(ToolDefinitionSchema).optional().default([]),
  resources: z.array(ResourceDefinitionSchema).optional().default([]),
  prompts: z.array(PromptDefinitionSchema).optional().default([]),
  transport: z.array(TransportConfigSchema).optional().default([{ type: 'stdio' }]),
});

export type McpSpec = z.infer<typeof McpSpecSchema>;

/**
 * Metadata types for decorator scanning
 */
export interface McpServerMetadata {
  name: string;
  version?: string;
  description?: string;
  target: Function;
}

export interface McpToolMetadata {
  name: string;
  description: string;
  inputSchema?: ToolInputSchema;
  propertyKey: string | symbol;
  target: Function;
}

export interface McpResourceMetadata {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
  propertyKey: string | symbol;
  target: Function;
}

export interface McpPromptMetadata {
  name: string;
  description: string;
  arguments?: PromptArgument[];
  propertyKey: string | symbol;
  target: Function;
}

export interface McpParamMetadata {
  type: 'input' | 'param' | 'promptArg';
  name?: string;
  parameterIndex: number;
  propertyKey: string | symbol;
  target: Function;
}
