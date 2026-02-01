# MCP-Weave - Plano de Implementação

## Estado Atual (v0.2.0)

### Concluído

- [x] Estrutura do monorepo (pnpm + Turbo + Changesets)
- [x] Configuração TypeScript, ESLint, Prettier
- [x] **@mcp-weave/core**: Parser YAML, validação Zod, gerador de código
- [x] **@mcp-weave/nestjs**: Decorators completos (`@McpServer`, `@McpTool`, `@McpResource`, `@McpPrompt`, `@McpInput`, `@McpParam`, `@McpPromptArg`)
- [x] **@mcp-weave/nestjs**: Runtime server com suporte a stdio e SSE
- [x] **@mcp-weave/cli**: Comandos `generate`, `init`, `start`, `extract` com hot reload
- [x] **@mcp-weave/testing**: Mock server, transport, assertions e McpTestClient
- [x] **@mcp-weave/express**: Middleware e servidor Express para MCP
- [x] Build funcionando em todos os pacotes (192 testes)

### Pendente para v0.1.0

- [x] Testes unitários para todos os pacotes (152 testes)
- [x] Exemplo funcional completo (calculator + user-service)
- [x] CI/CD GitHub Actions

---

## Fase 1: Completar MVP (v0.1.0)

### 1.1 Testes Unitários ✅ CONCLUÍDO

**192 testes passando**

```
packages/core/src/__tests__/         # 51 tests
├── spec/
│   ├── parser.test.ts              # 9 tests - Parsing de YAML
│   └── validator.test.ts           # 15 tests - Validação com Zod
├── scanner/
│   └── metadata.test.ts            # 14 tests - Extração de metadata
└── generator/
    └── server.test.ts              # 13 tests - Geração de código

packages/nestjs/src/__tests__/       # 42 tests
├── decorators/
│   ├── mcp-server.test.ts          # 4 tests
│   ├── mcp-tool.test.ts            # 5 tests
│   ├── mcp-resource.test.ts        # 5 tests
│   ├── mcp-prompt.test.ts          # 5 tests
│   └── params.test.ts              # 8 tests
└── metadata/
    └── storage.test.ts             # 15 tests

packages/testing/src/__tests__/      # 68 tests
├── mock-server.test.ts             # 13 tests
├── mock-transport.test.ts          # 13 tests
├── assertions.test.ts              # 21 tests
└── test-client.test.ts             # 21 tests - McpTestClient

packages/cli/src/__tests__/          # 12 tests
└── commands/
    ├── generate.test.ts            # 5 tests
    └── init.test.ts                # 7 tests

packages/express/src/__tests__/      # 19 tests
├── middleware.test.ts              # 14 tests
└── server.test.ts                  # 5 tests
```

### 1.2 Exemplo Funcional ✅ CONCLUÍDO

**Dois exemplos completos:**

```
examples/
├── calculator/                 # Exemplo básico
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md
│   └── src/
│       └── server.ts          # Calculadora com tools, resources e prompts
└── user-service/              # Exemplo completo
    ├── package.json
    ├── tsconfig.json
    ├── mcp-spec.yaml          # Spec-first workflow demo
    ├── README.md
    └── src/
        └── server.ts          # CRUD completo com 6 tools, 3 resources, 2 prompts
```

### 1.3 CI/CD ✅ CONCLUÍDO

**GitHub Actions configurado:**

```yaml
# .github/workflows/ci.yml
- Lint + Format check
- Build all packages (Node 18, 20, 22)
- Run tests
- Type check
```

---

## Fase 2: v0.2.0 Features ✅ CONCLUÍDO

### 2.1 Testing Utilities ✅ CONCLUÍDO

Expandido `@mcp-weave/testing`:

```typescript
// Mock de transporte para testes
const testClient = new McpTestClient(MyServer);
const result = await testClient.callTool('create_user', { name: 'John' });
expect(result).toHaveProperty('userId');

// Assertions
await expect(testClient).toHaveTool('create_user');
await expect(testClient).toHaveResource('user://{id}');
```

### 2.2 SSE Transport ✅ CONCLUÍDO

```typescript
// packages/nestjs/src/runtime/server.ts
import { McpRuntimeServer } from '@mcp-weave/nestjs';

const server = new McpRuntimeServer(MyServer, {
  transport: 'sse',
  port: 3000,
  endpoint: '/sse',
});

await server.start();
// or
await server.startSSE({ port: 3000, endpoint: '/sse' });
```

### 2.3 Express Support ✅ CONCLUÍDO

Novo pacote `@mcp-weave/express`:

```typescript
import { McpExpressServer, McpServer, McpTool } from '@mcp-weave/express';

@McpServer({ name: 'my-server' })
class MyServer {
  @McpTool({ name: 'hello', description: 'Says hello' })
  hello(input: { name: string }) {
    return { message: `Hello, ${input.name}!` };
  }
}

// Standalone server
const server = new McpExpressServer(MyServer, { port: 3000 });
await server.start();

// Or middleware
app.use('/mcp', createMcpMiddleware(MyServer));
```

### 2.4 Hot Reload ✅ CONCLUÍDO

```bash
mcp-weave start --watch
mcp-weave start --watch --transport sse --port 3000
```

---

## Fase 3: v0.3.0+ Features

### 3.1 WebSocket Transport

```typescript
@McpServer({ transport: 'websocket', port: 8080 })
```

### 3.2 Web UI para Testing

Dashboard para testar tools/resources/prompts interativamente.

### 3.3 Suporte Adicional

- Python/FastAPI (`@mcp-weave/fastapi`)
- Go/Gin

---

## Cronograma Sugerido

| Fase | Tasks                 | Estimativa |
| ---- | --------------------- | ---------- |
| 1.1  | Testes unitários core | Sessão 1   |
| 1.2  | Exemplo básico        | Sessão 1   |
| 1.3  | CI/CD                 | Sessão 2   |
| 2.1  | Testing utilities     | Sessão 2-3 |
| 2.2  | SSE Transport         | Sessão 3   |
| 2.3  | Express support       | Sessão 4   |

---

## Próximos Passos Imediatos

1. **Criar testes para `@mcp-weave/core`**
   - `spec/parser.test.ts` - testar parseSpec, stringifySpec
   - `spec/validator.test.ts` - testar validateSpec
   - `generator/server.test.ts` - testar generateServer

2. **Criar exemplo básico**
   - Calculator MCP server (add, subtract, multiply, divide)
   - README com instruções

3. **Configurar CI**
   - GitHub Actions workflow

---

## Arquitetura de Referência

```
┌─────────────────────────────────────────────────────────────┐
│                        Code-First Flow                       │
├─────────────────────────────────────────────────────────────┤
│  @McpServer + @McpTool decorators                           │
│         ↓                                                    │
│  reflect-metadata → extractMetadata()                        │
│         ↓                                                    │
│  McpRuntimeServer.start() → stdio/sse transport             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        Spec-First Flow                       │
├─────────────────────────────────────────────────────────────┤
│  mcp-spec.yaml                                              │
│         ↓                                                    │
│  parseSpec() → validateSpec() → McpSpec                     │
│         ↓                                                    │
│  generateServer() → server.ts, tools.ts, etc.               │
└─────────────────────────────────────────────────────────────┘
```
