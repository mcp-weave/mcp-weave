import { describe, it, expect } from 'vitest';
import {
  assertHasTool,
  assertHasResource,
  assertHasPrompt,
  assertToolResult,
  assertToolResultContains,
  assertResourceContent,
  assertPromptHasMessage,
} from '../assertions.js';
import type { McpSpec } from '@mcp-weave/core';

const testSpec: McpSpec = {
  version: '1.0',
  server: { name: 'test', version: '1.0.0' },
  tools: [
    { name: 'create_user', description: 'Creates a user' },
    { name: 'delete_user', description: 'Deletes a user' },
  ],
  resources: [
    { uri: 'user://{userId}', name: 'User', mimeType: 'application/json' },
    { uri: 'post://{postId}', name: 'Post', mimeType: 'text/html' },
  ],
  prompts: [
    { name: 'welcome', description: 'Welcome message' },
    { name: 'goodbye', description: 'Goodbye message' },
  ],
  transport: [{ type: 'stdio' }],
};

describe('assertHasTool', () => {
  it('should return tool when found', () => {
    const tool = assertHasTool(testSpec, 'create_user');

    expect(tool.name).toBe('create_user');
    expect(tool.description).toBe('Creates a user');
  });

  it('should throw when tool not found', () => {
    expect(() => assertHasTool(testSpec, 'unknown_tool')).toThrow(
      "Expected spec to have tool 'unknown_tool', but it was not found"
    );
  });
});

describe('assertHasResource', () => {
  it('should return resource when found', () => {
    const resource = assertHasResource(testSpec, 'user://{userId}');

    expect(resource.uri).toBe('user://{userId}');
    expect(resource.mimeType).toBe('application/json');
  });

  it('should throw when resource not found', () => {
    expect(() => assertHasResource(testSpec, 'unknown://resource')).toThrow(
      "Expected spec to have resource 'unknown://resource', but it was not found"
    );
  });
});

describe('assertHasPrompt', () => {
  it('should return prompt when found', () => {
    const prompt = assertHasPrompt(testSpec, 'welcome');

    expect(prompt.name).toBe('welcome');
    expect(prompt.description).toBe('Welcome message');
  });

  it('should throw when prompt not found', () => {
    expect(() => assertHasPrompt(testSpec, 'unknown_prompt')).toThrow(
      "Expected spec to have prompt 'unknown_prompt', but it was not found"
    );
  });
});

describe('assertToolResult', () => {
  it('should pass when results match', () => {
    const result = { success: true, userId: '123' };
    const expected = { success: true, userId: '123' };

    expect(() => assertToolResult(result, expected)).not.toThrow();
  });

  it('should throw when results differ', () => {
    const result = { success: true, userId: '123' };
    const expected = { success: false, userId: '123' };

    expect(() => assertToolResult(result, expected)).toThrow('Tool result mismatch');
  });

  it('should compare nested objects', () => {
    const result = { data: { nested: { value: 1 } } };
    const expected = { data: { nested: { value: 1 } } };

    expect(() => assertToolResult(result, expected)).not.toThrow();
  });
});

describe('assertToolResultContains', () => {
  it('should pass when result contains all properties', () => {
    const result = { success: true, userId: '123', extra: 'data' };

    expect(() => assertToolResultContains(result, { success: true, userId: '123' })).not.toThrow();
  });

  it('should throw when property value differs', () => {
    const result = { success: true, userId: '123' };

    expect(() => assertToolResultContains(result, { success: false })).toThrow(
      'Expected result.success to be false, but got true'
    );
  });

  it('should throw when property is missing', () => {
    const result = { success: true };

    expect(() => assertToolResultContains(result, { userId: '123' })).toThrow(
      'Expected result.userId to be "123", but got undefined'
    );
  });
});

describe('assertResourceContent', () => {
  it('should pass when content matches', () => {
    const resource = {
      contents: [{ text: JSON.stringify({ id: 1, name: 'Test' }) }],
    };

    expect(() => assertResourceContent(resource, { id: 1, name: 'Test' })).not.toThrow();
  });

  it('should throw when content differs', () => {
    const resource = {
      contents: [{ text: JSON.stringify({ id: 1 }) }],
    };

    expect(() => assertResourceContent(resource, { id: 2 })).toThrow('Resource content mismatch');
  });

  it('should throw when no contents', () => {
    const resource = {};

    expect(() => assertResourceContent(resource, { id: 1 })).toThrow(
      'Expected resource to have contents'
    );
  });

  it('should throw when contents array is empty', () => {
    const resource = { contents: [] };

    expect(() => assertResourceContent(resource, { id: 1 })).toThrow(
      'Expected resource to have contents'
    );
  });
});

describe('assertPromptHasMessage', () => {
  it('should pass when message found with string content', () => {
    const prompt = {
      messages: [
        { role: 'user', content: 'Hello, World!' },
        { role: 'assistant', content: 'Hi there!' },
      ],
    };

    expect(() => assertPromptHasMessage(prompt, 'user', 'Hello')).not.toThrow();
    expect(() => assertPromptHasMessage(prompt, 'assistant', 'Hi')).not.toThrow();
  });

  it('should pass when message found with object content', () => {
    const prompt = {
      messages: [{ role: 'user', content: { text: 'Hello, World!' } }],
    };

    expect(() => assertPromptHasMessage(prompt, 'user', 'Hello')).not.toThrow();
  });

  it('should throw when message not found', () => {
    const prompt = {
      messages: [{ role: 'user', content: 'Hello' }],
    };

    expect(() => assertPromptHasMessage(prompt, 'assistant', 'Hello')).toThrow(
      "Expected prompt to have assistant message containing 'Hello'"
    );
  });

  it('should throw when content does not match', () => {
    const prompt = {
      messages: [{ role: 'user', content: 'Hello' }],
    };

    expect(() => assertPromptHasMessage(prompt, 'user', 'Goodbye')).toThrow(
      "Expected prompt to have user message containing 'Goodbye'"
    );
  });

  it('should handle empty messages array', () => {
    const prompt = { messages: [] };

    expect(() => assertPromptHasMessage(prompt, 'user', 'Hello')).toThrow(
      "Expected prompt to have user message containing 'Hello'"
    );
  });
});
