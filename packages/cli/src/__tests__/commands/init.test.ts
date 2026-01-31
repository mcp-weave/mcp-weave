import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Template definitions extracted from init.ts for testing
const TEMPLATES = {
  nestjs: {
    files: [
      {
        name: 'package.json',
        content: (name: string) =>
          JSON.stringify(
            {
              name,
              version: '1.0.0',
              scripts: {
                build: 'nest build',
                start: 'nest start',
                'start:dev': 'nest start --watch',
              },
              dependencies: {
                '@mcp-weave/nestjs': '^0.1.0',
                '@nestjs/common': '^10.0.0',
                '@nestjs/core': '^10.0.0',
                'reflect-metadata': '^0.2.0',
                rxjs: '^7.8.0',
              },
              devDependencies: {
                '@nestjs/cli': '^10.0.0',
                typescript: '^5.4.0',
              },
            },
            null,
            2
          ),
      },
      {
        name: 'mcp-spec.yaml',
        content: (name: string) => `version: "1.0"

server:
  name: "${name}"
  version: "1.0.0"
`,
      },
      {
        name: 'src/app.controller.ts',
        content: (name: string) => `@McpServer({ name: '${name}' })`,
      },
    ],
  },
  standalone: {
    files: [
      {
        name: 'package.json',
        content: (name: string) =>
          JSON.stringify(
            {
              name,
              version: '1.0.0',
              type: 'module',
            },
            null,
            2
          ),
      },
      {
        name: 'mcp-spec.yaml',
        content: (name: string) => `server:\n  name: "${name}"`,
      },
      {
        name: 'tsconfig.json',
        content: () => JSON.stringify({ compilerOptions: { target: 'ES2022' } }, null, 2),
      },
    ],
  },
};

describe('init command logic', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `mcp-weave-init-test-${Date.now()}`);
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('template generation', () => {
    it('should generate nestjs template files', async () => {
      const projectName = 'test-project';
      const template = TEMPLATES.nestjs;

      await fs.ensureDir(tempDir);
      await fs.ensureDir(path.join(tempDir, 'src'));

      for (const file of template.files) {
        const filePath = path.join(tempDir, file.name);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, file.content(projectName));
      }

      // Verify files exist
      expect(await fs.pathExists(path.join(tempDir, 'package.json'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, 'mcp-spec.yaml'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, 'src/app.controller.ts'))).toBe(true);

      // Verify content
      const packageJson = await fs.readJson(path.join(tempDir, 'package.json'));
      expect(packageJson.name).toBe(projectName);
      expect(packageJson.dependencies['@mcp-weave/nestjs']).toBeDefined();

      const specContent = await fs.readFile(path.join(tempDir, 'mcp-spec.yaml'), 'utf-8');
      expect(specContent).toContain(projectName);

      const controllerContent = await fs.readFile(
        path.join(tempDir, 'src/app.controller.ts'),
        'utf-8'
      );
      expect(controllerContent).toContain(`name: '${projectName}'`);
    });

    it('should generate standalone template files', async () => {
      const projectName = 'standalone-project';
      const template = TEMPLATES.standalone;

      await fs.ensureDir(tempDir);

      for (const file of template.files) {
        const filePath = path.join(tempDir, file.name);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, file.content(projectName));
      }

      // Verify files exist
      expect(await fs.pathExists(path.join(tempDir, 'package.json'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, 'mcp-spec.yaml'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, 'tsconfig.json'))).toBe(true);

      // Verify content
      const packageJson = await fs.readJson(path.join(tempDir, 'package.json'));
      expect(packageJson.name).toBe(projectName);
      expect(packageJson.type).toBe('module');

      const tsconfig = await fs.readJson(path.join(tempDir, 'tsconfig.json'));
      expect(tsconfig.compilerOptions.target).toBe('ES2022');
    });
  });

  describe('template content', () => {
    it('should generate valid package.json for nestjs', () => {
      const content = TEMPLATES.nestjs.files[0].content('my-server');
      const packageJson = JSON.parse(content);

      expect(packageJson.name).toBe('my-server');
      expect(packageJson.dependencies['@nestjs/common']).toBeDefined();
      expect(packageJson.dependencies['@nestjs/core']).toBeDefined();
      expect(packageJson.dependencies['reflect-metadata']).toBeDefined();
    });

    it('should generate valid package.json for standalone', () => {
      const content = TEMPLATES.standalone.files[0].content('my-server');
      const packageJson = JSON.parse(content);

      expect(packageJson.name).toBe('my-server');
      expect(packageJson.type).toBe('module');
    });

    it('should inject project name into mcp-spec.yaml', () => {
      const nestjsSpec = TEMPLATES.nestjs.files[1].content('nestjs-server');
      const standaloneSpec = TEMPLATES.standalone.files[1].content('standalone-server');

      expect(nestjsSpec).toContain('nestjs-server');
      expect(standaloneSpec).toContain('standalone-server');
    });
  });

  describe('directory handling', () => {
    it('should create nested directories for files', async () => {
      await fs.ensureDir(tempDir);
      const nestedPath = path.join(tempDir, 'src', 'nested', 'deep');

      await fs.ensureDir(nestedPath);
      await fs.writeFile(path.join(nestedPath, 'file.ts'), 'content');

      expect(await fs.pathExists(path.join(nestedPath, 'file.ts'))).toBe(true);
    });

    it('should detect existing directory', async () => {
      await fs.ensureDir(tempDir);

      const exists = await fs.pathExists(tempDir);
      expect(exists).toBe(true);
    });
  });
});
