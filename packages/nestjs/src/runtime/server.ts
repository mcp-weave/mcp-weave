import crypto from 'crypto';
import {
  createServer,
  type Server as HttpServer,
  type IncomingMessage,
  type ServerResponse,
} from 'http';

import { Server, StdioServerTransport, SSEServerTransport, AnyObjectSchema } from './sdk-compat.js';
import {
  type McpAuthOptions,
  createAuthMiddleware,
  extractApiKey,
  validateApiKey,
  normalizeApiKeys,
} from '../auth/index.js';
import { extractMetadata } from '../metadata/storage.js';

/**
 * Options for MCP runtime server
 */
export interface McpRuntimeOptions {
  /**
   * Transport type: 'stdio' (default), 'sse', or 'websocket'
   */
  transport?: 'stdio' | 'sse' | 'websocket';

  /**
   * Port for SSE/WebSocket transport (default: 3000)
   */
  port?: number;

  /**
   * Endpoint path for SSE/WebSocket (default: '/sse' or '/ws')
   */
  endpoint?: string;

  /**
   * Authentication options
   */
  auth?: McpAuthOptions;
}

/**
 * Runtime MCP server that wraps a decorated class
 */
export class McpRuntimeServer {
  private server: Server;
  private instance: unknown;
  private metadata;
  private authOptions: McpAuthOptions;
  private authMiddleware: ReturnType<typeof createAuthMiddleware>;

  constructor(target: Function, options: McpRuntimeOptions = {}) {
    this.metadata = extractMetadata(target);

    if (!this.metadata.server) {
      throw new Error(`Class ${target.name} is not decorated with @McpServer`);
    }

    // Setup auth
    this.authOptions = options.auth ?? {};
    this.authMiddleware = createAuthMiddleware(this.authOptions);

    this.server = new Server(
      {
        name: this.metadata.server.name,
        version: this.metadata.server.version ?? '1.0.0',
      },
      {
        capabilities: {
          tools: this.metadata.tools.length > 0 ? {} : undefined,
          resources: this.metadata.resources.length > 0 ? {} : undefined,
          prompts: this.metadata.prompts.length > 0 ? {} : undefined,
        },
      }
    );

    // Create instance of the target class
    this.instance = new (target as unknown as { new (): unknown })();

    this.setupHandlers();
  }

  private setupHandlers() {
    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
  }

