import 'reflect-metadata';
import { describe, it, expect, afterEach } from 'vitest';
import { McpExpressServer } from '../server.js';
import { McpServer, McpTool, McpInput } from '@mcp-weave/nestjs';

@McpServer({
  name: 'express-test-server',
  version: '1.0.0',
})
class TestServer {
  @McpTool({
    name: 'echo',
    description: 'Echo input',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
  })
  echo(@McpInput() input: { message: string }) {
    return input.message;
  }
}

describe('McpExpressServer', () => {
  let server: McpExpressServer;

  afterEach(async () => {
    if (server) {
      try {
        await server.stop();
      } catch {
        // Ignore errors if server wasn't started
      }
    }
  });

  it('should create a server instance', () => {
    server = new McpExpressServer(TestServer);
    expect(server).toBeInstanceOf(McpExpressServer);
  });

  it('should start and respond to requests', async () => {
    server = new McpExpressServer(TestServer, { port: 0 });
    await server.start();

    const app = server.getApp();
    expect(app).toBeDefined();
  });

  it('should accept custom options', () => {
    server = new McpExpressServer(TestServer, {
      port: 4000,
      basePath: '/api/mcp',
      cors: true,
      corsOrigin: 'http://localhost:3000',
    });

    expect(server).toBeInstanceOf(McpExpressServer);
  });

  it('should stop gracefully', async () => {
    server = new McpExpressServer(TestServer, { port: 0 });
    await server.start();
    await expect(server.stop()).resolves.toBeUndefined();
  });

  it('should return the Express app', () => {
    server = new McpExpressServer(TestServer);
    const app = server.getApp();
    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
  });
});
