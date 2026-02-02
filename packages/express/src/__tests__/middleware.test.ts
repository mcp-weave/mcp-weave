import 'reflect-metadata';
import type { Server } from 'http';

import {
  McpServer,
  McpTool,
  McpResource,
  McpPrompt,
  McpInput,
  McpParam,
  McpPromptArg,
} from '@mcp-weave/nestjs';
import express, { type Express } from 'express';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createMcpMiddleware } from '../middleware.js';

@McpServer({
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server for middleware',
})
class TestServer {
  @McpTool({
    name: 'greet',
    description: 'Greets a user',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    },
  })
  greet(@McpInput() input: { name: string }) {
    return `Hello, ${input.name}!`;
  }

  @McpTool({
    name: 'add',
    description: 'Adds two numbers',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['a', 'b'],
    },
  })
  add(@McpInput() input: { a: number; b: number }) {
    return { result: input.a + input.b };
  }

  @McpResource({
    uri: 'config://settings',
    name: 'Settings',
    description: 'Application settings',
  })
  getSettings() {
    return {
      contents: [
        {
          uri: 'config://settings',
          mimeType: 'application/json',
          text: JSON.stringify({ theme: 'dark', language: 'en' }),
        },
      ],
    };
  }

  @McpResource({
    uri: 'user://{userId}',
    name: 'User',
    description: 'User by ID',
  })
  getUser(@McpParam('userId') userId: string) {
    return {
      contents: [
        {
          uri: `user://${userId}`,
          mimeType: 'application/json',
          text: JSON.stringify({ id: userId, name: 'Test User' }),
        },
      ],
    };
  }

  @McpPrompt({
    name: 'welcome',
    description: 'Welcome message',
    arguments: [{ name: 'username', description: 'User name', required: true }],
  })
  welcome(@McpPromptArg('username') username: string) {
    return {
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: `Welcome, ${username}!` },
        },
      ],
    };
  }
}

describe('createMcpMiddleware', () => {
  let app: Express;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/mcp', createMcpMiddleware(TestServer));

    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://localhost:${addr.port}/mcp`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => {
      server.close(() => resolve());
    });
  });

  describe('Health endpoint', () => {
    it('should return health status', async () => {
      const response = await fetch(`${baseUrl}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.server).toBe('test-server');
      expect(data.version).toBe('1.0.0');
    });
  });

  describe('Server info endpoint', () => {
    it('should return server info with capabilities', async () => {
      const response = await fetch(`${baseUrl}/`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.server).toBe('test-server');
      expect(data.version).toBe('1.0.0');
      expect(data.capabilities).toEqual({
        tools: 2,
        resources: 2,
        prompts: 1,
      });
    });
  });

  describe('Tools endpoints', () => {
    it('should list tools', async () => {
      const response = await fetch(`${baseUrl}/tools`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tools).toHaveLength(2);
      expect(data.tools[0].name).toBe('greet');
      expect(data.tools[1].name).toBe('add');
    });

    it('should call a tool that returns string', async () => {
      const response = await fetch(`${baseUrl}/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'greet', arguments: { name: 'World' } }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content[0].text).toBe('Hello, World!');
    });

    it('should call a tool that returns object', async () => {
      const response = await fetch(`${baseUrl}/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'add', arguments: { a: 5, b: 3 } }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(JSON.parse(data.content[0].text)).toEqual({ result: 8 });
    });

    it('should return 400 for missing tool name', async () => {
      const response = await fetch(`${baseUrl}/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arguments: { name: 'test' } }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for unknown tool', async () => {
      const response = await fetch(`${baseUrl}/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'unknown' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Resources endpoints', () => {
    it('should list resources', async () => {
      const response = await fetch(`${baseUrl}/resources`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.resources).toHaveLength(2);
    });

    it('should read a static resource', async () => {
      const response = await fetch(`${baseUrl}/resources/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: 'config://settings' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.contents).toBeDefined();
    });

    it('should read a parameterized resource', async () => {
      const response = await fetch(`${baseUrl}/resources/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: 'user://123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.contents[0].uri).toBe('user://123');
    });

    it('should return 404 for unknown resource', async () => {
      const response = await fetch(`${baseUrl}/resources/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: 'unknown://resource' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Prompts endpoints', () => {
    it('should list prompts', async () => {
      const response = await fetch(`${baseUrl}/prompts`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.prompts).toHaveLength(1);
      expect(data.prompts[0].name).toBe('welcome');
    });

    it('should get a prompt', async () => {
      const response = await fetch(`${baseUrl}/prompts/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'welcome', arguments: { username: 'Alice' } }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages[0].content.text).toBe('Welcome, Alice!');
    });

    it('should return 404 for unknown prompt', async () => {
      const response = await fetch(`${baseUrl}/prompts/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'unknown' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS request', async () => {
      const response = await fetch(`${baseUrl}/health`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