  private setupToolHandlers() {
    const tools = this.metadata.tools;
    if (tools.length === 0) return;

    // List tools
    this.server.setRequestHandler(
      { method: 'tools/list' } as unknown as AnyObjectSchema,
      async () => ({
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema ?? { type: 'object' as const, properties: {} },
        })),
      })
    );

    // Call tool
    this.server.setRequestHandler(
      { method: 'tools/call' } as unknown as AnyObjectSchema,
      async (request: Record<string, unknown>) => {
        if (!request || typeof request !== 'object') throw new Error('Invalid request');
        const params = (request as { params?: Record<string, unknown> }).params;
        if (!params || typeof params !== 'object') throw new Error('Invalid params');
        const toolName = params.name as string;
        const tool = tools.find(t => t.name === toolName);
        if (!tool) {
          throw new Error(`Unknown tool: ${toolName}`);
        }
        const method = Reflect.get(this.instance as object, tool.propertyKey);
        if (typeof method !== 'function') {
          throw new Error(`Method ${String(tool.propertyKey)} not found`);
        }
        const args = this.resolveToolArgs(
          tool.propertyKey,
          (params.arguments ?? {}) as Record<string, unknown>
        );
        const result = await method.apply(this.instance as object, args);
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result),
            },
          ],
        };
      }
    );
  }

  private setupResourceHandlers() {
    const resources = this.metadata.resources;
    if (resources.length === 0) return;

    // List resources
    this.server.setRequestHandler(
      { method: 'resources/list' } as unknown as AnyObjectSchema,
      async () => ({
        resources: resources.map(resource => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        })),
      })
    );

    // Read resource
    this.server.setRequestHandler(
      { method: 'resources/read' } as unknown as AnyObjectSchema,
      async (request: Record<string, unknown>) => {
        if (!request || typeof request !== 'object') throw new Error('Invalid request');
        const params = (request as { params?: Record<string, unknown> }).params;
        if (!params || typeof params !== 'object') throw new Error('Invalid params');
        const uri = params.uri as string;
        // Find matching resource
        for (const resource of resources) {
          const uriParams = this.extractUriParams(resource.uri, uri);
          if (uriParams) {
            const method = Reflect.get(this.instance as object, resource.propertyKey);
            if (typeof method !== 'function') {
              throw new Error(`Method ${String(resource.propertyKey)} not found`);
            }
            const args = this.resolveResourceArgs(resource.propertyKey, uriParams);
            return await method.apply(this.instance as object, args);
          }
        }
        throw new Error(`Resource not found: ${uri}`);
      }
    );
  }

  private setupPromptHandlers() {
    const prompts = this.metadata.prompts;
    if (prompts.length === 0) return;

    // List prompts
    this.server.setRequestHandler(
      { method: 'prompts/list' } as unknown as AnyObjectSchema,
      async () => ({
        prompts: prompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments ?? [],
        })),
      })
    );

    // Get prompt
    this.server.setRequestHandler(
      { method: 'prompts/get' } as unknown as AnyObjectSchema,
      async (request: Record<string, unknown>) => {
        if (!request || typeof request !== 'object') throw new Error('Invalid request');
        const params = (request as { params?: Record<string, unknown> }).params;
        if (!params || typeof params !== 'object') throw new Error('Invalid params');
        const promptName = params.name as string;
        const prompt = prompts.find(p => p.name === promptName);
        if (!prompt) {
          throw new Error(`Unknown prompt: ${promptName}`);
        }
        const method = Reflect.get(this.instance as object, prompt.propertyKey);
        if (typeof method !== 'function') {
          throw new Error(`Method ${String(prompt.propertyKey)} not found`);
        }
        const args = this.resolvePromptArgs(
          prompt.propertyKey,
          (params.arguments ?? {}) as Record<string, unknown>
        );
        return await method.apply(this.instance as object, args);
      }
    );
  }

  private resolveToolArgs(propertyKey: string | symbol, input: Record<string, unknown>): unknown[] {
    const params = this.metadata.params.filter(
      p => p.propertyKey === propertyKey && p.type === 'input'
    );

    if (params.length === 0) {
      return [input];
    }

    const args: unknown[] = [];
    for (const param of params) {
      args[param.parameterIndex] = input;
    }
    return args;
  }

  private resolveResourceArgs(
    propertyKey: string | symbol,
    uriParams: Record<string, string>
  ): unknown[] {
    const params = this.metadata.params.filter(
      p => p.propertyKey === propertyKey && p.type === 'param'
    );

    const args: unknown[] = [];
    for (const param of params) {
      if (param.name) {
        args[param.parameterIndex] = uriParams[param.name];
      }
    }
    return args;
  }

  private resolvePromptArgs(
    propertyKey: string | symbol,
    promptArgs: Record<string, unknown>
  ): unknown[] {
    const params = this.metadata.params.filter(
      p => p.propertyKey === propertyKey && p.type === 'promptArg'
    );

    const args: unknown[] = [];
    for (const param of params) {
      if (param.name) {
        args[param.parameterIndex] = promptArgs[param.name];
      }
    }
    return args;
  }

  private extractUriParams(template: string, uri: string): Record<string, string> | null {
    // Convert template to regex: user://{userId} -> user://([^/]+)
    const paramNames: string[] = [];
    const regexStr = template.replace(/\{(\w+)\}/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${regexStr}$`);
    const match = uri.match(regex);

    if (!match) return null;

    const params: Record<string, string> = {};
    paramNames.forEach((name, index) => {
      params[name] = match[index + 1] ?? '';
    });

    return params;
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`MCP server '${this.metadata.server?.name}' started on stdio`);
  }

  /**
   * Start the MCP server with SSE transport
   */
  async startSSE(options: { port?: number; endpoint?: string } = {}): Promise<HttpServer> {
    const port = options.port ?? 3000;
    const endpoint = options.endpoint ?? '/sse';

    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // Handle CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Authenticate request
      const authResult = await this.authMiddleware(req, res);
      if (!authResult) return; // Auth failed, response already sent

      const url = new URL(req.url ?? '/', `http://localhost:${port}`);

      // Log authenticated request
      if (this.authOptions.enabled) {
        console.error(
          `[${authResult.requestId}] ${authResult.auth.clientName ?? authResult.auth.clientId} - ${req.method} ${url.pathname}`
        );
      }

      // SSE endpoint
      if (url.pathname === endpoint && req.method === 'GET') {
        const transport = new SSEServerTransport(endpoint, res);
        await this.server.connect(transport);
        return;
      }

      // Message endpoint (POST to /sse/message or similar)
      if (url.pathname === `${endpoint}/message` && req.method === 'POST') {
        // Handle message posting for SSE
        let _body = '';
        req.on('data', chunk => {
          _body += chunk.toString();
        });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ received: true }));
        });
        return;
      }

      // Health check
      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            server: this.metadata.server?.name,
            version: this.metadata.server?.version,
          })
        );
        return;
      }

      // 404 for other routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    return new Promise((resolve, reject) => {
      httpServer.on('error', reject);
      httpServer.listen(port, () => {
        console.error(
          `MCP server '${this.metadata.server?.name}' started on http://localhost:${port}${endpoint}`
        );
        resolve(httpServer);
      });
    });
  }

  /**
   * Get the underlying MCP server instance
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Start the MCP server with WebSocket transport
   */
  async startWebSocket(options: { port?: number; endpoint?: string } = {}): Promise<HttpServer> {
    const port = options.port ?? 8080;
    const endpoint = options.endpoint ?? '/ws';

    // Create HTTP server for WebSocket upgrade
    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // Handle CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Upgrade, Connection, Authorization, X-Api-Key'
      );

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Health check (no auth required)
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            server: this.metadata.server?.name,
            version: this.metadata.server?.version,
            transport: 'websocket',
            authEnabled: this.authOptions.enabled ?? false,
          })
        );
        return;
      }

      // Authenticate for other endpoints
      const authResult = await this.authMiddleware(req, res);
      if (!authResult) return;

      // Info endpoint
      if (req.url === '/' || req.url?.startsWith('/?')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            name: this.metadata.server?.name,
            version: this.metadata.server?.version,
            websocket: `ws://localhost:${port}${endpoint}`,
            tools: this.metadata.tools.length,
            resources: this.metadata.resources.length,
            prompts: this.metadata.prompts.length,
            client: authResult.auth.clientName,
            requestId: authResult.requestId,
          })
        );
        return;
      }
      res.writeHead(426, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'Upgrade Required',
          message: `Connect via WebSocket at ${endpoint}`,
        })
      );
    });

    // Handle WebSocket upgrade manually
    httpServer.on('upgrade', async (req: IncomingMessage, socket, _head) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);

      if (url.pathname !== endpoint) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      // Authenticate WebSocket connection
      if (this.authOptions.enabled) {
        const apiKeys = normalizeApiKeys(this.authOptions.apiKeys);
        const token = extractApiKey(
          req,
          this.authOptions.headerName,
          this.authOptions.queryParamName
        );
        const authResult = validateApiKey(token, apiKeys);

        if (!authResult.success) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          this.authOptions.onAuthFailure?.(req, authResult.error ?? 'Auth failed');
          return;
        }

        console.error(
          `[WebSocket] Client connected: ${authResult.clientName ?? authResult.clientId}`
        );
      }

      // Accept WebSocket connection
      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      // Generate accept key
      const acceptKey = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');

      // Send handshake response
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
          '\r\n'
      );

      // Create a simple WebSocket message handler
      const sessions = new Map<string, { send: (data: string) => void }>();
      const sessionId = crypto.randomUUID();

      // WebSocket frame encoding
      const encodeFrame = (data: string): Buffer => {
        const payload = Buffer.from(data, 'utf8');
        const length = payload.length;
        let frame: Buffer;

        if (length < 126) {
          frame = Buffer.alloc(2 + length);
          frame[0] = 0x81; // Text frame, FIN bit set
          frame[1] = length;
          payload.copy(frame, 2);
        } else if (length < 65536) {
          frame = Buffer.alloc(4 + length);
          frame[0] = 0x81;
          frame[1] = 126;
          frame.writeUInt16BE(length, 2);
          payload.copy(frame, 4);
        } else {
          frame = Buffer.alloc(10 + length);
          frame[0] = 0x81;
          frame[1] = 127;
          frame.writeBigUInt64BE(BigInt(length), 2);
          payload.copy(frame, 10);
        }
        return frame;
      };

      // WebSocket frame decoding
      const decodeFrame = (buffer: Buffer): { opcode: number; payload: string } | null => {
        if (buffer.length < 2) return null;

        const byte0 = buffer[0]!;
        const byte1 = buffer[1]!;
        const opcode = byte0 & 0x0f;
        const masked = (byte1 & 0x80) !== 0;
        let payloadLength = byte1 & 0x7f;
        let offset = 2;

        if (payloadLength === 126) {
          if (buffer.length < 4) return null;
          payloadLength = buffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLength === 127) {
          if (buffer.length < 10) return null;
          payloadLength = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }

        if (masked) {
          if (buffer.length < offset + 4 + payloadLength) return null;
          const mask = buffer.slice(offset, offset + 4);
          offset += 4;
          const payload = buffer.slice(offset, offset + payloadLength);
          for (let i = 0; i < payload.length; i++) {
            const maskByte = mask[i % 4] ?? 0;
            payload[i] = (payload[i] ?? 0) ^ maskByte;
          }
          return { opcode, payload: payload.toString('utf8') };
        } else {
          if (buffer.length < offset + payloadLength) return null;
          return { opcode, payload: buffer.slice(offset, offset + payloadLength).toString('utf8') };
        }
      };

      // Send function
      const send = (data: string) => {
        try {
          socket.write(encodeFrame(data));
        } catch {
          // Connection closed
        }
      };

      sessions.set(sessionId, { send });

      // Send welcome message
      send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'connection/established',
          params: { sessionId, server: this.metadata.server?.name },
        })
      );

      // Handle incoming messages
      let messageBuffer = Buffer.alloc(0);

      socket.on('data', async (chunk: Buffer) => {
        messageBuffer = Buffer.concat([messageBuffer, chunk]);

        while (messageBuffer.length > 0) {
          const frame = decodeFrame(messageBuffer);
          if (!frame) break;

          // Calculate frame size to remove from buffer
          let frameSize = 2;
          const byte1 = messageBuffer[1] ?? 0;
          const payloadLength = byte1 & 0x7f;
          if (payloadLength === 126) frameSize = 4;
          else if (payloadLength === 127) frameSize = 10;
          if ((byte1 & 0x80) !== 0) frameSize += 4;
          frameSize += frame.payload.length;
          messageBuffer = messageBuffer.slice(frameSize);

          if (frame.opcode === 0x08) {
            // Close frame
            socket.end();
            return;
          }

          if (frame.opcode === 0x09) {
            // Ping - send pong
            socket.write(Buffer.from([0x8a, 0x00]));
            continue;
          }

          if (frame.opcode === 0x01) {
            // Text frame - handle JSON-RPC
            try {
              const message = JSON.parse(frame.payload);
              const response = await this.handleWebSocketMessage(message);
              if (response) {
                send(JSON.stringify(response));
              }
            } catch (error) {
              send(
                JSON.stringify({
                  jsonrpc: '2.0',
                  error: { code: -32700, message: 'Parse error' },
                  id: null,
                })
              );
            }
          }
        }
      });

      socket.on('close', () => {
        sessions.delete(sessionId);
      });

      socket.on('error', () => {
        sessions.delete(sessionId);
      });
    });

    return new Promise((resolve, reject) => {
      httpServer.on('error', reject);
      httpServer.listen(port, () => {
        console.error(
          `MCP server '${this.metadata.server?.name}' started on ws://localhost:${port}${endpoint}`
        );
        resolve(httpServer);
      });
    });
  }

  /**
   * Handle WebSocket JSON-RPC messages
   */
  private async handleWebSocketMessage(message: unknown): Promise<unknown> {
    if (!message || typeof message !== 'object') {
      return { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: null };
    }

    const req = message as { jsonrpc?: string; method?: string; params?: unknown; id?: unknown };

    if (req.jsonrpc !== '2.0' || !req.method) {
      return {
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
        id: req.id ?? null,
      };
    }

    try {
      let result: unknown;

      switch (req.method) {
        case 'initialize':
          result = {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: this.metadata.server?.name,
              version: this.metadata.server?.version ?? '1.0.0',
            },
            capabilities: {
              tools: this.metadata.tools.length > 0 ? {} : undefined,
              resources: this.metadata.resources.length > 0 ? {} : undefined,
              prompts: this.metadata.prompts.length > 0 ? {} : undefined,
            },
          };
          break;

        case 'tools/list':
          result = {
            tools: this.metadata.tools.map(t => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
            })),
          };
          break;

        case 'tools/call': {
          const toolParams = req.params as { name: string; arguments?: Record<string, unknown> };
          const tool = this.metadata.tools.find(t => t.name === toolParams.name);
          if (!tool) {
            return {
              jsonrpc: '2.0',
              error: { code: -32602, message: `Unknown tool: ${toolParams.name}` },
              id: req.id,
            };
          }
          const method = Reflect.get(this.instance as object, tool.propertyKey);
          const toolResult = await method.apply(this.instance, [toolParams.arguments ?? {}]);
          result = {
            content: [
              {
                type: 'text',
                text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
              },
            ],
          };
          break;
        }

        case 'resources/list':
          result = {
            resources: this.metadata.resources.map(r => ({
              uri: r.uri,
              name: r.name,
              description: r.description,
              mimeType: r.mimeType,
            })),
          };
          break;

        case 'resources/read': {
          const resParams = req.params as { uri: string };
          for (const resource of this.metadata.resources) {
            const uriParams = this.extractUriParams(resource.uri, resParams.uri);
            if (uriParams) {
              const resMethod = Reflect.get(this.instance as object, resource.propertyKey);
              const args = this.resolveResourceArgs(resource.propertyKey, uriParams);
              result = await resMethod.apply(this.instance, args);
              break;
            }
          }
          if (!result) {
            return {
              jsonrpc: '2.0',
              error: { code: -32602, message: `Resource not found: ${resParams.uri}` },
              id: req.id,
            };
          }
          break;
        }

        case 'prompts/list':
          result = {
            prompts: this.metadata.prompts.map(p => ({
              name: p.name,
              description: p.description,
              arguments: p.arguments ?? [],
            })),
          };
          break;

        case 'prompts/get': {
          const promptParams = req.params as { name: string; arguments?: Record<string, unknown> };
          const prompt = this.metadata.prompts.find(p => p.name === promptParams.name);
          if (!prompt) {
            return {
              jsonrpc: '2.0',
              error: { code: -32602, message: `Unknown prompt: ${promptParams.name}` },
              id: req.id,
            };
          }
          const promptMethod = Reflect.get(this.instance as object, prompt.propertyKey);
          const promptArgs = this.resolvePromptArgs(
            prompt.propertyKey,
            promptParams.arguments ?? {}
          );
          result = await promptMethod.apply(this.instance, promptArgs);
          break;
        }

        default:
          return {
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${req.method}` },
            id: req.id,
          };
      }

      return { jsonrpc: '2.0', result, id: req.id };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: { code: -32000, message: error instanceof Error ? error.message : 'Internal error' },
        id: req.id,
      };
    }
  }
}

/**
 * Create and start an MCP server from a decorated class
 *
 * @example
 * // Stdio transport (default)
 * await createMcpServer(MyServer);
 *
 * @example
 * // SSE transport
 * await createMcpServer(MyServer, { transport: 'sse', port: 3000 });
 *
 * @example
 * // WebSocket transport
 * await createMcpServer(MyServer, { transport: 'websocket', port: 8080 });
 */
export async function createMcpServer(
  target: Function,
  options: McpRuntimeOptions = {}
): Promise<McpRuntimeServer> {
  const server = new McpRuntimeServer(target, options);

  if (options.transport === 'sse') {
    await server.startSSE({ port: options.port, endpoint: options.endpoint });
  } else if (options.transport === 'websocket') {
    await server.startWebSocket({ port: options.port, endpoint: options.endpoint });
  } else {
    await server.start();
  }

  return server;
}
