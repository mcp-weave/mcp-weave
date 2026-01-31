import path from 'path';

import { stringifySpec } from '@mcp-weave/core';
import type { McpSpec } from '@mcp-weave/core';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs-extra';
import ora from 'ora';

export const extractCommand = new Command('extract')
  .description('Extract MCP spec from annotated code (coming soon)')
  .option('-s, --source <path>', 'Source directory', './src')
  .option('-o, --output <path>', 'Output spec file', 'mcp-spec.yaml')
  .action(async options => {
    const spinner = ora('Scanning source files...').start();

    try {
      const sourcePath = path.resolve(options.source);

      if (!(await fs.pathExists(sourcePath))) {
        spinner.fail(chalk.red(`Source directory not found: ${sourcePath}`));
        process.exit(1);
      }

      spinner.text = 'Extracting metadata from decorators...';

      // TODO: Implement actual extraction from TypeScript files
      // For now, create a placeholder spec

      const spec: McpSpec = {
        version: '1.0',
        server: {
          name: 'extracted-server',
          version: '1.0.0',
          description: 'Extracted from source code',
        },
        tools: [],
        resources: [],
        prompts: [],
        transport: [{ type: 'stdio' }],
      };

      const outputPath = path.resolve(options.output);
      await fs.writeFile(outputPath, stringifySpec(spec));

      spinner.succeed(chalk.green(`Spec extracted to: ${outputPath}`));

      console.log(
        '\n' + chalk.yellow('Note: Full extraction from TypeScript decorators coming in v0.2.0')
      );
      console.log(chalk.gray('For now, a placeholder spec has been created.'));
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });
