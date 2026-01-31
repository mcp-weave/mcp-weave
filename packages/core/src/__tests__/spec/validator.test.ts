import { describe, it, expect } from 'vitest';
import { validateSpec, isValidSpec, SpecValidationError } from '../../spec/validator.js';

describe('validateSpec', () => {
  it('should validate a minimal valid spec', () => {
    const spec = {
      server: {
        name: 'test-server',
      },
    };

    const result = validateSpec(spec);

    expect(result.server.name).toBe('test-server');
    expect(result.server.version).toBe('1.0.0'); // default
    expect(result.version).toBe('1.0'); // default
    expect(result.tools).toEqual([]);
    expect(result.resources).toEqual([]);
    expect(result.prompts).toEqual([]);
  });

  it('should validate a complete spec', () => {
    const spec = {
      version: '1.0',
      server: {
        name: 'full-server',
        version: '2.0.0',
        description: 'A complete server',
      },
      tools: [
        {
          name: 'create_user',
          description: 'Creates a new user',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['name'],
          },
        },
      ],
      resources: [
        {
          uri: 'user://{userId}',
          name: 'User Profile',
          description: 'Get user profile',
          mimeType: 'application/json',
        },
      ],
      prompts: [
        {
          name: 'welcome',
          description: 'Welcome message',
          arguments: [
            { name: 'userName', required: true },
            { name: 'language', required: false },
          ],
        },
      ],
      transport: [{ type: 'stdio' }, { type: 'sse', endpoint: '/sse' }],
    };

    const result = validateSpec(spec);

    expect(result.server.name).toBe('full-server');
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].inputSchema?.required).toEqual(['name']);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].mimeType).toBe('application/json');
    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0].arguments).toHaveLength(2);
    expect(result.transport).toHaveLength(2);
  });

  it('should throw SpecValidationError for missing server name', () => {
    const spec = {
      server: {
        version: '1.0.0',
      },
    };

    expect(() => validateSpec(spec)).toThrow(SpecValidationError);

    try {
      validateSpec(spec);
    } catch (error) {
      expect(error).toBeInstanceOf(SpecValidationError);
      const validationError = error as SpecValidationError;
      expect(validationError.errors.length).toBeGreaterThan(0);
      expect(validationError.errors[0].path).toContain('server');
    }
  });

  it('should throw SpecValidationError for empty tool name', () => {
    const spec = {
      server: { name: 'test' },
      tools: [{ name: '', description: 'Empty name' }],
    };

    expect(() => validateSpec(spec)).toThrow(SpecValidationError);
  });

  it('should throw SpecValidationError for missing tool description', () => {
    const spec = {
      server: { name: 'test' },
      tools: [{ name: 'my_tool' }],
    };

    expect(() => validateSpec(spec)).toThrow(SpecValidationError);
  });

  it('should throw SpecValidationError for invalid transport type', () => {
    const spec = {
      server: { name: 'test' },
      transport: [{ type: 'invalid' }],
    };

    expect(() => validateSpec(spec)).toThrow(SpecValidationError);
  });

  it('should apply default mimeType for resources', () => {
    const spec = {
      server: { name: 'test' },
      resources: [
        {
          uri: 'file://test',
          name: 'Test Resource',
        },
      ],
    };

    const result = validateSpec(spec);
    expect(result.resources[0].mimeType).toBe('application/json');
  });

  it('should apply default required=false for prompt arguments', () => {
    const spec = {
      server: { name: 'test' },
      prompts: [
        {
          name: 'test_prompt',
          description: 'A test prompt',
          arguments: [{ name: 'arg1' }],
        },
      ],
    };

    const result = validateSpec(spec);
    expect(result.prompts[0].arguments?.[0].required).toBe(false);
  });
});

describe('isValidSpec', () => {
  it('should return true for valid spec', () => {
    const spec = {
      server: { name: 'test-server' },
    };

    expect(isValidSpec(spec)).toBe(true);
  });

  it('should return false for invalid spec', () => {
    const spec = {
      server: { version: '1.0.0' }, // missing name
    };

    expect(isValidSpec(spec)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isValidSpec(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidSpec(undefined)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isValidSpec('string')).toBe(false);
    expect(isValidSpec(123)).toBe(false);
    expect(isValidSpec([])).toBe(false);
  });
});

describe('SpecValidationError', () => {
  it('should have correct name', () => {
    const error = new SpecValidationError('Test error', []);
    expect(error.name).toBe('SpecValidationError');
  });

  it('should contain error details', () => {
    const errors = [
      { path: 'server.name', message: 'Required' },
      { path: 'tools.0.description', message: 'Required' },
    ];
    const error = new SpecValidationError('Validation failed', errors);

    expect(error.errors).toEqual(errors);
    expect(error.message).toBe('Validation failed');
  });
});
