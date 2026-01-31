import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  METADATA_KEYS,
  extractMetadata,
  metadataToSpec,
  type ScannedMetadata,
} from '../../scanner/metadata.js';

describe('METADATA_KEYS', () => {
  it('should have all required keys', () => {
    expect(METADATA_KEYS.SERVER).toBe('mcp:server');
    expect(METADATA_KEYS.TOOLS).toBe('mcp:tools');
    expect(METADATA_KEYS.RESOURCES).toBe('mcp:resources');
    expect(METADATA_KEYS.PROMPTS).toBe('mcp:prompts');
    expect(METADATA_KEYS.PARAMS).toBe('mcp:params');
  });
});

describe('extractMetadata', () => {
  it('should return empty metadata for undecorated class', () => {
    class PlainClass {}

    const metadata = extractMetadata(PlainClass);

    expect(metadata.server).toBeUndefined();
    expect(metadata.tools).toEqual([]);
    expect(metadata.resources).toEqual([]);
    expect(metadata.prompts).toEqual([]);
    expect(metadata.params).toEqual([]);
  });

  it('should extract server metadata', () => {
    class TestServer {}

    Reflect.defineMetadata(
      METADATA_KEYS.SERVER,
      {
        name: 'test-server',
        version: '1.0.0',
        description: 'A test server',
        target: TestServer,
      },
      TestServer
    );

    const metadata = extractMetadata(TestServer);

    expect(metadata.server).toBeDefined();
    expect(metadata.server?.name).toBe('test-server');
    expect(metadata.server?.version).toBe('1.0.0');
    expect(metadata.server?.description).toBe('A test server');
  });

  it('should extract tools metadata', () => {
    class TestServer {}

    Reflect.defineMetadata(
      METADATA_KEYS.TOOLS,
      [
        {
          name: 'create_user',
          description: 'Creates a user',
          propertyKey: 'createUser',
          target: TestServer,
        },
        {
          name: 'delete_user',
          description: 'Deletes a user',
          propertyKey: 'deleteUser',
          target: TestServer,
        },
      ],
      TestServer
    );

    const metadata = extractMetadata(TestServer);

    expect(metadata.tools).toHaveLength(2);
    expect(metadata.tools[0].name).toBe('create_user');
    expect(metadata.tools[1].name).toBe('delete_user');
  });

  it('should extract resources metadata', () => {
    class TestServer {}

    Reflect.defineMetadata(
      METADATA_KEYS.RESOURCES,
      [
        {
          uri: 'user://{userId}',
          name: 'User Profile',
          mimeType: 'application/json',
          propertyKey: 'getUser',
          target: TestServer,
        },
      ],
      TestServer
    );

    const metadata = extractMetadata(TestServer);

    expect(metadata.resources).toHaveLength(1);
    expect(metadata.resources[0].uri).toBe('user://{userId}');
    expect(metadata.resources[0].mimeType).toBe('application/json');
  });

  it('should extract prompts metadata', () => {
    class TestServer {}

    Reflect.defineMetadata(
      METADATA_KEYS.PROMPTS,
      [
        {
          name: 'welcome',
          description: 'Welcome message',
          arguments: [{ name: 'userName', required: true }],
          propertyKey: 'generateWelcome',
          target: TestServer,
        },
      ],
      TestServer
    );

    const metadata = extractMetadata(TestServer);

    expect(metadata.prompts).toHaveLength(1);
    expect(metadata.prompts[0].name).toBe('welcome');
    expect(metadata.prompts[0].arguments).toHaveLength(1);
  });

  it('should extract params metadata', () => {
    class TestServer {}

    Reflect.defineMetadata(
      METADATA_KEYS.PARAMS,
      [
        {
          type: 'input',
          parameterIndex: 0,
          propertyKey: 'createUser',
          target: TestServer,
        },
        {
          type: 'param',
          name: 'userId',
          parameterIndex: 0,
          propertyKey: 'getUser',
          target: TestServer,
        },
      ],
      TestServer
    );

    const metadata = extractMetadata(TestServer);

    expect(metadata.params).toHaveLength(2);
    expect(metadata.params[0].type).toBe('input');
    expect(metadata.params[1].type).toBe('param');
    expect(metadata.params[1].name).toBe('userId');
  });
});

