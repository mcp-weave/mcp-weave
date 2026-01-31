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
export function assertToolResult(result: any, expected: any): void {
  const resultStr = JSON.stringify(result);
  const expectedStr = JSON.stringify(expected);
  if (resultStr !== expectedStr) {
    throw new Error(`Tool result mismatch.\nExpected: ${expectedStr}\nActual: ${resultStr}`);
  }
}

/**
 * Assert that a tool result contains specific properties
 */
export function assertToolResultContains(result: any, partial: Record<string, any>): void {
  for (const [key, value] of Object.entries(partial)) {
    if (result[key] !== value) {
      throw new Error(
        `Expected result.${key} to be ${JSON.stringify(value)}, but got ${JSON.stringify(result[key])}`
      );
    }
  }
}

/**
 * Assert resource content
 */
export function assertResourceContent(resource: any, expectedContent: any): void {
  const contents = resource.contents?.[0];
  if (!contents) {
    throw new Error('Expected resource to have contents');
  }

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
  prompt: any,
  role: 'user' | 'assistant',
  contentIncludes: string
): void {
  const messages = prompt.messages ?? [];
  const found = messages.find((m: any) => {
    if (m.role !== role) return false;
    const content = typeof m.content === 'string' ? m.content : m.content?.text;
    return content?.includes(contentIncludes);
  });

  if (!found) {
    throw new Error(`Expected prompt to have ${role} message containing '${contentIncludes}'`);
  }
}
