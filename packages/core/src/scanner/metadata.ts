import 'reflect-metadata';
import type {
  McpServerMetadata,
  McpToolMetadata,
  McpResourceMetadata,
  McpPromptMetadata,
  McpParamMetadata,
  McpSpec,
} from '../spec/types.js';

/**
 * Metadata storage keys
 */
export const METADATA_KEYS = {
  SERVER: 'mcp:server',
  TOOLS: 'mcp:tools',
  RESOURCES: 'mcp:resources',
  PROMPTS: 'mcp:prompts',
  PARAMS: 'mcp:params',
} as const;

/**
 * Collected metadata from scanning
 */
export interface ScannedMetadata {
  server?: McpServerMetadata;
  tools: McpToolMetadata[];
  resources: McpResourceMetadata[];
  prompts: McpPromptMetadata[];
  params: McpParamMetadata[];
}

/**
 * Extract metadata from a decorated class
 */
export function extractMetadata(target: Function): ScannedMetadata {
  const server = Reflect.getMetadata(METADATA_KEYS.SERVER, target) as McpServerMetadata | undefined;
  const tools =
    (Reflect.getMetadata(METADATA_KEYS.TOOLS, target) as McpToolMetadata[] | undefined) ?? [];
  const resources =
    (Reflect.getMetadata(METADATA_KEYS.RESOURCES, target) as McpResourceMetadata[] | undefined) ??
    [];
  const prompts =
    (Reflect.getMetadata(METADATA_KEYS.PROMPTS, target) as McpPromptMetadata[] | undefined) ?? [];
  const params =
    (Reflect.getMetadata(METADATA_KEYS.PARAMS, target) as McpParamMetadata[] | undefined) ?? [];

  return { server, tools, resources, prompts, params };
}

/**
 * Convert scanned metadata to MCP spec
 */
export function metadataToSpec(metadata: ScannedMetadata): McpSpec {
  if (!metadata.server) {
    throw new Error('No @McpServer decorator found');
  }

  return {
    version: '1.0',
    server: {
      name: metadata.server.name,
      version: metadata.server.version ?? '1.0.0',
      description: metadata.server.description,
    },
    tools: metadata.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      handler: `/${String(tool.propertyKey)}`,
    })),
    resources: metadata.resources.map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
      handler: `/${String(resource.propertyKey)}`,
    })),
    prompts: metadata.prompts.map(prompt => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
      handler: `/${String(prompt.propertyKey)}`,
    })),
    transport: [{ type: 'stdio' }],
  };
}
