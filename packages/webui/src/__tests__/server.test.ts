import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { McpWebUI, McpWebUIOptions, ServerInfo, CallHistoryEntry } from '../server.js';

// Mock decorator function for testing
function McpServer(options: { name: string; version?: string; description?: string }) {
  return function (target: Function) {
    Reflect.defineMetadata('mcp:server', options, target);
  };
}

function McpTool(options: { name: string; description?: string; inputSchema?: Record<string, unknown> }) {
  return function (target: any, propertyKey: string) {
    const tools = Reflect.getMetadata('mcp:tools', target.constructor) ?? [];
    tools.push({ ...options, method: propertyKey });
    Reflect.defineMetadata('mcp:tools', tools, target.constructor);
  };
}

function McpResource(options: { uri: string; name: string; description?: string }) {
  return function (target: any, propertyKey: string) {
    const resources = Reflect.getMetadata('mcp:resources', target.constructor) ?? [];
    resources.push({ ...options, method: propertyKey });
    Reflect.defineMetadata('mcp:resources', resources, target.constructor);
  };
}

function McpPrompt(options: { name: string; description?: string; arguments?: Array<{ name: string; required?: boolean }> }) {
  return function (target: any, propertyKey: string) {
    const prompts = Reflect.getMetadata('mcp:prompts', target.constructor) ?? [];
    prompts.push({ ...options, method: propertyKey });
    Reflect.defineMetadata('mcp:prompts', prompts, target.constructor);
  };
}

// Test server class
@McpServer({ name: 'test-server', version: '1.0.0', description: 'Test server' })
class TestServer {
  @McpTool({ name: 'add', description: 'Add two numbers' })
  add(input: { a: number; b: number }) {
    return { result: input.a + input.b };
  }

  @McpTool({ name: 'greet', description: 'Greet someone' })
  greet(input: { name: string }) {
    return { message: `Hello, ${input.name}!` };
  }

  @McpResource({ uri: 'user://{id}', name: 'User', description: 'Get user by ID' })
  getUser(params: { id: string }) {
    return { id: params.id, name: 'Test User' };
  }

  @McpPrompt({ name: 'welcome', description: 'Welcome prompt', arguments: [{ name: 'name', required: true }] })
  welcome(args: { name: string }) {
    return { messages: [{ role: 'user', content: `Welcome, ${args.name}!` }] };
  }
}

// Non-decorated class for error testing
class PlainClass {
  doSomething() {
    return 'done';
  }
}

describe('McpWebUI', () => {
  let webui: McpWebUI;

  afterEach(async () => {
    if (webui) {
      await webui.stop();
    }
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      webui = new McpWebUI(TestServer);
      expect(webui).toBeInstanceOf(McpWebUI);
    });

    it('should create instance with custom options', () => {
      webui = new McpWebUI(TestServer, {
        port: 4000,
        host: '0.0.0.0',
        title: 'Custom Dashboard',
        theme: 'light',
        enableLogs: false,
      });
      expect(webui).toBeInstanceOf(McpWebUI);
    });

    it('should throw error for non-decorated class', () => {
      expect(() => new McpWebUI(PlainClass)).toThrow('not decorated with @McpServer');
    });
  });

  describe('start/stop', () => {
    it('should start server on specified port', async () => {
      webui = new McpWebUI(TestServer, { port: 0 }); // Port 0 = random available port
      await webui.start();
      const url = webui.getUrl();
      expect(url).toMatch(/^http:\/\/localhost:\d+$/);
    });

    it('should stop server gracefully', async () => {
      webui = new McpWebUI(TestServer, { port: 0 });
      await webui.start();
      await webui.stop();
      // Should not throw when stopping
    });

    it('should handle stop when not started', async () => {
      webui = new McpWebUI(TestServer);
      await webui.stop(); // Should not throw
    });
  });

  describe('getServerInfo', () => {
    it('should return null before start', () => {
      webui = new McpWebUI(TestServer);
      expect(webui.getServerInfo()).toBeNull();
    });

    it('should return server info after start', async () => {
      webui = new McpWebUI(TestServer, { port: 0 });
      await webui.start();
      const info = webui.getServerInfo();
      expect(info).not.toBeNull();
      expect(info?.name).toBe('test-server');
      expect(info?.version).toBe('1.0.0');
      expect(info?.tools).toHaveLength(2);
      expect(info?.resources).toHaveLength(1);
      expect(info?.prompts).toHaveLength(1);
    });
  });

  describe('getCallHistory', () => {
    it('should return empty array initially', async () => {
      webui = new McpWebUI(TestServer, { port: 0 });
      await webui.start();
      expect(webui.getCallHistory()).toEqual([]);
    });
  });

  describe('events', () => {
    it('should emit log events', async () => {
      webui = new McpWebUI(TestServer, { port: 0 });
      
      const logSpy = vi.fn();
      webui.on('log', logSpy);
      
      await webui.start();
      
      expect(logSpy).toHaveBeenCalled();
      expect(logSpy.mock.calls[0][0]).toMatch(/MCP Web UI started/);
    });
  });
});

describe('McpWebUIOptions', () => {
  it('should have correct default values', () => {
    const options: McpWebUIOptions = {};
    expect(options.port).toBeUndefined();
    expect(options.host).toBeUndefined();
    expect(options.title).toBeUndefined();
    expect(options.theme).toBeUndefined();
    expect(options.enableLogs).toBeUndefined();
  });

  it('should accept all optional properties', () => {
    const options: McpWebUIOptions = {
      port: 3000,
      host: 'localhost',
      title: 'Test Dashboard',
      theme: 'dark',
      enableLogs: true,
    };
    expect(options.port).toBe(3000);
    expect(options.host).toBe('localhost');
    expect(options.title).toBe('Test Dashboard');
    expect(options.theme).toBe('dark');
    expect(options.enableLogs).toBe(true);
  });
});

describe('ServerInfo', () => {
  it('should have correct structure', () => {
    const info: ServerInfo = {
      name: 'test',
      version: '1.0.0',
      description: 'Test server',
      tools: [
        { name: 'tool1', description: 'Tool 1', method: 'tool1Method' },
      ],
      resources: [
        { uri: 'res://{id}', name: 'Resource 1', method: 'res1Method' },
      ],
      prompts: [
        { name: 'prompt1', description: 'Prompt 1', method: 'prompt1Method', arguments: [] },
      ],
    };
    
    expect(info.name).toBe('test');
    expect(info.tools).toHaveLength(1);
    expect(info.resources).toHaveLength(1);
    expect(info.prompts).toHaveLength(1);
  });
});

describe('CallHistoryEntry', () => {
  it('should have correct structure', () => {
    const entry: CallHistoryEntry = {
      id: '123',
      type: 'tool',
      name: 'add',
      input: { a: 1, b: 2 },
      output: { result: 3 },
      timestamp: new Date(),
      duration: 10,
    };
    
    expect(entry.id).toBe('123');
    expect(entry.type).toBe('tool');
    expect(entry.name).toBe('add');
    expect(entry.duration).toBe(10);
  });

  it('should support error field', () => {
    const entry: CallHistoryEntry = {
      id: '456',
      type: 'resource',
      name: 'user://1',
      error: 'Not found',
      timestamp: new Date(),
      duration: 5,
    };
    
    expect(entry.error).toBe('Not found');
  });
});
