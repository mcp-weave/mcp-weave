import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { METADATA_KEYS } from '@mcp-weave/core';
import { McpServer } from '../../decorators/mcp-server.js';

describe('@McpServer', () => {
  it('should set server metadata on class', () => {
    @McpServer({
      name: 'test-server',
      version: '1.0.0',
      description: 'A test server',
    })
    class TestServer {}

    const metadata = Reflect.getMetadata(METADATA_KEYS.SERVER, TestServer);

    expect(metadata).toBeDefined();
    expect(metadata.name).toBe('test-server');
    expect(metadata.version).toBe('1.0.0');
    expect(metadata.description).toBe('A test server');
    expect(metadata.target).toBe(TestServer);
  });

  it('should use default version if not provided', () => {
    @McpServer({
      name: 'minimal-server',
    })
    class MinimalServer {}

    const metadata = Reflect.getMetadata(METADATA_KEYS.SERVER, MinimalServer);

    expect(metadata.version).toBe('1.0.0');
  });

  it('should handle undefined description', () => {
    @McpServer({
      name: 'no-desc-server',
      version: '2.0.0',
    })
    class NoDescServer {}

    const metadata = Reflect.getMetadata(METADATA_KEYS.SERVER, NoDescServer);

    expect(metadata.name).toBe('no-desc-server');
    expect(metadata.version).toBe('2.0.0');
    expect(metadata.description).toBeUndefined();
  });

  it('should work with class that has methods', () => {
    @McpServer({ name: 'method-server' })
    class ServerWithMethods {
      doSomething() {
        return 'done';
      }
    }

    const metadata = Reflect.getMetadata(METADATA_KEYS.SERVER, ServerWithMethods);
    const instance = new ServerWithMethods();

    expect(metadata.name).toBe('method-server');
    expect(instance.doSomething()).toBe('done');
  });
});
