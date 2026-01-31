// @mcp-weave/cli
// CLI for MCP-Weave

import { Command } from 'commander';

import { extractCommand } from './commands/extract.js';
import { generateCommand } from './commands/generate.js';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';

const program = new Command();

program
  .name('mcp-weave')
  .description('Weave your code into MCP servers - seamlessly')
  .version('0.1.0');

// Register commands
program.addCommand(generateCommand);
program.addCommand(initCommand);
program.addCommand(startCommand);
program.addCommand(extractCommand);

program.parse();
