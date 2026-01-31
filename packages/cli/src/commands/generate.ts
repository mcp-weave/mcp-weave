import path from 'path';

import { parseAndValidateSpec, generateServer } from '@mcp-weave/core';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs-extra';
import ora from 'ora';



export const generateCommand = new Command('generate')
  .description('Generate MCP server from spec file')
  .option('-s, --spec <path>', 'Path to mcp-spec.yaml', 'mcp-spec.yaml')
  .option('-o, --output <dir>', 'Output directory', './generated')
  .option('-f, --framework <framework>', 'Target framework', 'standalone')
  .action(async options => {
    const spinner = ora('Reading spec file...').start();

    try {
      // Check if spec file exists
      const specPath = path.resolve(options.spec);
      if (!(await fs.pathExists(specPath))) {
        spinner.fail(chalk.red(`Spec file not found: ${specPath}`));
        process.exit(1);
      }

      // Read and parse spec
      const yamlContent = await fs.readFile(specPath, 'utf-8');
      spinner.text = 'Validating spec...';

      const spec = await parseAndValidateSpec(yamlContent);
      spinner.succeed(chalk.green(`Spec validated: ${spec.server.name} v${spec.server.version}`));

      // Generate server code
      spinner.start('Generating server code...');
      const outputDir = path.resolve(options.output);

      const files = generateServer(spec, {
        outputDir,
        framework: options.framework,
      });

      // Write generated files
      await fs.ensureDir(outputDir);
      for (const file of files) {
        await fs.writeFile(file.path, file.content);
      }

      spinner.succeed(chalk.green(`Generated ${files.length} files in ${outputDir}`));

      console.log('\n' + chalk.cyan('Generated files:'));
      files.forEach(file => {
        console.log(chalk.gray(`  - ${path.relative(process.cwd(), file.path)}`));
      });

      console.log('\n' + chalk.yellow('Next steps:'));
      console.log(chalk.gray('  1. cd ' + path.relative(process.cwd(), outputDir)));
      console.log(chalk.gray('  2. npm install @modelcontextprotocol/sdk'));
      console.log(chalk.gray('  3. Implement your tool/resource/prompt logic'));
      console.log(chalk.gray('  4. Run: npx ts-node index.ts'));
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });
