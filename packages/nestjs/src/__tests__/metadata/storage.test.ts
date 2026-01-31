import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { METADATA_KEYS } from '@mcp-weave/core';
import {
  isMcpServer,
  getMcpServers,
  getServerMetadata,
  getToolsMetadata,
  getResourcesMetadata,
  getPromptsMetadata,
  getParamsMetadata,
  extractMetadata,
} from '../../metadata/storage.js';
import { McpServer } from '../../decorators/mcp-server.js';
import { McpTool } from '../../decorators/mcp-tool.js';
import { McpResource } from '../../decorators/mcp-resource.js';
import { McpPrompt } from '../../decorators/mcp-prompt.js';
import { McpInput, McpParam, McpPromptArg } from '../../decorators/params.js';

describe('isMcpServer', () => {
  it('should return true for decorated class', () => {
    @McpServer({ name: 'test' })
    class TestServer {}

    expect(isMcpServer(TestServer)).toBe(true);
  });

  it('should return false for plain class', () => {
    class PlainClass {}

    expect(isMcpServer(PlainClass)).toBe(false);
  });
});

describe('getMcpServers', () => {
  it('should filter MCP servers from array', () => {
    @McpServer({ name: 'server1' })
    class Server1 {}

    class PlainClass {}

    @McpServer({ name: 'server2' })
    class Server2 {}

    const servers = getMcpServers([Server1, PlainClass, Server2]);

    expect(servers).toHaveLength(2);
    expect(servers).toContain(Server1);
    expect(servers).toContain(Server2);
    expect(servers).not.toContain(PlainClass);
  });

  it('should return empty array if no servers', () => {
    class Plain1 {}
    class Plain2 {}

    const servers = getMcpServers([Plain1, Plain2]);

    expect(servers).toEqual([]);
  });
});

describe('getServerMetadata', () => {
  it('should return server metadata', () => {
    @McpServer({ name: 'test-server', version: '1.0.0' })
    class TestServer {}

    const metadata = getServerMetadata(TestServer);

    expect(metadata).toBeDefined();
    expect(metadata?.name).toBe('test-server');
    expect(metadata?.version).toBe('1.0.0');
  });

  it('should return undefined for plain class', () => {
    class PlainClass {}

    const metadata = getServerMetadata(PlainClass);

    expect(metadata).toBeUndefined();
  });
});

describe('getToolsMetadata', () => {
  it('should return tools metadata', () => {
    class TestServer {
      @McpTool({ name: 'tool1', description: 'Tool 1' })
      tool1() {}

      @McpTool({ name: 'tool2', description: 'Tool 2' })
      tool2() {}
    }

    const tools = getToolsMetadata(TestServer);

    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('tool1');
    expect(tools[1].name).toBe('tool2');
  });

  it('should return empty array for class without tools', () => {
    class PlainClass {}

    const tools = getToolsMetadata(PlainClass);

    expect(tools).toEqual([]);
  });
});

describe('getResourcesMetadata', () => {
  it('should return resources metadata', () => {
    class TestServer {
      @McpResource({ uri: 'res://1', name: 'Resource 1' })
      resource1() {}
    }

    const resources = getResourcesMetadata(TestServer);

    expect(resources).toHaveLength(1);
    expect(resources[0].uri).toBe('res://1');
  });

  it('should return empty array for class without resources', () => {
    class PlainClass {}

    expect(getResourcesMetadata(PlainClass)).toEqual([]);
  });
});

describe('getPromptsMetadata', () => {
  it('should return prompts metadata', () => {
    class TestServer {
      @McpPrompt({ name: 'prompt1', description: 'Prompt 1' })
      prompt1() {}
    }

    const prompts = getPromptsMetadata(TestServer);

    expect(prompts).toHaveLength(1);
    expect(prompts[0].name).toBe('prompt1');
  });

  it('should return empty array for class without prompts', () => {
    class PlainClass {}

    expect(getPromptsMetadata(PlainClass)).toEqual([]);
  });
});

describe('getParamsMetadata', () => {
  it('should return params metadata', () => {
    class TestServer {
      method(@McpInput() _input: unknown, @McpParam('id') _id: string) {}
    }

    const params = getParamsMetadata(TestServer);

    expect(params).toHaveLength(2);
    // Parameter decorators are processed in reverse order
    const inputParam = params.find(p => p.type === 'input');
    const paramParam = params.find(p => p.type === 'param');
    expect(inputParam).toBeDefined();
    expect(paramParam).toBeDefined();
  });

  it('should return empty array for class without params', () => {
    class PlainClass {}

    expect(getParamsMetadata(PlainClass)).toEqual([]);
  });
});

describe('extractMetadata (integration)', () => {
  it('should extract all metadata from fully decorated class', () => {
    @McpServer({
      name: 'full-server',
      version: '2.0.0',
      description: 'A complete server',
    })
    class FullServer {
      @McpTool({ name: 'create_user', description: 'Create user' })
      createUser(@McpInput() _input: unknown) {
        return {};
      }

      @McpResource({ uri: 'user://{id}', name: 'User' })
      getUser(@McpParam('id') _id: string) {
        return {};
      }

      @McpPrompt({ name: 'welcome', description: 'Welcome' })
      welcome(@McpPromptArg('name') _name: string) {
        return {};
      }
    }

    const metadata = extractMetadata(FullServer);

    expect(metadata.server).toBeDefined();
    expect(metadata.server?.name).toBe('full-server');
    expect(metadata.tools).toHaveLength(1);
    expect(metadata.resources).toHaveLength(1);
    expect(metadata.prompts).toHaveLength(1);
    expect(metadata.params).toHaveLength(3);
  });
});
