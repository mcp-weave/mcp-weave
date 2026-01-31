import { describe, it, expect } from 'vitest';
import { generateServer, type GeneratorOptions } from '../../generator/server.js';
import type { McpSpec } from '../../spec/types.js';

describe('generateServer', () => {
  const baseSpec: McpSpec = {
    version: '1.0',
    server: {
      name: 'test-server',
      version: '1.0.0',
      description: 'A test server',
    },
    tools: [],
    resources: [],
    prompts: [],
    transport: [{ type: 'stdio' }],
  };

  const defaultOptions: GeneratorOptions = {
    outputDir: './output',
  };

  it('should generate server.ts and index.ts for minimal spec', () => {
    const files = generateServer(baseSpec, defaultOptions);

    expect(files).toHaveLength(2);
    expect(files.map(f => f.path)).toContain('./output/server.ts');
    expect(files.map(f => f.path)).toContain('./output/index.ts');
  });

  it('should include server name and version in generated code', () => {
    const files = generateServer(baseSpec, defaultOptions);
    const serverFile = files.find(f => f.path.endsWith('server.ts'));

    expect(serverFile).toBeDefined();
    expect(serverFile?.content).toContain("name: 'test-server'");
    expect(serverFile?.content).toContain("version: '1.0.0'");
  });

  it('should generate tools.ts when tools exist', () => {
    const specWithTools: McpSpec = {
      ...baseSpec,
      tools: [
        {
          name: 'create_user',
          description: 'Creates a new user',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      ],
    };

    const files = generateServer(specWithTools, defaultOptions);

    expect(files.map(f => f.path)).toContain('./output/tools.ts');

    const toolsFile = files.find(f => f.path.endsWith('tools.ts'));
    expect(toolsFile?.content).toContain("'create_user'");
    expect(toolsFile?.content).toContain('Creates a new user');
    expect(toolsFile?.content).toContain('tools/call');
    expect(toolsFile?.content).toContain('tools/list');
  });

  it('should generate resources.ts when resources exist', () => {
    const specWithResources: McpSpec = {
      ...baseSpec,
      resources: [
        {
          uri: 'user://{userId}',
          name: 'User Profile',
          description: 'Get user by ID',
          mimeType: 'application/json',
        },
      ],
    };

    const files = generateServer(specWithResources, defaultOptions);

    expect(files.map(f => f.path)).toContain('./output/resources.ts');

    const resourcesFile = files.find(f => f.path.endsWith('resources.ts'));
    expect(resourcesFile?.content).toContain("'user://{userId}'");
    expect(resourcesFile?.content).toContain('User Profile');
    expect(resourcesFile?.content).toContain('resources/list');
    expect(resourcesFile?.content).toContain('resources/read');
  });

  it('should generate prompts.ts when prompts exist', () => {
    const specWithPrompts: McpSpec = {
      ...baseSpec,
      prompts: [
        {
          name: 'welcome',
          description: 'Generate welcome message',
          arguments: [{ name: 'userName', required: true }],
        },
      ],
    };

    const files = generateServer(specWithPrompts, defaultOptions);

    expect(files.map(f => f.path)).toContain('./output/prompts.ts');

    const promptsFile = files.find(f => f.path.endsWith('prompts.ts'));
    expect(promptsFile?.content).toContain("'welcome'");
    expect(promptsFile?.content).toContain('Generate welcome message');
    expect(promptsFile?.content).toContain('prompts/list');
    expect(promptsFile?.content).toContain('prompts/get');
  });

  it('should generate all files for complete spec', () => {
    const completeSpec: McpSpec = {
      ...baseSpec,
      tools: [{ name: 'tool1', description: 'Tool 1' }],
      resources: [{ uri: 'res://1', name: 'Resource 1', mimeType: 'text/plain' }],
      prompts: [{ name: 'prompt1', description: 'Prompt 1' }],
    };

    const files = generateServer(completeSpec, defaultOptions);

    expect(files).toHaveLength(5);
    expect(files.map(f => f.path)).toEqual([
      './output/server.ts',
      './output/tools.ts',
      './output/resources.ts',
      './output/prompts.ts',
      './output/index.ts',
    ]);
  });

  it('should use custom output directory', () => {
    const options: GeneratorOptions = {
      outputDir: '/custom/path',
    };

    const files = generateServer(baseSpec, options);

    expect(files[0].path).toBe('/custom/path/server.ts');
  });

  it('should include MCP SDK imports in server.ts', () => {
    const files = generateServer(baseSpec, defaultOptions);
    const serverFile = files.find(f => f.path.endsWith('server.ts'));

    expect(serverFile?.content).toContain("import { Server } from '@modelcontextprotocol/sdk");
    expect(serverFile?.content).toContain("import { StdioServerTransport }");
  });

  it('should set capabilities based on spec content', () => {
    const specWithTools: McpSpec = {
      ...baseSpec,
      tools: [{ name: 'tool1', description: 'Tool 1' }],
    };

    const files = generateServer(specWithTools, defaultOptions);
    const serverFile = files.find(f => f.path.endsWith('server.ts'));

    expect(serverFile?.content).toContain('tools: {}');
    expect(serverFile?.content).toContain('resources: undefined');
    expect(serverFile?.content).toContain('prompts: undefined');
  });

  it('should generate index.ts with correct imports', () => {
    const completeSpec: McpSpec = {
      ...baseSpec,
      tools: [{ name: 'tool1', description: 'Tool 1' }],
      resources: [{ uri: 'res://1', name: 'Resource 1', mimeType: 'text/plain' }],
    };

    const files = generateServer(completeSpec, defaultOptions);
    const indexFile = files.find(f => f.path.endsWith('index.ts'));

    expect(indexFile?.content).toContain("import './server.js'");
    expect(indexFile?.content).toContain("import './tools.js'");
    expect(indexFile?.content).toContain("import './resources.js'");
    expect(indexFile?.content).toContain('startServer()');
  });

  it('should include TODO comments in generated handlers', () => {
    const specWithTools: McpSpec = {
      ...baseSpec,
      tools: [{ name: 'my_tool', description: 'My tool' }],
    };

    const files = generateServer(specWithTools, defaultOptions);
    const toolsFile = files.find(f => f.path.endsWith('tools.ts'));

    expect(toolsFile?.content).toContain('TODO: Implement my_tool logic');
  });

  it('should include header comment in generated files', () => {
    const files = generateServer(baseSpec, defaultOptions);

    for (const file of files) {
      expect(file.content).toContain('Generated by MCP-Weave');
    }
  });

  it('should handle empty inputSchema', () => {
    const specWithTools: McpSpec = {
      ...baseSpec,
      tools: [{ name: 'simple_tool', description: 'A simple tool' }],
    };

    const files = generateServer(specWithTools, defaultOptions);
    const toolsFile = files.find(f => f.path.endsWith('tools.ts'));

    expect(toolsFile?.content).toContain('inputSchema:');
    expect(toolsFile?.content).toContain('"type":"object"');
  });
});
