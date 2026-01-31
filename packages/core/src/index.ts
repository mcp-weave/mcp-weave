// @mcp-weave/core
// Core functionality for MCP-Weave

import 'reflect-metadata';

// Spec
export * from './spec/types.js';
export * from './spec/parser.js';
export * from './spec/validator.js';

// Scanner
export * from './scanner/metadata.js';

// Generator
export * from './generator/server.js';

// Version
export const VERSION = '0.1.0';
