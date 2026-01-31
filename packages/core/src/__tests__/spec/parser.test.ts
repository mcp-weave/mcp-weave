import { describe, it, expect } from 'vitest';
import { parseSpec, stringifySpec, parseAndValidateSpec } from '../../spec/parser.js';

describe('parseSpec', () => {
  it('should parse valid YAML', () => {
    const yaml = `
server:
  name: test-server
  version: "1.0.0"
`;
    const result = parseSpec(yaml);
    expect(result).toEqual({
      server: {
        name: 'test-server',
        version: '1.0.0',
      },
    });
  });

  it('should parse YAML with tools', () => {
    const yaml = `
server:
  name: test-server
tools:
  - name: my_tool
    description: A test tool
`;
    const result = parseSpec(yaml) as Record<string, unknown>;
    expect(result.server).toEqual({ name: 'test-server' });
    expect(result.tools).toHaveLength(1);
  });

  it('should throw on invalid YAML', () => {
    const invalidYaml = `
server:
  name: test
  invalid: [unclosed
`;
    expect(() => parseSpec(invalidYaml)).toThrow('Failed to parse YAML');
  });

  it('should handle empty YAML', () => {
    const result = parseSpec('');
    expect(result).toBeNull();
  });
});

describe('stringifySpec', () => {
  it('should stringify spec to YAML', () => {
    const spec = {
      version: '1.0',
      server: {
        name: 'test-server',
        version: '1.0.0',
      },
      tools: [],
      resources: [],
      prompts: [],
      transport: [{ type: 'stdio' as const }],
    };

    const result = stringifySpec(spec);
    expect(result).toContain('server:');
    expect(result).toContain('name: test-server');
    expect(result).toContain('version: 1.0.0');
  });

  it('should stringify spec with tools', () => {
    const spec = {
      version: '1.0',
      server: {
        name: 'test-server',
        version: '1.0.0',
      },
      tools: [
        {
          name: 'create_user',
          description: 'Creates a user',
        },
      ],
      resources: [],
      prompts: [],
      transport: [{ type: 'stdio' as const }],
    };

    const result = stringifySpec(spec);
    expect(result).toContain('tools:');
    expect(result).toContain('name: create_user');
    expect(result).toContain('description: Creates a user');
  });
});

describe('parseAndValidateSpec', () => {
  it('should parse and validate a complete spec', async () => {
    const yaml = `
version: "1.0"
server:
  name: test-server
  version: "1.0.0"
  description: A test server
tools:
  - name: my_tool
    description: A test tool
    inputSchema:
      type: object
      properties:
        name:
          type: string
resources:
  - uri: "user://{userId}"
    name: User Profile
    mimeType: application/json
prompts:
  - name: greeting
    description: Generate a greeting
    arguments:
      - name: userName
        required: true
`;
    const result = await parseAndValidateSpec(yaml);

    expect(result.version).toBe('1.0');
    expect(result.server.name).toBe('test-server');
    expect(result.server.version).toBe('1.0.0');
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe('my_tool');
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].uri).toBe('user://{userId}');
    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0].name).toBe('greeting');
  });

  it('should apply defaults for optional fields', async () => {
    const yaml = `
server:
  name: minimal-server
`;
    const result = await parseAndValidateSpec(yaml);

    expect(result.version).toBe('1.0');
    expect(result.server.version).toBe('1.0.0');
    expect(result.tools).toEqual([]);
    expect(result.resources).toEqual([]);
    expect(result.prompts).toEqual([]);
    expect(result.transport).toEqual([{ type: 'stdio' }]);
  });

  it('should throw on invalid spec', async () => {
    const yaml = `
server:
  version: "1.0.0"
`;
    // Missing required 'name' field
    await expect(parseAndValidateSpec(yaml)).rejects.toThrow();
  });
});
