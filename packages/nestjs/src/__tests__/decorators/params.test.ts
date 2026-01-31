import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { METADATA_KEYS } from '@mcp-weave/core';
import { McpInput, McpParam, McpPromptArg } from '../../decorators/params.js';

describe('@McpInput', () => {
  it('should set input param metadata', () => {
    class TestServer {
      createUser(@McpInput() _input: unknown) {
        return {};
      }
    }

    const params = Reflect.getMetadata(METADATA_KEYS.PARAMS, TestServer);

    expect(params).toHaveLength(1);
    expect(params[0].type).toBe('input');
    expect(params[0].parameterIndex).toBe(0);
    expect(params[0].propertyKey).toBe('createUser');
  });

  it('should work with multiple parameters', () => {
    class TestServer {
      createUser(_first: string, @McpInput() _input: unknown, _third: number) {
        return {};
      }
    }

    const params = Reflect.getMetadata(METADATA_KEYS.PARAMS, TestServer);

    expect(params).toHaveLength(1);
    expect(params[0].parameterIndex).toBe(1);
  });

  it('should support multiple @McpInput on different methods', () => {
    class TestServer {
      createUser(@McpInput() _input: unknown) {
        return {};
      }

      updateUser(@McpInput() _input: unknown) {
        return {};
      }
    }

    const params = Reflect.getMetadata(METADATA_KEYS.PARAMS, TestServer);

    expect(params).toHaveLength(2);
    expect(params[0].propertyKey).toBe('createUser');
    expect(params[1].propertyKey).toBe('updateUser');
  });
});

describe('@McpParam', () => {
  it('should set param metadata with name', () => {
    class TestServer {
      getUser(@McpParam('userId') _userId: string) {
        return {};
      }
    }

    const params = Reflect.getMetadata(METADATA_KEYS.PARAMS, TestServer);

    expect(params).toHaveLength(1);
    expect(params[0].type).toBe('param');
    expect(params[0].name).toBe('userId');
    expect(params[0].parameterIndex).toBe(0);
  });

  it('should support multiple params', () => {
    class TestServer {
      getOrgUser(
        @McpParam('orgId') _orgId: string,
        @McpParam('userId') _userId: string
      ) {
        return {};
      }
    }

    const params = Reflect.getMetadata(METADATA_KEYS.PARAMS, TestServer);

    expect(params).toHaveLength(2);
    // Parameter decorators are processed in reverse order
    const orgIdParam = params.find((p: { name: string }) => p.name === 'orgId');
    const userIdParam = params.find((p: { name: string }) => p.name === 'userId');
    expect(orgIdParam).toBeDefined();
    expect(orgIdParam.parameterIndex).toBe(0);
    expect(userIdParam).toBeDefined();
    expect(userIdParam.parameterIndex).toBe(1);
  });
});

describe('@McpPromptArg', () => {
  it('should set promptArg metadata with name', () => {
    class TestServer {
      generateEmail(@McpPromptArg('userName') _userName: string) {
        return {};
      }
    }

    const params = Reflect.getMetadata(METADATA_KEYS.PARAMS, TestServer);

    expect(params).toHaveLength(1);
    expect(params[0].type).toBe('promptArg');
    expect(params[0].name).toBe('userName');
    expect(params[0].parameterIndex).toBe(0);
  });

  it('should support multiple prompt args', () => {
    class TestServer {
      generateEmail(
        @McpPromptArg('userName') _userName: string,
        @McpPromptArg('userEmail') _userEmail: string,
        @McpPromptArg('language') _language: string
      ) {
        return {};
      }
    }

    const params = Reflect.getMetadata(METADATA_KEYS.PARAMS, TestServer);

    expect(params).toHaveLength(3);
    // Parameter decorators are processed in reverse order, but we can verify all exist
    const names = params.map((p: { name: string }) => p.name).sort();
    expect(names).toEqual(['language', 'userEmail', 'userName']);
  });
});

describe('Mixed decorators', () => {
  it('should support all param types on same class', () => {
    class TestServer {
      createUser(@McpInput() _input: unknown) {
        return {};
      }

      getUser(@McpParam('userId') _userId: string) {
        return {};
      }

      generateEmail(@McpPromptArg('userName') _userName: string) {
        return {};
      }
    }

    const params = Reflect.getMetadata(METADATA_KEYS.PARAMS, TestServer);

    expect(params).toHaveLength(3);
    expect(params.find((p: { type: string }) => p.type === 'input')).toBeDefined();
    expect(params.find((p: { type: string }) => p.type === 'param')).toBeDefined();
    expect(params.find((p: { type: string }) => p.type === 'promptArg')).toBeDefined();
  });
});
