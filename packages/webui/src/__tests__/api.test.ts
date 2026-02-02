import 'reflect-metadata';
import * as http from 'http';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { McpWebUI } from '../server.js';

// Use the real METADATA_KEYS
const METADATA_KEYS = {
  SERVER: 'mcp:server',
  TOOLS: 'mcp:tools',
  RESOURCES: 'mcp:resources',
  PROMPTS: 'mcp:prompts',
  PARAMS: 'mcp:params',
};

// Create decorated test class with proper metadata
class ApiTestServer {
  calculate(input: { a: number; b: number; op: string }) {
    switch (input.op) {
      case 'add':
        return { result: input.a + input.b };
      case 'sub':
        return { result: input.a - input.b };
      default:
        throw new Error(`Unknown operation: ${input.op}`);
    }
  }

  getData(params: { key: string }) {
    if (params.key === 'error') {
      throw new Error('Resource not found');
    }
    return { key: params.key, value: `Value for ${params.key}` };
  }

  greet(args: { name: string }) {
    return { messages: [{ role: 'assistant', content: `Hello, ${args.name}!` }] };
  }
}

// Apply metadata manually (simulating decorators)
Reflect.defineMetadata(
  METADATA_KEYS.SERVER,
  {
    name: 'api-test-server',
    version: '1.0.0',
    target: ApiTestServer,
  },
  ApiTestServer
);

Reflect.defineMetadata(
  METADATA_KEYS.TOOLS,
  [
    {
      name: 'calculate',
      description: 'Calculate',
      propertyKey: 'calculate',
      target: ApiTestServer,
    },
  ],
  ApiTestServer
);

Reflect.defineMetadata(
  METADATA_KEYS.RESOURCES,
  [
    {
      uri: 'data://{key}',
      name: 'Data',
      mimeType: 'application/json',
      propertyKey: 'getData',
      target: ApiTestServer,
    },
  ],
  ApiTestServer
);

Reflect.defineMetadata(
  METADATA_KEYS.PROMPTS,
  [
    {
      name: 'greet',
      description: 'Greet',
      arguments: [{ name: 'name', required: true }],
      propertyKey: 'greet',
      target: ApiTestServer,
    },
  ],
  ApiTestServer
);