describe('metadataToSpec', () => {
  let baseMetadata: ScannedMetadata;

  beforeEach(() => {
    baseMetadata = {
      server: {
        name: 'test-server',
        version: '1.0.0',
        description: 'A test server',
        target: class {},
      },
      tools: [],
      resources: [],
      prompts: [],
      params: [],
    };
  });

  it('should throw if no server metadata', () => {
    const metadata: ScannedMetadata = {
      tools: [],
      resources: [],
      prompts: [],
      params: [],
    };

    expect(() => metadataToSpec(metadata)).toThrow('No @McpServer decorator found');
  });

  it('should convert minimal server metadata to spec', () => {
    const spec = metadataToSpec(baseMetadata);

    expect(spec.version).toBe('1.0');
    expect(spec.server.name).toBe('test-server');
    expect(spec.server.version).toBe('1.0.0');
    expect(spec.server.description).toBe('A test server');
    expect(spec.tools).toEqual([]);
    expect(spec.resources).toEqual([]);
    expect(spec.prompts).toEqual([]);
    expect(spec.transport).toEqual([{ type: 'stdio' }]);
  });

  it('should use default version if not provided', () => {
    baseMetadata.server = {
      name: 'test-server',
      target: class {},
    };

    const spec = metadataToSpec(baseMetadata);

    expect(spec.server.version).toBe('1.0.0');
  });

  it('should convert tools metadata to spec', () => {
    baseMetadata.tools = [
      {
        name: 'create_user',
        description: 'Creates a user',
        inputSchema: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
        propertyKey: 'createUser',
        target: class {},
      },
    ];

    const spec = metadataToSpec(baseMetadata);

    expect(spec.tools).toHaveLength(1);
    expect(spec.tools[0].name).toBe('create_user');
    expect(spec.tools[0].description).toBe('Creates a user');
    expect(spec.tools[0].inputSchema).toBeDefined();
    expect(spec.tools[0].handler).toBe('/createUser');
  });

  it('should convert resources metadata to spec', () => {
    baseMetadata.resources = [
      {
        uri: 'user://{userId}',
        name: 'User Profile',
        description: 'Get user by ID',
        mimeType: 'application/json',
        propertyKey: 'getUser',
        target: class {},
      },
    ];

    const spec = metadataToSpec(baseMetadata);

    expect(spec.resources).toHaveLength(1);
    expect(spec.resources[0].uri).toBe('user://{userId}');
    expect(spec.resources[0].name).toBe('User Profile');
    expect(spec.resources[0].mimeType).toBe('application/json');
    expect(spec.resources[0].handler).toBe('/getUser');
  });

  it('should convert prompts metadata to spec', () => {
    baseMetadata.prompts = [
      {
        name: 'welcome',
        description: 'Generate welcome message',
        arguments: [
          { name: 'userName', required: true },
          { name: 'language', required: false },
        ],
        propertyKey: 'generateWelcome',
        target: class {},
      },
    ];

    const spec = metadataToSpec(baseMetadata);

    expect(spec.prompts).toHaveLength(1);
    expect(spec.prompts[0].name).toBe('welcome');
    expect(spec.prompts[0].description).toBe('Generate welcome message');
    expect(spec.prompts[0].arguments).toHaveLength(2);
    expect(spec.prompts[0].handler).toBe('/generateWelcome');
  });

  it('should handle symbol property keys', () => {
    const symbolKey = Symbol('myMethod');
    baseMetadata.tools = [
      {
        name: 'my_tool',
        description: 'A tool',
        propertyKey: symbolKey,
        target: class {},
      },
    ];

    const spec = metadataToSpec(baseMetadata);

    expect(spec.tools[0].handler).toBe('/Symbol(myMethod)');
  });
});
