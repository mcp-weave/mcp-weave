import path from 'path';

import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs-extra';
import ora from 'ora';

export const startCommand = new Command('start')
  .description('Start MCP server')
  .option('-s, --spec <path>', 'Path to mcp-spec.yaml', 'mcp-spec.yaml')
  .option('-t, --transport <transport>', 'Transport type (stdio, sse)', 'stdio')
  .option('-w, --watch', 'Watch for changes and reload')
  .option('-p, --port <port>', 'Port for SSE transport', '3000')
  .action(async options => {
    const spinner = ora('Starting MCP server...').start();

    try {
      const specPath = path.resolve(options.spec);

      if (!(await fs.pathExists(specPath))) {
        spinner.fail(chalk.red(`Spec file not found: ${specPath}`));
        console.log(chalk.yellow('\nRun `mcp-weave init` to create a new project'));
        process.exit(1);
      }

      spinner.text = 'Loading server configuration...';

      // For now, just show info about the spec
      const yamlContent = await fs.readFile(specPath, 'utf-8');
      const { parseAndValidateSpec } = await import('@mcp-weave/core');
      const spec = await parseAndValidateSpec(yamlContent);

      spinner.succeed(
        chalk.green(`Server configured: ${spec.server.name} v${spec.server.version}`)
      );

      console.log('\n' + chalk.cyan('Server info:'));
      console.log(chalk.gray(`  Name: ${spec.server.name}`));
      console.log(chalk.gray(`  Version: ${spec.server.version}`));
      console.log(chalk.gray(`  Tools: ${spec.tools?.length ?? 0}`));
      console.log(chalk.gray(`  Resources: ${spec.resources?.length ?? 0}`));
      console.log(chalk.gray(`  Prompts: ${spec.prompts?.length ?? 0}`));
      console.log(chalk.gray(`  Transport: ${options.transport}`));
      if (options.watch) {
        console.log(chalk.gray(`  Watch mode: enabled`));
      }
      if (options.transport === 'sse') {
        console.log(chalk.gray(`  Port: ${options.port}`));
      }

      // Watch mode
      if (options.watch) {
        console.log('\n' + chalk.cyan('Watch mode enabled. Watching for changes...'));
        await watchAndReload(specPath, options);
      } else {
        console.log('\n' + chalk.yellow('Note: Full server runtime coming soon!'));
        console.log(chalk.gray('For now, use `mcp-weave generate` to create server code.'));
        console.log(chalk.gray('Use --watch flag for hot reload during development.'));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

/**
 * Watch for file changes and reload
 */
async function watchAndReload(
  specPath: string,
  options: { transport: string; port: string }
): Promise<void> {
  const srcDir = path.dirname(specPath);

  console.log(chalk.gray(`\nWatching: ${srcDir}`));
  console.log(chalk.gray('Press Ctrl+C to stop\n'));

  let reloadCount = 0;

  // Use fs.watch for file changes
  const watcher = fs.watch(srcDir, { recursive: true }, async (eventType, filename) => {
    if (!filename) return;

    // Only watch for relevant files
    const ext = path.extname(filename);
    if (!['.ts', '.yaml', '.yml', '.json'].includes(ext)) return;

    reloadCount++;
    console.log(chalk.yellow(`\n[${reloadCount}] Change detected: ${filename}`));

    try {
      // Re-validate spec if it changed
      if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
        const yamlContent = await fs.readFile(specPath, 'utf-8');
        const { parseAndValidateSpec } = await import('@mcp-weave/core');
        const spec = await parseAndValidateSpec(yamlContent);
        console.log(chalk.green(`✓ Spec validated: ${spec.server.name}`));
      }

      console.log(chalk.cyan(`[${reloadCount}] Ready for reload`));
      console.log(
        chalk.gray(
          `  Transport: ${options.transport}${options.transport === 'sse' ? ` (port ${options.port})` : ''}`
        )
      );
    } catch (error) {
      console.log(chalk.red(`✗ Error: ${error instanceof Error ? error.message : 'Unknown'}`));
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nStopping watch mode...'));
    watcher.close();
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}
