import 'reflect-metadata';
import { METADATA_KEYS } from '@mcp-weave/core';
import { describe, it, expect } from 'vitest';

import { McpResource } from '../../decorators/mcp-resource.js';

describe('@McpResource', () => {
  it('should set resource metadata on method', () => {
    class TestServer {
      @McpResource({
        uri: 'user://{userId}',
        name: 'User Profile',
        description: 'Get user by ID',
        mimeType: 'application/json',
      })
      getUser() {
        return {};
      }
    }

    const resources = Reflect.getMetadata(METADATA_KEYS.RESOURCES, TestServer);

    expect(resources).toHaveLength(1);
    expect(resources[0].uri).toBe('user://{userId}');
    expect(resources[0].name).toBe('User Profile');
    expect(resources[0].description).toBe('Get user by ID');
    expect(resources[0].mimeType).toBe('application/json');
    expect(resources[0].propertyKey).toBe('getUser');
  });

  it('should use default mimeType if not provided', () => {
    class TestServer {
      @McpResource({
        uri: 'file://test',
        name: 'Test File',
      })
      getFile() {
        return {};
      }
    }

    const resources = Reflect.getMetadata(METADATA_KEYS.RESOURCES, TestServer);

    expect(resources[0].mimeType).toBe('application/json');
  });

  it('should support multiple resources', () => {
    class TestServer {
      @McpResource({
        uri: 'user://{userId}',
        name: 'User',
      })
      getUser() {
        return {};
      }

      @McpResource({
        uri: 'post://{postId}',
        name: 'Post',
        mimeType: 'text/html',
      })
      getPost() {
        return {};
      }
    }

    const resources = Reflect.getMetadata(METADATA_KEYS.RESOURCES, TestServer);

    expect(resources).toHaveLength(2);
    expect(resources[0].uri).toBe('user://{userId}');
    expect(resources[1].uri).toBe('post://{postId}');
    expect(resources[1].mimeType).toBe('text/html');
  });

  it('should handle URI with multiple parameters', () => {
    class TestServer {
      @McpResource({
        uri: 'org://{orgId}/user://{userId}',
        name: 'Org User',
      })
      getOrgUser() {
        return {};
      }
    }

    const resources = Reflect.getMetadata(METADATA_KEYS.RESOURCES, TestServer);

    expect(resources[0].uri).toBe('org://{orgId}/user://{userId}');
  });

  it('should preserve method functionality', () => {
    class TestServer {
      @McpResource({
        uri: 'data://test',
        name: 'Test Data',
      })
      getData() {
        return { data: 'test-data' };
      }
    }

    const instance = new TestServer();
    expect(instance.getData()).toEqual({ data: 'test-data' });
  });
});
