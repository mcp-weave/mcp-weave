import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'http';

import { describe, it, expect, vi } from 'vitest';

import {
  normalizeApiKeys,
  extractApiKey,
  validateApiKey,
  hashToken,
  generateRequestId,
  generateApiKey,
  createAuthMiddleware,
  type ApiKeyConfig,
  type AuthResult,
} from '../../auth/index.js';

describe('Authentication Module', () => {
  describe('normalizeApiKeys', () => {
    it('should return empty array for undefined', () => {
      expect(normalizeApiKeys(undefined)).toEqual([]);
    });

    it('should normalize a single string key', () => {
      const result = normalizeApiKeys('my-api-key');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('my-api-key');
      expect(result[0].name).toBe('default');
    });

    it('should normalize an array of string keys', () => {
      const result = normalizeApiKeys(['key1', 'key2', 'key3']);
      expect(result).toHaveLength(3);
      expect(result[0].key).toBe('key1');
      expect(result[0].name).toBe('key-1');
      expect(result[2].name).toBe('key-3');
    });

    it('should pass through ApiKeyConfig objects', () => {
      const configs: ApiKeyConfig[] = [
        { key: 'key1', name: 'Admin Key', scopes: ['admin'] },
        { key: 'key2', name: 'User Key' },
      ];
      const result = normalizeApiKeys(configs);
      expect(result).toEqual(configs);
    });
  });

  describe('extractApiKey', () => {
    it('should extract key from custom header', () => {
      const req = {
        headers: { 'x-api-key': 'test-key' },
        url: '/',
      } as unknown as IncomingMessage;

      expect(extractApiKey(req, 'x-api-key', 'api_key')).toBe('test-key');
    });

    it('should extract key from Authorization Bearer header', () => {
      const req = {
        headers: { authorization: 'Bearer my-token-123' },
        url: '/',
      } as unknown as IncomingMessage;

      expect(extractApiKey(req, 'x-api-key', 'api_key')).toBe('my-token-123');
    });

    it('should extract key from query parameter', () => {
      const req = {
        headers: {},
        url: '/path?api_key=query-key&other=value',
      } as unknown as IncomingMessage;

      expect(extractApiKey(req, 'x-api-key', 'api_key')).toBe('query-key');
    });

    it('should return undefined when no key is present', () => {
      const req = {
        headers: {},
        url: '/',
      } as unknown as IncomingMessage;

      expect(extractApiKey(req, 'x-api-key', 'api_key')).toBeUndefined();
    });

    it('should prioritize header over query parameter', () => {
      const req = {
        headers: { 'x-api-key': 'header-key' },
        url: '/path?api_key=query-key',
      } as unknown as IncomingMessage;

      expect(extractApiKey(req, 'x-api-key', 'api_key')).toBe('header-key');
    });
  });

  describe('validateApiKey', () => {
    const apiKeys: ApiKeyConfig[] = [
      { key: 'valid-key-1', name: 'Key 1', scopes: ['read'] },
      { key: 'valid-key-2', name: 'Key 2', scopes: ['read', 'write'], metadata: { userId: 123 } },
    ];

    it('should return error for undefined token', () => {
      const result = validateApiKey(undefined, apiKeys);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No API key provided');
    });

    it('should return error for invalid token', () => {
      const result = validateApiKey('invalid-key', apiKeys);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should return success for valid token', () => {
      const result = validateApiKey('valid-key-1', apiKeys);
      expect(result.success).toBe(true);
      expect(result.clientName).toBe('Key 1');
      expect(result.scopes).toEqual(['read']);
    });

    it('should include metadata from matched key', () => {
      const result = validateApiKey('valid-key-2', apiKeys);
      expect(result.success).toBe(true);
      expect(result.metadata).toEqual({ userId: 123 });
    });
  });

  describe('hashToken', () => {
    it('should hash short tokens completely', () => {
      expect(hashToken('short')).toBe('****');
      expect(hashToken('12345678')).toBe('****');
    });

    it('should show first 4 and last 4 chars for longer tokens', () => {
      expect(hashToken('abcdefghijklmnop')).toBe('abcd...mnop');
      expect(hashToken('my-super-secret-api-key')).toBe('my-s...-key');
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should start with req_ prefix', () => {
      const id = generateRequestId();
      expect(id.startsWith('req_')).toBe(true);
    });
  });

  describe('generateApiKey', () => {
    it('should generate key with default prefix', () => {
      const key = generateApiKey();
      expect(key.startsWith('mcp_')).toBe(true);
      expect(key.length).toBe(36); // 'mcp_' + 32 chars
    });

    it('should generate key with custom prefix', () => {
      const key = generateApiKey('myapp');
      expect(key.startsWith('myapp_')).toBe(true);
    });

    it('should generate unique keys', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateApiKey());
      }
      expect(keys.size).toBe(100);
    });
  });

  describe('createAuthMiddleware', () => {
    // Mock response object
    const createMockResponse = () => {
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      };
      return res as unknown as ServerResponse;
    };

    const createMockRequest = (
      headers: Record<string, string> = {},
      url = '/'
    ): IncomingMessage => {
      return {
        headers,
        url,
      } as unknown as IncomingMessage;
    };

    it('should allow request when auth is disabled', async () => {
      const middleware = createAuthMiddleware({ enabled: false });
      const req = createMockRequest();
      const res = createMockResponse();

      const result = await middleware(req, res);

      expect(result).not.toBeNull();
      expect(result?.auth.success).toBe(true);
      expect(result?.auth.clientId).toBe('anonymous');
    });

    it('should reject request without API key when auth is enabled', async () => {
      const middleware = createAuthMiddleware({
        enabled: true,
        apiKeys: ['valid-key'],
      });
      const req = createMockRequest();
      const res = createMockResponse();

      const result = await middleware(req, res);

      expect(result).toBeNull();
      expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    });

    it('should allow request with valid API key', async () => {
      const middleware = createAuthMiddleware({
        enabled: true,
        apiKeys: [{ key: 'valid-key', name: 'Test Key' }],
      });
      const req = createMockRequest({ 'x-api-key': 'valid-key' });
      const res = createMockResponse();

      const result = await middleware(req, res);

      expect(result).not.toBeNull();
      expect(result?.auth.success).toBe(true);
      expect(result?.auth.clientName).toBe('Test Key');
    });

    it('should call onAuthFailure callback', async () => {
      const onAuthFailure = vi.fn();
      const middleware = createAuthMiddleware({
        enabled: true,
        apiKeys: ['valid-key'],
        onAuthFailure,
      });
      const req = createMockRequest({ 'x-api-key': 'wrong-key' });
      const res = createMockResponse();

      await middleware(req, res);

      expect(onAuthFailure).toHaveBeenCalledWith(req, 'Invalid API key');
    });

    it('should call onAuthSuccess callback', async () => {
      const onAuthSuccess = vi.fn();
      const middleware = createAuthMiddleware({
        enabled: true,
        apiKeys: ['valid-key'],
        onAuthSuccess,
      });
      const req = createMockRequest({ 'x-api-key': 'valid-key' });
      const res = createMockResponse();

      await middleware(req, res);

      expect(onAuthSuccess).toHaveBeenCalled();
    });

    it('should use custom authenticate function', async () => {
      const customAuth = vi.fn().mockReturnValue({
        success: true,
        clientId: 'custom-client',
        clientName: 'Custom Auth',
      } as AuthResult);

      const middleware = createAuthMiddleware({
        enabled: true,
        authenticate: customAuth,
      });
      const req = createMockRequest({ 'x-api-key': 'any-key' });
      const res = createMockResponse();

      const result = await middleware(req, res);

      expect(customAuth).toHaveBeenCalledWith('any-key', req);
      expect(result?.auth.clientName).toBe('Custom Auth');
    });

    it('should handle async custom authenticate function', async () => {
      const customAuth = vi.fn().mockResolvedValue(true);

      const middleware = createAuthMiddleware({
        enabled: true,
        authenticate: customAuth,
      });
      const req = createMockRequest({ 'x-api-key': 'async-key' });
      const res = createMockResponse();

      const result = await middleware(req, res);

      expect(result?.auth.success).toBe(true);
    });

    it('should include requestId in authenticated request', async () => {
      const middleware = createAuthMiddleware({ enabled: false });
      const req = createMockRequest();
      const res = createMockResponse();

      const result = await middleware(req, res);

      expect(result?.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should include timestamp in authenticated request', async () => {
      const middleware = createAuthMiddleware({ enabled: false });
      const req = createMockRequest();
      const res = createMockResponse();

      const beforeTime = new Date();
      const result = await middleware(req, res);
      const afterTime = new Date();

      expect(result?.timestamp).toBeInstanceOf(Date);
      expect(result?.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result?.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});
