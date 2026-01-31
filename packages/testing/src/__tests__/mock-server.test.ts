import { describe, it, expect } from 'vitest';
import { McpTestServer, createTestServer } from '../mock-server.js';
import type { McpSpec } from '@mcp-weave/core';

describe('McpTestServer', () => {
  describe('tools', () => {
    it('should register and call a tool', async () => {
      const server = new McpTestServer();

      server.registerTool('add', (args: { a: number; b: number }) => {
        return { result: args.a + args.b };
      });

      const result = await server.callTool('add', { a: 2, b: 3 });

      expect(result).toEqual({ result: 5 });
    });

    it('should throw when calling unregistered tool', async () => {
      const server = new McpTestServer();

      await expect(server.callTool('unknown')).rejects.toThrow('Tool not found: unknown');
    });

    it('should support async handlers', async () => {
      const server = new McpTestServer();

      server.registerTool('async_tool', async (args: { value: string }) => {
        return Promise.resolve({ echoed: args.value });
      });

      const result = await server.callTool('async_tool', { value: 'hello' });

      expect(result).toEqual({ echoed: 'hello' });
    });

    it('should list tools from spec', () => {
      const spec: McpSpec = {
        version: '1.0',
        server: { name: 'test', version: '1.0.0' },
        tools: [
          { name: 'tool1', description: 'Tool 1' },
          { name: 'tool2', description: 'Tool 2' },
        ],
        resources: [],
        prompts: [],
        transport: [{ type: 'stdio' }],
      };

      const server = new McpTestServer(spec);
      const tools = server.listTools();

      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('tool1');
    });
  });

  describe('resources', () => {
    it('should register and read a resource', async () => {
      const server = new McpTestServer();

      server.registerResource('user://{userId}', (uri: string) => {
        const userId = uri.replace('user://', '');
        return { userId, name: `User ${userId}` };
      });

      const result = await server.readResource('user://123');

      expect(result).toEqual({ userId: '123', name: 'User 123' });
    });

    it('should throw when reading unregistered resource', async () => {
      const server = new McpTestServer();

      await expect(server.readResource('unknown://test')).rejects.toThrow(
        'Resource not found: unknown://test'
      );
    });

    it('should match URI patterns', async () => {
      const server = new McpTestServer();

      server.registerResource('org://{orgId}/user://{userId}', (uri: string) => {
        return { uri };
      });

      const result = await server.readResource('org://abc/user://123');

      expect(result).toEqual({ uri: 'org://abc/user://123' });
    });

    it('should list resources from spec', () => {
      const spec: McpSpec = {
        version: '1.0',
        server: { name: 'test', version: '1.0.0' },
        tools: [],
        resources: [{ uri: 'user://{id}', name: 'User', mimeType: 'application/json' }],
        prompts: [],
        transport: [{ type: 'stdio' }],
      };

      const server = new McpTestServer(spec);
      const resources = server.listResources();

      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('user://{id}');
    });
  });

  describe('prompts', () => {
    it('should register and get a prompt', async () => {
      const server = new McpTestServer();

      server.registerPrompt('welcome', (args: { name: string }) => {
        return {
          messages: [{ role: 'user', content: `Welcome, ${args.name}!` }],
        };
      });

      const result = await server.getPrompt('welcome', { name: 'World' });

      expect(result.messages[0].content).toBe('Welcome, World!');
    });

    it('should throw when getting unregistered prompt', async () => {
      const server = new McpTestServer();

      await expect(server.getPrompt('unknown')).rejects.toThrow('Prompt not found: unknown');
    });

    it('should list prompts from spec', () => {
      const spec: McpSpec = {
        version: '1.0',
        server: { name: 'test', version: '1.0.0' },
        tools: [],
        resources: [],
        prompts: [{ name: 'greeting', description: 'Greeting prompt' }],
        transport: [{ type: 'stdio' }],
      };

      const server = new McpTestServer(spec);
      const prompts = server.listPrompts();

      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('greeting');
    });
  });
});

describe('createTestServer', () => {
  it('should create a test server', () => {
    const server = createTestServer();

    expect(server).toBeInstanceOf(McpTestServer);
  });

  it('should create a test server with spec', () => {
    const spec: McpSpec = {
      version: '1.0',
      server: { name: 'test', version: '1.0.0' },
      tools: [{ name: 'tool1', description: 'Tool 1' }],
      resources: [],
      prompts: [],
      transport: [{ type: 'stdio' }],
    };

    const server = createTestServer(spec);

    expect(server.listTools()).toHaveLength(1);
  });
});
