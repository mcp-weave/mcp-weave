import os from 'os';
import path from 'path';

import { parseAndValidateSpec, generateServer } from '@mcp-weave/core';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('generate command logic', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `mcp-weave-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('parseAndValidateSpec', () => {
    it('should parse valid YAML spec', async () => {
      const yaml = `
version: "1.0"
server:
  name: test-server
  version: "1.0.0"
tools:
  - name: hello
    description: Say hello
`;
      const spec = await parseAndValidateSpec(yaml);

      expect(spec.server.name).toBe('test-server');
      expect(spec.tools).toHaveLength(1);
      expect(spec.tools[0].name).toBe('hello');
    });

    it('should throw on invalid spec', async () => {
      const yaml = `
server:
  version: "1.0.0"
`;
      await expect(parseAndValidateSpec(yaml)).rejects.toThrow();
    });
  });

  describe('generateServer', () => {
    it('should generate server files', () => {
      const spec = {
        version: '1.0',
        server: { name: 'test', version: '1.0.0' },
        tools: [{ name: 'tool1', description: 'Tool 1' }],
        resources: [],
        prompts: [],
        transport: [{ type: 'stdio' as const }],
      };

      const files = generateServer(spec, { outputDir: tempDir });

      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.path.includes('server.ts'))).toBe(true);
      expect(files.some(f => f.path.includes('tools.ts'))).toBe(true);
    });

    it('should write files to output directory', async () => {
      const spec = {
        version: '1.0',
        server: { name: 'test', version: '1.0.0' },
        tools: [],
        resources: [],
        prompts: [],
        transport: [{ type: 'stdio' as const }],
      };

      const files = generateServer(spec, { outputDir: tempDir });

      await fs.ensureDir(tempDir);
      for (const file of files) {
        await fs.writeFile(file.path, file.content);
      }

      const serverExists = await fs.pathExists(path.join(tempDir, 'server.ts'));
      const indexExists = await fs.pathExists(path.join(tempDir, 'index.ts'));

      expect(serverExists).toBe(true);
      expect(indexExists).toBe(true);
    });
  });

  describe('full flow', () => {
    it('should parse, validate, and generate from YAML', async () => {
      const yaml = `
version: "1.0"
server:
  name: my-server
  version: "2.0.0"
  description: My awesome server
tools:
  - name: add
    description: Add two numbers
    inputSchema:
      type: object
      properties:
        a: { type: number }
        b: { type: number }
resources:
  - uri: "data://{id}"
    name: Data
    mimeType: application/json
prompts:
  - name: greeting
    description: Generate greeting
`;

      const spec = await parseAndValidateSpec(yaml);
      const files = generateServer(spec, { outputDir: tempDir });

      expect(spec.server.name).toBe('my-server');
      expect(files.length).toBe(5); // server, tools, resources, prompts, index

      // Verify generated content
      const serverFile = files.find(f => f.path.includes('server.ts'));
      expect(serverFile?.content).toContain("name: 'my-server'");
      expect(serverFile?.content).toContain("version: '2.0.0'");

      const toolsFile = files.find(f => f.path.includes('tools.ts'));
      expect(toolsFile?.content).toContain("'add'");

      const resourcesFile = files.find(f => f.path.includes('resources.ts'));
      expect(resourcesFile?.content).toContain("'data://{id}'");

      const promptsFile = files.find(f => f.path.includes('prompts.ts'));
      expect(promptsFile?.content).toContain("'greeting'");
    });
  });
});
