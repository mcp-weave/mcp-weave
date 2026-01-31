import 'reflect-metadata';
import {
  METADATA_KEYS,
  extractMetadata,
  type ScannedMetadata,
  McpServerMetadata,
  McpToolMetadata,
  McpResourceMetadata,
  McpPromptMetadata,
  McpParamMetadata,
} from '@mcp-weave/core';

// Re-export for convenience
export { METADATA_KEYS, extractMetadata };
export type {
  ScannedMetadata,
  McpServerMetadata,
  McpToolMetadata,
  McpResourceMetadata,
  McpPromptMetadata,
  McpParamMetadata,
};

/**
 * Check if a class has @McpServer decorator
 */
export function isMcpServer(target: Function): boolean {
  return Reflect.hasMetadata(METADATA_KEYS.SERVER, target);
}

/**
 * Get all MCP servers from an array of classes
 */
export function getMcpServers(targets: Function[]): Function[] {
  return targets.filter(isMcpServer);
}

/**
 * Get server metadata from a class
 */
export function getServerMetadata(target: Function): McpServerMetadata | undefined {
  return Reflect.getMetadata(METADATA_KEYS.SERVER, target);
}

/**
 * Get tools metadata from a class
 */
export function getToolsMetadata(target: Function): McpToolMetadata[] {
  return Reflect.getMetadata(METADATA_KEYS.TOOLS, target) ?? [];
}

/**
 * Get resources metadata from a class
 */
export function getResourcesMetadata(target: Function): McpResourceMetadata[] {
  return Reflect.getMetadata(METADATA_KEYS.RESOURCES, target) ?? [];
}

/**
 * Get prompts metadata from a class
 */
export function getPromptsMetadata(target: Function): McpPromptMetadata[] {
  return Reflect.getMetadata(METADATA_KEYS.PROMPTS, target) ?? [];
}

/**
 * Get params metadata from a class
 */
export function getParamsMetadata(target: Function): McpParamMetadata[] {
  return Reflect.getMetadata(METADATA_KEYS.PARAMS, target) ?? [];
}