// Helper to make HTTP requests
function httpRequest(
  options: http.RequestOptions,
  body?: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: data })
      );
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('McpWebUI HTTP API', () => {
  let webui: McpWebUI;
  let port: number;

  beforeEach(async () => {
    webui = new McpWebUI(ApiTestServer, { port: 0 });
    await webui.start();
    // Extract port from URL - format is http://localhost:PORT
    const url = webui.getUrl();
    const match = url.match(/:(\d+)$/);
    port = match ? parseInt(match[1], 10) : 0;
  });

  afterEach(async () => {
    await webui.stop();
  });

  describe('GET /', () => {
    it('should serve dashboard HTML', async () => {
      const res = await httpRequest({
        hostname: 'localhost',
        port,
        path: '/',
        method: 'GET',
      });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('text/html');
      expect(res.body).toContain('<!DOCTYPE html>');
      expect(res.body).toContain('MCP Server Dashboard');
    });
  });

  describe('GET /api/info', () => {
    it('should return server info', async () => {
      const res = await httpRequest({
        hostname: 'localhost',
        port,
        path: '/api/info',
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.name).toBe('api-test-server');
      expect(data.version).toBe('1.0.0');
      expect(data.tools).toHaveLength(1);
      expect(data.resources).toHaveLength(1);
      expect(data.prompts).toHaveLength(1);
    });
  });

  describe('GET /api/tools', () => {
    it('should return tools list', async () => {
      const res = await httpRequest({
        hostname: 'localhost',
        port,
        path: '/api/tools',
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const tools = JSON.parse(res.body);
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('calculate');
    });
  });

  describe('GET /api/resources', () => {
    it('should return resources list', async () => {
      const res = await httpRequest({
        hostname: 'localhost',
        port,
        path: '/api/resources',
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const resources = JSON.parse(res.body);
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('data://{key}');
    });
  });

  describe('GET /api/prompts', () => {
    it('should return prompts list', async () => {
      const res = await httpRequest({
        hostname: 'localhost',
        port,
        path: '/api/prompts',
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const prompts = JSON.parse(res.body);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('greet');
    });
  });

  describe('POST /api/call-tool', () => {
    it('should call tool and return result', async () => {
      const res = await httpRequest(
        {
          hostname: 'localhost',
          port,
          path: '/api/call-tool',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        JSON.stringify({ name: 'calculate', input: { a: 5, b: 3, op: 'add' } })
      );

      expect(res.status).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(true);
      expect(data.result.result).toBe(8);
    });

    it('should handle tool error', async () => {
      const res = await httpRequest(
        {
          hostname: 'localhost',
          port,
          path: '/api/call-tool',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        JSON.stringify({ name: 'calculate', input: { a: 1, b: 2, op: 'unknown' } })
      );

      expect(res.status).toBe(500);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unknown operation');
    });

    it('should return 404 for unknown tool', async () => {
      const res = await httpRequest(
        {
          hostname: 'localhost',
          port,
          path: '/api/call-tool',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        JSON.stringify({ name: 'nonexistent', input: {} })
      );

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid JSON', async () => {
      const res = await httpRequest(
        {
          hostname: 'localhost',
          port,
          path: '/api/call-tool',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        'invalid json'
      );

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/read-resource', () => {
    it('should read resource and return result', async () => {
      const res = await httpRequest(
        {
          hostname: 'localhost',
          port,
          path: '/api/read-resource',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        JSON.stringify({ uri: 'data://test-key' })
      );

      expect(res.status).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(true);
      expect(data.result.key).toBe('test-key');
    });

    it('should handle resource error', async () => {
      const res = await httpRequest(
        {
          hostname: 'localhost',
          port,
          path: '/api/read-resource',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        JSON.stringify({ uri: 'data://error' })
      );

      expect(res.status).toBe(500);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return 404 for non-matching URI', async () => {
      const res = await httpRequest(
        {
          hostname: 'localhost',
          port,
          path: '/api/read-resource',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        JSON.stringify({ uri: 'other://something' })
      );

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/get-prompt', () => {
    it('should get prompt and return result', async () => {
      const res = await httpRequest(
        {
          hostname: 'localhost',
          port,
          path: '/api/get-prompt',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        JSON.stringify({ name: 'greet', args: { name: 'Alice' } })
      );

      expect(res.status).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(true);
      expect(data.result.messages[0].content).toContain('Alice');
    });

    it('should return 404 for unknown prompt', async () => {
      const res = await httpRequest(
        {
          hostname: 'localhost',
          port,
          path: '/api/get-prompt',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        JSON.stringify({ name: 'unknown', args: {} })
      );

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/history', () => {
    it('should return call history', async () => {
      // First make a tool call
      await httpRequest(
        {
          hostname: 'localhost',
          port,
          path: '/api/call-tool',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        JSON.stringify({ name: 'calculate', input: { a: 1, b: 2, op: 'add' } })
      );

      // Then get history
      const res = await httpRequest({
        hostname: 'localhost',
        port,
        path: '/api/history',
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const history = JSON.parse(res.body);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].type).toBe('tool');
      expect(history[0].name).toBe('calculate');
    });
  });

  describe('GET /api/logs', () => {
    it('should return server logs', async () => {
      const res = await httpRequest({
        hostname: 'localhost',
        port,
        path: '/api/logs',
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const logs = JSON.parse(res.body);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('OPTIONS (CORS)', () => {
    it('should handle CORS preflight', async () => {
      const res = await httpRequest({
        hostname: 'localhost',
        port,
        path: '/api/call-tool',
        method: 'OPTIONS',
      });

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await httpRequest({
        hostname: 'localhost',
        port,
        path: '/api/unknown',
        method: 'GET',
      });

      expect(res.status).toBe(404);
    });
  });
});
