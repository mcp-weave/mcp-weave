import 'reflect-metadata';
import {
  McpServer,
  McpTool,
  McpResource,
  McpPrompt,
  McpInput,
  McpParam,
  McpPromptArg,
  createMcpServer,
} from '@mcp-weave/nestjs';

/**
 * Calculator MCP Server Example
 *
 * Demonstrates all MCP-Weave decorator features:
 * - @McpServer: Define server metadata
 * - @McpTool: Expose tools for LLM interaction
 * - @McpResource: Expose data resources
 * - @McpPrompt: Define reusable prompts
 */
@McpServer({
  name: 'calculator',
  version: '1.0.0',
  description: 'A simple calculator MCP server',
})
class CalculatorServer {
  private history: Array<{ operation: string; result: number }> = [];

  // ============ TOOLS ============

  @McpTool({
    name: 'add',
    description: 'Add two numbers together',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['a', 'b'],
    },
  })
  add(@McpInput() input: { a: number; b: number }) {
    const result = input.a + input.b;
    this.history.push({ operation: `${input.a} + ${input.b}`, result });
    return { result };
  }

  @McpTool({
    name: 'subtract',
    description: 'Subtract second number from first',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['a', 'b'],
    },
  })
  subtract(@McpInput() input: { a: number; b: number }) {
    const result = input.a - input.b;
    this.history.push({ operation: `${input.a} - ${input.b}`, result });
    return { result };
  }

  @McpTool({
    name: 'multiply',
    description: 'Multiply two numbers',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['a', 'b'],
    },
  })
  multiply(@McpInput() input: { a: number; b: number }) {
    const result = input.a * input.b;
    this.history.push({ operation: `${input.a} * ${input.b}`, result });
    return { result };
  }

  @McpTool({
    name: 'divide',
    description: 'Divide first number by second',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['a', 'b'],
    },
  })
  divide(@McpInput() input: { a: number; b: number }) {
    if (input.b === 0) {
      return { error: 'Division by zero is not allowed' };
    }
    const result = input.a / input.b;
    this.history.push({ operation: `${input.a} / ${input.b}`, result });
    return { result };
  }

  // ============ RESOURCES ============

  @McpResource({
    uri: 'calculator://history',
    name: 'Calculation History',
    description: 'View the history of calculations',
    mimeType: 'application/json',
  })
  getHistory() {
    return {
      contents: [
        {
          uri: 'calculator://history',
          mimeType: 'application/json',
          text: JSON.stringify(this.history, null, 2),
        },
      ],
    };
  }

  @McpResource({
    uri: 'calculator://history/{index}',
    name: 'Calculation Entry',
    description: 'View a specific calculation from history',
    mimeType: 'application/json',
  })
  getHistoryEntry(@McpParam('index') index: string) {
    const idx = parseInt(index, 10);
    const entry = this.history[idx];

    if (!entry) {
      return {
        contents: [
          {
            uri: `calculator://history/${index}`,
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'Entry not found' }),
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri: `calculator://history/${index}`,
          mimeType: 'application/json',
          text: JSON.stringify(entry),
        },
      ],
    };
  }

  // ============ PROMPTS ============

  @McpPrompt({
    name: 'solve_equation',
    description: 'Generate a prompt to solve a math equation',
    arguments: [
      { name: 'equation', description: 'The equation to solve', required: true },
    ],
  })
  solveEquation(@McpPromptArg('equation') equation: string) {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please solve the following equation step by step: ${equation}`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: 'explain_calculation',
    description: 'Generate a prompt to explain a calculation',
    arguments: [
      { name: 'operation', description: 'The operation (add, subtract, multiply, divide)', required: true },
      { name: 'a', description: 'First number', required: true },
      { name: 'b', description: 'Second number', required: true },
    ],
  })
  explainCalculation(
    @McpPromptArg('operation') operation: string,
    @McpPromptArg('a') a: string,
    @McpPromptArg('b') b: string
  ) {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Explain how to ${operation} ${a} and ${b}, and show the step-by-step process.`,
          },
        },
      ],
    };
  }
}

// Start the server
createMcpServer(CalculatorServer).catch(console.error);
