# User Service - MCP-Weave Full Example

This example demonstrates a complete MCP server using `@mcp-weave/nestjs` decorators with CRUD operations for user management.

## Features

- **6 Tools**: Full CRUD operations (create, get, update, delete, list, search)
- **3 Resources**: User listing, individual user details, and statistics
- **2 Prompts**: User onboarding and activity reports

## Development Workflows

### Code-First (Current)

Write your decorated TypeScript class, then extract the spec:

```bash
# Extract spec from code
mcp-weave extract --input src/server.ts --output mcp-spec.yaml
```

### Spec-First

Start with a `mcp-spec.yaml` file, then generate boilerplate:

```bash
# Generate code from spec
mcp-weave generate --spec mcp-spec.yaml --output src/generated
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run the server
pnpm start
```

## Testing with MCP Inspector

You can test this server using the MCP Inspector or any MCP client:

```bash
# Using npx (recommended)
npx @anthropic/mcp-inspector node dist/server.js
```

## Available Tools

| Tool           | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `create_user`  | Create a new user with name, email, and role               |
| `get_user`     | Get a user by their unique ID                              |
| `update_user`  | Update user information                                    |
| `delete_user`  | Remove a user from the system                              |
| `list_users`   | List all users with optional role filtering and pagination |
| `search_users` | Search users by name or email                              |

## Available Resources

| URI             | Description                              |
| --------------- | ---------------------------------------- |
| `users://list`  | JSON list of all users                   |
| `users://{id}`  | Detailed information for a specific user |
| `users://stats` | Statistics about users in the system     |

## Available Prompts

| Prompt         | Description                              |
| -------------- | ---------------------------------------- |
| `onboard_user` | Generate a welcome message for new users |
| `user_report`  | Generate activity reports                |

## Example Usage

### Create a User

```json
{
  "name": "create_user",
  "arguments": {
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### Search Users

```json
{
  "name": "search_users",
  "arguments": {
    "query": "john"
  }
}
```

### Get User Statistics Resource

```json
{
  "method": "resources/read",
  "params": {
    "uri": "users://stats"
  }
}
```

## Project Structure

```
user-service/
├── package.json
├── tsconfig.json
├── mcp-spec.yaml     # MCP specification (spec-first)
├── README.md
└── src/
    └── server.ts     # Main server implementation
```

## License

MIT
