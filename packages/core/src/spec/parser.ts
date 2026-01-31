import YAML from 'yaml';

import type { McpSpec } from './types.js';

/**
 * Parse MCP spec from YAML string
 */
export function parseSpec(yamlContent: string): unknown {
  try {
    return YAML.parse(yamlContent);
  } catch (error) {
    throw new Error(
      `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Stringify MCP spec to YAML
 */
export function stringifySpec(spec: McpSpec): string {
  return YAML.stringify(spec, {
    indent: 2,
    lineWidth: 120,
  });
}

/**
 * Parse and validate MCP spec from YAML string
 */
export async function parseAndValidateSpec(yamlContent: string): Promise<McpSpec> {
  const { validateSpec } = await import('./validator.js');
  const parsed = parseSpec(yamlContent);
  return validateSpec(parsed);
}
