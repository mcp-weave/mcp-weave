import type {
  McpSpec,
  ToolDefinition,
  ResourceDefinition,
  PromptDefinition,
} from '@mcp-weave/core';

/**
 * Assert that a spec has a specific tool
 */
export function assertHasTool(spec: McpSpec, toolName: string): ToolDefinition {
  const tool = spec.tools?.find(t => t.name === toolName);
  if (!tool) {
    throw new Error(`Expected spec to have tool '${toolName}', but it was not found`);
  }
  return tool;
}

/**
 * Assert that a spec has a specific resource
 */
export function assertHasResource(spec: McpSpec, resourceUri: string): ResourceDefinition {
  const resource = spec.resources?.find(r => r.uri === resourceUri);
  if (!resource) {
    throw new Error(`Expected spec to have resource '${resourceUri}', but it was not found`);
  }
  return resource;
}

/**
 * Assert that a spec has a specific prompt
 */
export function assertHasPrompt(spec: McpSpec, promptName: string): PromptDefinition {
  const prompt = spec.prompts?.find(p => p.name === promptName);
  if (!prompt) {
    throw new Error(`Expected spec to have prompt '${promptName}', but it was not found`);
  }
  return prompt;
}

/**
 * Assert tool call result
 */
export function assertToolResult(result: unknown, expected: unknown): void {
  const resultStr = JSON.stringify(result);
  const expectedStr = JSON.stringify(expected);
  if (resultStr !== expectedStr) {
    throw new Error(`Tool result mismatch.\nExpected: ${expectedStr}\nActual: ${resultStr}`);
  }
}

/**
 * Assert that a tool result contains specific properties
 */
export function assertToolResultContains(result: unknown, partial: Record<string, unknown>): void {
  if (typeof result !== 'object' || result === null) {
    throw new Error('Result is not an object');
  }
  for (const [key, value] of Object.entries(partial)) {
    if ((result as Record<string, unknown>)[key] !== value) {
      throw new Error(
        `Expected result.${key} to be ${JSON.stringify(value)}, but got ${JSON.stringify((result as Record<string, unknown>)[key])}`
      );
    }
  }
}

/**
 * Assert resource content
 */
export function assertResourceContent(resource: unknown, expectedContent: unknown): void {
  if (typeof resource !== 'object' || resource === null) {
    throw new Error('Resource is not an object');
  }
  const contentsRaw = (resource as Record<string, unknown>).contents;
  if (!Array.isArray(contentsRaw) || contentsRaw.length === 0) {
    throw new Error('Expected resource to have contents');
  }
  const contents = contentsRaw[0];
  const actual = contents.text ? JSON.parse(contents.text) : contents;
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expectedContent);
  if (actualStr !== expectedStr) {
    throw new Error(`Resource content mismatch.\nExpected: ${expectedStr}\nActual: ${actualStr}`);
  }
}

/**
 * Assert prompt messages
 */
export function assertPromptHasMessage(
  prompt: unknown,
  role: 'user' | 'assistant',
  contentIncludes: string
): void {
  if (typeof prompt !== 'object' || prompt === null) {
    throw new Error('Prompt is not an object');
  }
  const messages = (prompt as Record<string, unknown>).messages ?? [];
  const found = Array.isArray(messages) && messages.find((m: unknown) => {
    if (typeof m !== 'object' || m === null) return false;
    // @ts-expect-error: dynamic access
    if (m.role !== role) return false;
    // @ts-expect-error: dynamic access
    const content = typeof m.content === 'string' ? m.content : m.content?.text;
    return typeof content === 'string' && content.includes(contentIncludes);
  });
  if (!found) {
    throw new Error(`Expected prompt to have ${role} message containing '${contentIncludes}'`);
  }
}
