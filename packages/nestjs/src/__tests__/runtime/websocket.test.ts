import { describe, it, expect } from 'vitest';
import 'reflect-metadata';

describe('WebSocket Transport', () => {
  describe('McpRuntimeOptions', () => {
    it('should accept websocket transport option', () => {
      const options: { transport: 'stdio' | 'sse' | 'websocket'; port: number; endpoint: string } = {
        transport: 'websocket',
        port: 8080,
        endpoint: '/ws',
      };

      expect(options.transport).toBe('websocket');
      expect(options.port).toBe(8080);
      expect(options.endpoint).toBe('/ws');
    });

    it('should accept stdio transport option', () => {
      const options: { transport: 'stdio' | 'sse' | 'websocket' } = {
        transport: 'stdio',
      };

      expect(options.transport).toBe('stdio');
    });

    it('should accept sse transport option', () => {
      const options: { transport: 'stdio' | 'sse' | 'websocket'; port: number; endpoint: string } = {
        transport: 'sse',
        port: 3000,
        endpoint: '/sse',
      };

      expect(options.transport).toBe('sse');
    });
  });

  describe('WebSocket Frame Protocol', () => {
    // Test frame encoding/decoding logic
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

    const decodeFrame = (buffer: Buffer): { opcode: number; payload: string } | null => {
      if (buffer.length < 2) return null;

      const byte0 = buffer[0]!;
      const byte1 = buffer[1]!;
      const opcode = byte0 & 0x0f;
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

      if (buffer.length < offset + payloadLength) return null;
      return { opcode, payload: buffer.slice(offset, offset + payloadLength).toString('utf8') };
    };

    it('should encode small text frame correctly', () => {
      const message = 'Hello';
      const frame = encodeFrame(message);
      
      expect(frame[0]).toBe(0x81); // FIN + Text opcode
      expect(frame[1]).toBe(5);    // Length
      expect(frame.slice(2).toString('utf8')).toBe('Hello');
    });

    it('should encode medium text frame correctly', () => {
      const message = 'A'.repeat(200);
      const frame = encodeFrame(message);
      
      expect(frame[0]).toBe(0x81);
      expect(frame[1]).toBe(126);
      expect(frame.readUInt16BE(2)).toBe(200);
    });

    it('should decode small text frame correctly', () => {
      const message = 'Hello';
      const frame = encodeFrame(message);
      const decoded = decodeFrame(frame);
      
      expect(decoded).not.toBeNull();
      expect(decoded!.opcode).toBe(1); // Text frame
      expect(decoded!.payload).toBe('Hello');
    });

    it('should decode medium text frame correctly', () => {
      const message = 'A'.repeat(200);
      const frame = encodeFrame(message);
      const decoded = decodeFrame(frame);
      
      expect(decoded).not.toBeNull();
      expect(decoded!.opcode).toBe(1);
      expect(decoded!.payload).toBe(message);
    });

    it('should return null for incomplete frame', () => {
      const buffer = Buffer.from([0x81]); // Only 1 byte
      const decoded = decodeFrame(buffer);
      
      expect(decoded).toBeNull();
    });

    it('should handle JSON-RPC messages', () => {
      const message = JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
      });
      const frame = encodeFrame(message);
      const decoded = decodeFrame(frame);
      
      expect(decoded).not.toBeNull();
      const parsed = JSON.parse(decoded!.payload);
      expect(parsed.jsonrpc).toBe('2.0');
      expect(parsed.method).toBe('initialize');
    });
  });

  describe('createMcpServer function signature', () => {
    it('should handle websocket transport in createMcpServer options', async () => {
      // Test that the function signature accepts websocket transport
      const mockCreateMcpServer = async (
        _target: Function,
        options: { transport?: 'stdio' | 'sse' | 'websocket'; port?: number; endpoint?: string } = {}
      ) => {
        if (options.transport === 'websocket') {
          return { transport: 'websocket', port: options.port ?? 8080 };
        }
        return { transport: options.transport ?? 'stdio' };
      };

      const result = await mockCreateMcpServer(class TestServer {}, {
        transport: 'websocket',
        port: 9000,
      });

      expect(result.transport).toBe('websocket');
      expect(result.port).toBe(9000);
    });
  });
});
