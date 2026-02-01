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
 * User Service MCP Server
 *
 * This example demonstrates a full-service MCP server with:
 * - CRUD operations for users (Tools)
 * - Data access via resources (Resources)
 * - Prompt templates (Prompts)
 *
 * Development flow options:
 * 1. Code-first: Write this file → run `mcp-weave extract` → generates mcp-spec.yaml
 * 2. Spec-first: Write mcp-spec.yaml → run `mcp-weave generate` → generates boilerplate code
 */

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
  updatedAt: Date;
}

@McpServer({
  name: 'user-service',
  version: '1.0.0',
  description: 'User management MCP server with CRUD operations',
})
class UserServiceServer {
  private users: Map<string, User> = new Map();
  private nextId = 1;

  constructor() {
    // Seed some initial data
    this.seedData();
  }

  private seedData() {
    const initialUsers: Omit<User, 'id' | 'createdAt' | 'updatedAt'>[] = [
      { name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
      { name: 'Bob Smith', email: 'bob@example.com', role: 'user' },
      { name: 'Charlie Brown', email: 'charlie@example.com', role: 'user' },
      { name: 'Diana Prince', email: 'diana@example.com', role: 'guest' },
    ];

    for (const userData of initialUsers) {
      const id = String(this.nextId++);
      const now = new Date();
      this.users.set(id, {
        id,
        ...userData,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // ============ TOOLS - CRUD Operations ============

  @McpTool({
    name: 'create_user',
    description: 'Create a new user in the system',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "User's full name" },
        email: { type: 'string', description: "User's email address" },
        role: {
          type: 'string',
          enum: ['admin', 'user', 'guest'],
          description: "User's role in the system",
        },
      },
      required: ['name', 'email'],
    },
  })
  createUser(
    @McpInput() input: { name: string; email: string; role?: 'admin' | 'user' | 'guest' }
  ) {
    // Check for duplicate email
    for (const user of this.users.values()) {
      if (user.email === input.email) {
        return { success: false, error: 'Email already exists' };
      }
    }

    const id = String(this.nextId++);
    const now = new Date();
    const user: User = {
      id,
      name: input.name,
      email: input.email,
      role: input.role ?? 'user',
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, user);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  @McpTool({
    name: 'get_user',
    description: 'Get a user by their ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "The user's unique identifier" },
      },
      required: ['id'],
    },
  })
  getUser(@McpInput() input: { id: string }) {
    const user = this.users.get(input.id);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }

  @McpTool({
    name: 'update_user',
    description: "Update an existing user's information",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "The user's unique identifier" },
        name: { type: 'string', description: "User's new name" },
        email: { type: 'string', description: "User's new email" },
        role: {
          type: 'string',
          enum: ['admin', 'user', 'guest'],
          description: "User's new role",
        },
      },
      required: ['id'],
    },
  })
  updateUser(
    @McpInput()
    input: { id: string; name?: string; email?: string; role?: 'admin' | 'user' | 'guest' }
  ) {
    const user = this.users.get(input.id);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check for duplicate email if changing
    if (input.email && input.email !== user.email) {
      for (const u of this.users.values()) {
        if (u.email === input.email) {
          return { success: false, error: 'Email already exists' };
        }
      }
    }

    // Update fields
    if (input.name) user.name = input.name;
    if (input.email) user.email = input.email;
    if (input.role) user.role = input.role;
    user.updatedAt = new Date();

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  @McpTool({
    name: 'delete_user',
    description: 'Delete a user from the system',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "The user's unique identifier" },
      },
      required: ['id'],
    },
  })
  deleteUser(@McpInput() input: { id: string }) {
    const user = this.users.get(input.id);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    this.users.delete(input.id);

    return { success: true, message: `User ${user.name} deleted` };
  }

  @McpTool({
    name: 'list_users',
    description: 'List all users with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: ['admin', 'user', 'guest'],
          description: 'Filter by role',
        },
        limit: { type: 'number', description: 'Maximum number of users to return' },
        offset: { type: 'number', description: 'Number of users to skip' },
      },
    },
  })
  listUsers(@McpInput() input: { role?: string; limit?: number; offset?: number }) {
    let users = Array.from(this.users.values());

    // Filter by role
    if (input.role) {
      users = users.filter(u => u.role === input.role);
    }

    // Apply pagination
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 100;
    const paginatedUsers = users.slice(offset, offset + limit);

    return {
      total: users.length,
      offset,
      limit,
      users: paginatedUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    };
  }

  @McpTool({
    name: 'search_users',
    description: 'Search users by name or email',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  })
  searchUsers(@McpInput() input: { query: string }) {
    const query = input.query.toLowerCase();
    const results = Array.from(this.users.values()).filter(
      u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
    );

    return {
      total: results.length,
      users: results.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    };
  }

  // ============ RESOURCES - Data Access ============

  @McpResource({
    uri: 'users://list',
    name: 'All Users',
    description: 'Get a list of all users in the system',
    mimeType: 'application/json',
  })
  getAllUsersResource() {
    const users = Array.from(this.users.values()).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));

    return {
      contents: [
        {
          uri: 'users://list',
          mimeType: 'application/json',
          text: JSON.stringify({ users }, null, 2),
        },
      ],
    };
  }

  @McpResource({
    uri: 'users://{id}',
    name: 'User Details',
    description: 'Get detailed information about a specific user',
    mimeType: 'application/json',
  })
  getUserResource(@McpParam('id') id: string) {
    const user = this.users.get(id);

    if (!user) {
      return {
        contents: [
          {
            uri: `users://${id}`,
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'User not found' }),
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri: `users://${id}`,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              createdAt: user.createdAt.toISOString(),
              updatedAt: user.updatedAt.toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  @McpResource({
    uri: 'users://stats',
    name: 'User Statistics',
    description: 'Get statistics about users in the system',
    mimeType: 'application/json',
  })
  getStatsResource() {
    const users = Array.from(this.users.values());

    const stats = {
      total: users.length,
      byRole: {
        admin: users.filter(u => u.role === 'admin').length,
        user: users.filter(u => u.role === 'user').length,
        guest: users.filter(u => u.role === 'guest').length,
      },
      newestUser: users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.name,
      lastUpdated: new Date().toISOString(),
    };

    return {
      contents: [
        {
          uri: 'users://stats',
          mimeType: 'application/json',
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  }

  // ============ PROMPTS - Template Generation ============

  @McpPrompt({
    name: 'onboard_user',
    description: 'Generate an onboarding welcome message for a new user',
    arguments: [
      { name: 'name', description: "The user's name", required: true },
      { name: 'role', description: "The user's role", required: true },
    ],
  })
  onboardUser(@McpPromptArg('name') name: string, @McpPromptArg('role') role: string) {
    const roleDescriptions: Record<string, string> = {
      admin: 'As an administrator, you have full access to manage users, settings, and system configuration.',
      user: 'As a standard user, you can access all main features and collaborate with your team.',
      guest: 'As a guest, you have limited read-only access to explore our platform.',
    };

    const roleDescription = roleDescriptions[role] || 'Welcome to our platform!';

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a warm, personalized welcome message for ${name} who just joined as a ${role}. ${roleDescription} Make it friendly and helpful, and include:
1. A warm greeting
2. Key features they can access
3. Next steps to get started
4. Where to find help`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: 'user_report',
    description: "Generate a report about a user's activity",
    arguments: [
      { name: 'userId', description: "The user's ID", required: true },
      { name: 'period', description: 'Report period (daily, weekly, monthly)', required: false },
    ],
  })
  userReport(
    @McpPromptArg('userId') userId: string,
    @McpPromptArg('period') period: string = 'weekly'
  ) {
    const user = this.users.get(userId);

    if (!user) {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `User with ID ${userId} not found. Please provide a valid user ID.`,
            },
          },
        ],
      };
    }

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate a ${period} activity report for user:
- Name: ${user.name}
- Email: ${user.email}
- Role: ${user.role}
- Account created: ${user.createdAt.toISOString()}
- Last updated: ${user.updatedAt.toISOString()}

Include sections for:
1. Account summary
2. Activity highlights
3. Recommendations
4. Key metrics`,
          },
        },
      ],
    };
  }
}

// Start the server
createMcpServer(UserServiceServer).catch(console.error);
