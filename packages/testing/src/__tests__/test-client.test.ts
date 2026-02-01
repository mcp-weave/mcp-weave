import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import 'reflect-metadata';
import { McpTestClient, createTestClient } from '../test-client.js';

// Mock decorators to simulate @mcp-weave/nestjs behavior
function McpServer(_options: { name: string; version?: string }) {
  return function (target: Function) {
    Reflect.defineMetadata('mcp:server', _options, target);
  };
}

function McpTool(options: { name: string; description?: string }) {
  return function (target: object, propertyKey: string | symbol) {
    const tools = Reflect.getMetadata('mcp:tools', target.constructor) ?? [];
    tools.push({ ...options, propertyKey });
    Reflect.defineMetadata('mcp:tools', tools, target.constructor);
  };
}

function McpResource(options: { uri: string; name?: string; description?: string }) {
  return function (target: object, propertyKey: string | symbol) {
    const resources = Reflect.getMetadata('mcp:resources', target.constructor) ?? [];
    resources.push({ ...options, propertyKey });
    Reflect.defineMetadata('mcp:resources', resources, target.constructor);
  };
}

function McpPrompt(options: { name: string; description?: string }) {
  return function (target: object, propertyKey: string | symbol) {
    const prompts = Reflect.getMetadata('mcp:prompts', target.constructor) ?? [];
    prompts.push({ ...options, propertyKey });
    Reflect.defineMetadata('mcp:prompts', prompts, target.constructor);
  };
}

function McpInput() {
  return function (target: object, propertyKey: string | symbol, parameterIndex: number) {
    const params = Reflect.getMetadata('mcp:params', target.constructor) ?? [];
    params.push({ propertyKey, parameterIndex, type: 'input' });
    Reflect.defineMetadata('mcp:params', params, target.constructor);
  };
}

function McpParam(name: string) {
  return function (target: object, propertyKey: string | symbol, parameterIndex: number) {
    const params = Reflect.getMetadata('mcp:params', target.constructor) ?? [];
    params.push({ propertyKey, parameterIndex, type: 'param', name });
    Reflect.defineMetadata('mcp:params', params, target.constructor);
  };
}

function McpPromptArg(name: string) {
  return function (target: object, propertyKey: string | symbol, parameterIndex: number) {
    const params = Reflect.getMetadata('mcp:params', target.constructor) ?? [];
    params.push({ propertyKey, parameterIndex, type: 'promptArg', name });
    Reflect.defineMetadata('mcp:params', params, target.constructor);
  };
}

// Test server class
@McpServer({ name: 'test-server', version: '1.0.0' })
class TestServer {
  private data: Map<string, { name: string }> = new Map([
    ['1', { name: 'Alice' }],
    ['2', { name: 'Bob' }],
  ]);

  @McpTool({ name: 'echo', description: 'Echo the input' })
  echo(@McpInput() input: { message: string }) {
    return { echo: input.message };
  }

  @McpTool({ name: 'add', description: 'Add two numbers' })
  add(@McpInput() input: { a: number; b: number }) {
    return { result: input.a + input.b };
  }

  @McpResource({ uri: 'data://list', name: 'Data List' })
  listData() {
    return {
      contents: [
        {
          uri: 'data://list',
          mimeType: 'application/json',
          text: JSON.stringify(Array.from(this.data.values())),
        },
      ],
    };
  }

  @McpResource({ uri: 'data://{id}', name: 'Data Item' })
  getDataItem(@McpParam('id') id: string) {
    const item = this.data.get(id);
    return {
      contents: [
        {
          uri: `data://${id}`,
          mimeType: 'application/json',
          text: JSON.stringify(item ?? { error: 'Not found' }),
        },
      ],
    };
  }

