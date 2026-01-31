# MCP-Weave - Plano de Implementação

## Estado Atual (v0.1.0 MVP)

### Concluído
- [x] Estrutura do monorepo (pnpm + Turbo + Changesets)
- [x] Configuração TypeScript, ESLint, Prettier
- [x] **@mcp-weave/core**: Parser YAML, validação Zod, gerador de código
- [x] **@mcp-weave/nestjs**: Decorators completos (`@McpServer`, `@McpTool`, `@McpResource`, `@McpPrompt`, `@McpInput`, `@McpParam`, `@McpPromptArg`)
- [x] **@mcp-weave/nestjs**: Runtime server com suporte a stdio
- [x] **@mcp-weave/cli**: Comandos `generate`, `init`, `start`, `extract`
- [x] **@mcp-weave/testing**: Mock server, transport e assertions (estrutura)
- [x] Build funcionando em todos os pacotes

### Pendente para v0.1.0
- [ ] Testes unitários para todos os pacotes
- [ ] Exemplo funcional completo
- [ ] CI/CD GitHub Actions

---

## Fase 1: Completar MVP (v0.1.0)

### 1.1 Testes Unitários
**Prioridade: Alta**

```
packages/core/src/__tests__/
├── spec/
│   ├── parser.test.ts      # Parsing de YAML
│   ├── validator.test.ts   # Validação com Zod
│   └── types.test.ts       # Schemas Zod
├── scanner/
│   └── metadata.test.ts    # Extração de metadata
└── generator/
    └── server.test.ts      # Geração de código

packages/nestjs/src/__tests__/
├── decorators/
│   ├── mcp-server.test.ts
│   ├── mcp-tool.test.ts
│   ├── mcp-resource.test.ts
│   └── mcp-prompt.test.ts
└── runtime/
    └── server.test.ts      # Runtime server

packages/cli/src/__tests__/
└── commands/
    ├── generate.test.ts
    └── init.test.ts
```

### 1.2 Exemplo Funcional
**Prioridade: Alta**

```
examples/
├── basic/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   └── calculator.ts   # Exemplo simples com tools
│   └── README.md
└── full-service/
    ├── package.json
    ├── tsconfig.json
    ├── mcp-spec.yaml       # Spec file
    ├── src/
    │   └── user-service.ts # Exemplo completo
    └── README.md
```

### 1.3 CI/CD
**Prioridade: Média**

```yaml
# .github/workflows/ci.yml
- Lint + Format check
- Build all packages
- Run tests
- Type check
```

---

## Fase 2: v0.2.0 Features

### 2.1 Testing Utilities
**Prioridade: Alta**

Expandir `@mcp-weave/testing`:

```typescript
// Mock de transporte para testes
const testClient = new McpTestClient(MyServer);
const result = await testClient.callTool('create_user', { name: 'John' });
expect(result).toHaveProperty('userId');

// Assertions
await expect(testClient).toHaveTool('create_user');
await expect(testClient).toHaveResource('user://{id}');
```

### 2.2 SSE Transport
**Prioridade: Média**

```typescript
// packages/nestjs/src/runtime/transports/
├── stdio.ts    # Já existe
├── sse.ts      # Server-Sent Events
└── index.ts

// Uso
@McpServer({
  name: 'my-server',
  transport: 'sse',
  port: 3000
})
```

### 2.3 Express Support
**Prioridade: Média**

Novo pacote `@mcp-weave/express`:

```typescript
import { McpTool, McpServer } from '@mcp-weave/express';

@McpServer({ name: 'my-server' })
class MyServer {
  @McpTool({ name: 'hello', description: 'Says hello' })
  hello(input: { name: string }) {
    return { message: `Hello, ${input.name}!` };
  }
}

// Middleware Express
app.use('/mcp', mcpMiddleware(MyServer));
```

### 2.4 Hot Reload
**Prioridade: Baixa**

```bash
mcp-weave start --watch
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

| Fase | Tasks | Estimativa |
|------|-------|------------|
| 1.1 | Testes unitários core | Sessão 1 |
| 1.2 | Exemplo básico | Sessão 1 |
| 1.3 | CI/CD | Sessão 2 |
| 2.1 | Testing utilities | Sessão 2-3 |
| 2.2 | SSE Transport | Sessão 3 |
| 2.3 | Express support | Sessão 4 |

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
