import 'reflect-metadata';
import { METADATA_KEYS } from '@mcp-weave/core';
import { describe, it, expect } from 'vitest';

import { McpTool } from '../../decorators/mcp-tool.js';

describe('@McpTool', () => {
  it('should set tool metadata on method', () => {
    class TestServer {
      @McpTool({
        name: 'create_user',
        description: 'Creates a new user',
      })
      createUser() {
        return { success: true };
      }
    }

    const tools = Reflect.getMetadata(METADATA_KEYS.TOOLS, TestServer);

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('create_user');
    expect(tools[0].description).toBe('Creates a new user');
    expect(tools[0].propertyKey).toBe('createUser');
    expect(tools[0].target).toBe(TestServer);
  });

  it('should support inputSchema', () => {
    class TestServer {
      @McpTool({
        name: 'create_user',
        description: 'Creates a new user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['name'],
        },
      })
      createUser() {
        return { success: true };
      }
    }

    const tools = Reflect.getMetadata(METADATA_KEYS.TOOLS, TestServer);

    expect(tools[0].inputSchema).toBeDefined();
    expect(tools[0].inputSchema?.type).toBe('object');
    expect(tools[0].inputSchema?.required).toEqual(['name']);
  });

  it('should support multiple tools on same class', () => {
    class TestServer {
      @McpTool({
        name: 'create_user',
        description: 'Creates a user',
      })
      createUser() {
        return {};
      }

      @McpTool({
        name: 'delete_user',
        description: 'Deletes a user',
      })
      deleteUser() {
        return {};
      }

      @McpTool({
        name: 'update_user',
        description: 'Updates a user',
      })
      updateUser() {
        return {};
      }
    }

    const tools = Reflect.getMetadata(METADATA_KEYS.TOOLS, TestServer);

    expect(tools).toHaveLength(3);
    expect(tools.map((t: { name: string }) => t.name)).toEqual([
      'create_user',
      'delete_user',
      'update_user',
    ]);
  });

  it('should preserve method functionality', () => {
    class TestServer {
      @McpTool({
        name: 'add',
        description: 'Adds two numbers',
      })
      add(a: number, b: number) {
        return a + b;
      }
    }

    const instance = new TestServer();
    expect(instance.add(2, 3)).toBe(5);
  });

  it('should handle async methods', async () => {
    class TestServer {
      @McpTool({
        name: 'async_tool',
        description: 'An async tool',
      })
      async asyncMethod() {
        return Promise.resolve({ data: 'test' });
      }
    }

    const instance = new TestServer();
    const result = await instance.asyncMethod();

    expect(result).toEqual({ data: 'test' });
  });
});