  @McpPrompt({ name: 'greet', description: 'Generate a greeting' })
  greet(@McpPromptArg('name') name: string) {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Hello, ${name}!`,
          },
        },
      ],
    };
  }
}

describe('McpTestClient', () => {
  let client: McpTestClient;

  beforeEach(() => {
    client = new McpTestClient(TestServer);
  });

  describe('constructor', () => {
    it('should create a client from a server class', () => {
      expect(client).toBeInstanceOf(McpTestClient);
    });
  });

  describe('listTools', () => {
    it('should list all tools', () => {
      const tools = client.listTools();
      expect(tools).toHaveLength(2);
      expect(tools).toContainEqual({ name: 'echo', description: 'Echo the input' });
      expect(tools).toContainEqual({ name: 'add', description: 'Add two numbers' });
    });
  });

  describe('listResources', () => {
    it('should list all resources', () => {
      const resources = client.listResources();
      expect(resources).toHaveLength(2);
      expect(resources).toContainEqual({ uri: 'data://list', name: 'Data List', description: undefined });
      expect(resources).toContainEqual({ uri: 'data://{id}', name: 'Data Item', description: undefined });
    });
  });

  describe('listPrompts', () => {
    it('should list all prompts', () => {
      const prompts = client.listPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts).toContainEqual({ name: 'greet', description: 'Generate a greeting' });
    });
  });

  describe('hasTool', () => {
    it('should return true for existing tool', () => {
      expect(client.hasTool('echo')).toBe(true);
      expect(client.hasTool('add')).toBe(true);
    });

    it('should return false for non-existing tool', () => {
      expect(client.hasTool('nonexistent')).toBe(false);
    });
  });

  describe('hasResource', () => {
    it('should return true for existing resource pattern', () => {
      expect(client.hasResource('data://list')).toBe(true);
      expect(client.hasResource('data://{id}')).toBe(true);
    });

    it('should return true for URI matching a pattern', () => {
      expect(client.hasResource('data://123')).toBe(true);
    });

    it('should return false for non-matching resource', () => {
      expect(client.hasResource('other://list')).toBe(false);
    });
  });

  describe('hasPrompt', () => {
    it('should return true for existing prompt', () => {
      expect(client.hasPrompt('greet')).toBe(true);
    });

    it('should return false for non-existing prompt', () => {
      expect(client.hasPrompt('nonexistent')).toBe(false);
    });
  });

  describe('callTool', () => {
    it('should call echo tool', async () => {
      const result = await client.callTool('echo', { message: 'Hello' });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual({ echo: 'Hello' });
    });

    it('should call add tool', async () => {
      const result = await client.callTool('add', { a: 5, b: 3 });
      expect(result.content).toHaveLength(1);
      expect(JSON.parse(result.content[0].text)).toEqual({ result: 8 });
    });

    it('should throw error for non-existing tool', async () => {
      await expect(client.callTool('nonexistent', {})).rejects.toThrow(
        "Tool 'nonexistent' not found"
      );
    });
  });

  describe('readResource', () => {
    it('should read static resource', async () => {
      const result = await client.readResource('data://list');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('data://list');
      expect(JSON.parse(result.contents[0].text)).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
    });

    it('should read parameterized resource', async () => {
      const result = await client.readResource('data://1');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('data://1');
      expect(JSON.parse(result.contents[0].text)).toEqual({ name: 'Alice' });
    });

    it('should throw error for non-existing resource', async () => {
      await expect(client.readResource('other://test')).rejects.toThrow(
        "Resource 'other://test' not found"
      );
    });
  });

  describe('getPrompt', () => {
    it('should get prompt with arguments', async () => {
      const result = await client.getPrompt('greet', { name: 'World' });
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.text).toBe('Hello, World!');
    });

    it('should throw error for non-existing prompt', async () => {
      await expect(client.getPrompt('nonexistent', {})).rejects.toThrow(
        "Prompt 'nonexistent' not found"
      );
    });
  });

  describe('getInstance', () => {
    it('should return the server instance', () => {
      const instance = client.getInstance<TestServer>();
      expect(instance).toBeInstanceOf(TestServer);
    });
  });
});

describe('createTestClient', () => {
  it('should create a test client', () => {
    const client = createTestClient(TestServer);
    expect(client).toBeInstanceOf(McpTestClient);
  });
});
