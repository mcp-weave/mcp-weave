/**
 * @mcp-weave/nestjs - Authentication Module
 * Provides API key authentication and request tracking
 */

import type { IncomingMessage, ServerResponse } from 'http';

/**
 * API Key configuration
 */
export interface ApiKeyConfig {
  /** The API key value */
  key: string;
  /** Human-readable name for the key (for logging) */
  name?: string;
  /** Optional metadata associated with this key */
  metadata?: Record<string, unknown>;
  /** Scopes/permissions for this key */
  scopes?: string[];
}

/**
 * Authentication options for MCP servers
 */
export interface McpAuthOptions {
  /**
   * Enable authentication (default: false)
   */
  enabled?: boolean;

  /**
   * API keys allowed to access the server
   * Can be a single key string, array of keys, or array of ApiKeyConfig objects
   */
  apiKeys?: string | string[] | ApiKeyConfig[];

  /**
   * Header name for the API key (default: 'x-api-key')
   */
  headerName?: string;

  /**
   * Query parameter name for the API key (default: 'api_key')
   */
  queryParamName?: string;

  /**
   * Custom authentication function
   * Return true to allow, false to deny, or an AuthResult object
   */
  authenticate?: (
    token: string | undefined,
    request: IncomingMessage
  ) => boolean | AuthResult | Promise<boolean | AuthResult>;

  /**
   * Called when authentication fails
   */
  onAuthFailure?: (request: IncomingMessage, reason: string) => void;

  /**
   * Called when authentication succeeds
   */
  onAuthSuccess?: (request: IncomingMessage, result: AuthResult) => void;
}

/**
 * Result of authentication
 */
export interface AuthResult {
  /** Whether authentication succeeded */
  success: boolean;
  /** Client identifier (for tracking) */
  clientId?: string;
  /** Client name (for logging) */
  clientName?: string;
  /** Scopes/permissions granted */
  scopes?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Error message if authentication failed */
  error?: string;
}

/**
 * Request context with authentication info
 */
export interface AuthenticatedRequest {
  /** The original request */
  request: IncomingMessage;
  /** Authentication result */
  auth: AuthResult;
  /** Request ID for tracking */
  requestId: string;
  /** Timestamp of the request */
  timestamp: Date;
}

/**
 * Normalize API keys configuration to ApiKeyConfig array
 */
export function normalizeApiKeys(
  keys: string | string[] | ApiKeyConfig[] | undefined
): ApiKeyConfig[] {
  if (!keys) return [];

  if (typeof keys === 'string') {
    return [{ key: keys, name: 'default' }];
  }

  return keys.map((k, index) => {
    if (typeof k === 'string') {
      return { key: k, name: `key-${index + 1}` };
    }
    return k;
  });
}

/**
 * Extract API key from request
 */
export function extractApiKey(
  req: IncomingMessage,
  headerName: string = 'x-api-key',
  queryParamName: string = 'api_key'
): string | undefined {
  // Check header first
  const headerKey = req.headers[headerName.toLowerCase()];
  if (headerKey) {
    return Array.isArray(headerKey) ? headerKey[0] : headerKey;
  }

  // Check Authorization header (Bearer token)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check query parameter
  const url = req.url ?? '';
  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    const searchParams = new URLSearchParams(url.slice(queryIndex + 1));
    const queryKey = searchParams.get(queryParamName);
    if (queryKey) return queryKey;
  }

  return undefined;
}

/**
 * Validate API key against configured keys
 */
export function validateApiKey(token: string | undefined, apiKeys: ApiKeyConfig[]): AuthResult {
  if (!token) {
    return {
      success: false,
      error: 'No API key provided',
    };
  }

  const matchedKey = apiKeys.find(k => k.key === token);

  if (!matchedKey) {
    return {
      success: false,
      error: 'Invalid API key',
    };
  }

  return {
    success: true,
    clientId: hashToken(token),
    clientName: matchedKey.name,
    scopes: matchedKey.scopes,
    metadata: matchedKey.metadata,
  };
}

/**
 * Hash a token for safe logging (shows first 4 and last 4 chars)
 */
export function hashToken(token: string): string {
  if (token.length <= 8) {
    return '****';
  }
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an authentication middleware for HTTP requests
 */
export function createAuthMiddleware(options: McpAuthOptions = {}) {
  const {
    enabled = false,
    apiKeys,
    headerName = 'x-api-key',
    queryParamName = 'api_key',
    authenticate,
    onAuthFailure,
    onAuthSuccess,
  } = options;

  const normalizedKeys = normalizeApiKeys(apiKeys);

  return async (
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<AuthenticatedRequest | null> => {
    const requestId = generateRequestId();
    const timestamp = new Date();

    // If auth is disabled, return a default context
    if (!enabled) {
      return {
        request: req,
        auth: { success: true, clientId: 'anonymous' },
        requestId,
        timestamp,
      };
    }

    const token = extractApiKey(req, headerName, queryParamName);
    let result: AuthResult;

    // Use custom authenticate function if provided
    if (authenticate) {
      const authResult = await authenticate(token, req);
      if (typeof authResult === 'boolean') {
        result = {
          success: authResult,
          clientId: authResult ? hashToken(token ?? 'unknown') : undefined,
          error: authResult ? undefined : 'Authentication failed',
        };
      } else {
        result = authResult;
      }
    } else {
      // Use built-in API key validation
      result = validateApiKey(token, normalizedKeys);
    }

    if (!result.success) {
      onAuthFailure?.(req, result.error ?? 'Unknown error');

      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'Unauthorized',
          message: result.error ?? 'Authentication required',
          requestId,
        })
      );
      return null;
    }

    const authRequest: AuthenticatedRequest = {
      request: req,
      auth: result,
      requestId,
      timestamp,
    };

    onAuthSuccess?.(req, result);

    return authRequest;
  };
}

/**
 * Send unauthorized response
 */
export function sendUnauthorized(
  res: ServerResponse,
  message: string = 'Unauthorized',
  requestId?: string
): void {
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      error: 'Unauthorized',
      message,
      requestId,
    })
  );
}

/**
 * Generate a random API key
 */
export function generateApiKey(prefix: string = 'mcp'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}_${key}`;
}
