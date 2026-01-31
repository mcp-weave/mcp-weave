import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { METADATA_KEYS } from '@mcp-weave/core';
import { McpPrompt } from '../../decorators/mcp-prompt.js';

describe('@McpPrompt', () => {
  it('should set prompt metadata on method', () => {
    class TestServer {
      @McpPrompt({
        name: 'welcome',
        description: 'Generate a welcome message',
      })
      generateWelcome() {
        return {};
      }
    }

    const prompts = Reflect.getMetadata(METADATA_KEYS.PROMPTS, TestServer);

    expect(prompts).toHaveLength(1);
    expect(prompts[0].name).toBe('welcome');
    expect(prompts[0].description).toBe('Generate a welcome message');
    expect(prompts[0].propertyKey).toBe('generateWelcome');
  });

  it('should support arguments definition', () => {
    class TestServer {
      @McpPrompt({
        name: 'personalized_email',
        description: 'Generate personalized email',
        arguments: [
          { name: 'userName', description: 'User name', required: true },
          { name: 'userEmail', description: 'User email', required: true },
          { name: 'language', description: 'Language', required: false },
        ],
      })
      generateEmail() {
        return {};
      }
    }

    const prompts = Reflect.getMetadata(METADATA_KEYS.PROMPTS, TestServer);

    expect(prompts[0].arguments).toHaveLength(3);
    expect(prompts[0].arguments[0]).toEqual({
      name: 'userName',
      description: 'User name',
      required: true,
    });
    expect(prompts[0].arguments[2].required).toBe(false);
  });

  it('should support multiple prompts', () => {
    class TestServer {
      @McpPrompt({
        name: 'welcome',
        description: 'Welcome message',
      })
      welcome() {
        return {};
      }

      @McpPrompt({
        name: 'goodbye',
        description: 'Goodbye message',
      })
      goodbye() {
        return {};
      }

      @McpPrompt({
        name: 'help',
        description: 'Help message',
      })
      help() {
        return {};
      }
    }

    const prompts = Reflect.getMetadata(METADATA_KEYS.PROMPTS, TestServer);

    expect(prompts).toHaveLength(3);
    expect(prompts.map((p: { name: string }) => p.name)).toEqual(['welcome', 'goodbye', 'help']);
  });

  it('should handle prompts without arguments', () => {
    class TestServer {
      @McpPrompt({
        name: 'static_prompt',
        description: 'A prompt without arguments',
      })
      staticPrompt() {
        return {};
      }
    }

    const prompts = Reflect.getMetadata(METADATA_KEYS.PROMPTS, TestServer);

    expect(prompts[0].arguments).toBeUndefined();
  });

  it('should preserve method functionality', () => {
    class TestServer {
      @McpPrompt({
        name: 'greeting',
        description: 'Generate greeting',
      })
      generateGreeting(name: string) {
        return {
          messages: [{ role: 'user', content: `Hello, ${name}!` }],
        };
      }
    }

    const instance = new TestServer();
    const result = instance.generateGreeting('World');

    expect(result.messages[0].content).toBe('Hello, World!');
  });
});
