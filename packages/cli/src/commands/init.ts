import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';

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
  description: "My MCP server"

tools:
  - name: hello
    description: "Say hello"
    inputSchema:
      type: object
      properties:
        name: { type: string }
      required: [name]

transport:
  - type: stdio
`,
      },
      {
        name: 'src/app.controller.ts',
        content: (name: string) => `import { 
  McpServer, 
  McpTool, 
  McpInput 
} from '@mcp-weave/nestjs';

@McpServer({ 
  name: '${name}',
  version: '1.0.0',
  description: 'My MCP server'
})
export class AppController {
  
  @McpTool({
    name: 'hello',
    description: 'Say hello to someone'
  })
  async hello(@McpInput() input: { name: string }) {
    return { message: \`Hello, \${input.name}!\` };
  }
}
`,
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
              scripts: {
                build: 'tsc',
                start: 'node dist/index.js',
              },
              dependencies: {
                '@modelcontextprotocol/sdk': '^1.0.0',
              },
              devDependencies: {
                typescript: '^5.4.0',
                '@types/node': '^20.11.0',
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
  description: "My MCP server"

tools:
  - name: hello
    description: "Say hello"
    inputSchema:
      type: object
      properties:
        name: { type: string }
      required: [name]

transport:
  - type: stdio
`,
      },
      {
        name: 'tsconfig.json',
        content: () =>
          JSON.stringify(
            {
              compilerOptions: {
                target: 'ES2022',
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
                outDir: './dist',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
              },
              include: ['src/**/*'],
            },
            null,
            2
          ),
      },
    ],
  },
};

export const initCommand = new Command('init')
  .description('Initialize a new MCP-Weave project')
  .option('-n, --name <name>', 'Project name', 'my-mcp-server')
  .option('-f, --framework <framework>', 'Framework (nestjs, standalone)', 'standalone')
  .option('-d, --dir <directory>', 'Output directory')
  .action(async options => {
    const spinner = ora('Creating project...').start();

    try {
      const projectName = options.name;
      const framework = options.framework as keyof typeof TEMPLATES;
      const outputDir = path.resolve(options.dir ?? projectName);

      if (!TEMPLATES[framework]) {
        spinner.fail(chalk.red(`Unknown framework: ${framework}`));
        process.exit(1);
      }

      // Check if directory exists
      if (await fs.pathExists(outputDir)) {
        spinner.fail(chalk.red(`Directory already exists: ${outputDir}`));
        process.exit(1);
      }

      // Create project
      await fs.ensureDir(outputDir);
      await fs.ensureDir(path.join(outputDir, 'src'));

      const template = TEMPLATES[framework];
      for (const file of template.files) {
        const filePath = path.join(outputDir, file.name);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, file.content(projectName));
      }

      spinner.succeed(chalk.green(`Created project: ${projectName}`));

      console.log('\n' + chalk.cyan('Project structure:'));
      console.log(chalk.gray(`  ${projectName}/`));
      template.files.forEach(file => {
        console.log(chalk.gray(`    ${file.name}`));
      });

      console.log('\n' + chalk.yellow('Next steps:'));
      console.log(chalk.gray(`  1. cd ${projectName}`));
      console.log(chalk.gray('  2. npm install'));
      console.log(chalk.gray('  3. Edit mcp-spec.yaml or src/ files'));
      console.log(chalk.gray('  4. mcp-weave start'));
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });
