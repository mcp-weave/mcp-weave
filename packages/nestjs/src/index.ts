// @mcp-weave/nestjs
// NestJS integration for MCP-Weave

import 'reflect-metadata';

// Decorators
export * from './decorators/mcp-server.js';
export * from './decorators/mcp-tool.js';
export * from './decorators/mcp-resource.js';
export * from './decorators/mcp-prompt.js';
export * from './decorators/params.js';

// Metadata
export * from './metadata/storage.js';

// Runtime
export * from './runtime/server.js';

// Version
export const VERSION = '0.1.0';
