# MCP-Weave - Raciocínio e Decisões

> Este arquivo documenta o raciocínio, decisões e progresso do desenvolvimento do MCP-Weave.

---

## 📅 Sessão: 31/01/2026

### Estado Atual
- [x] Documento de contexto criado (mcp-weave.md)
- [x] Estrutura do monorepo
- [x] Package @mcp-weave/core
- [x] Package @mcp-weave/cli
- [x] Package @mcp-weave/nestjs
- [x] Package @mcp-weave/testing

### Próximos Passos
1. ~~Inicializar estrutura do monorepo com pnpm workspaces~~ ✅
2. ~~Configurar Turbo para builds~~ ✅
3. ~~Configurar TypeScript, ESLint, Prettier~~ ✅
4. ~~Implementar @mcp-weave/core (MVP)~~ ✅
5. ~~Implementar @mcp-weave/nestjs (MVP)~~ ✅
6. ~~Implementar @mcp-weave/cli (MVP)~~ ✅
7. Instalar dependências e testar build
8. Criar exemplo básico

---

## 🧠 Decisões de Arquitetura

### Monorepo com pnpm + Turbo
**Por quê?**
- pnpm é mais eficiente em espaço e velocidade
- Turbo oferece cache inteligente e builds paralelos
- Facilita desenvolvimento coordenado entre packages

### Ordem de Implementação
1. **core** primeiro - é a base de tudo
2. **nestjs** segundo - decorators dependem do core
3. **cli** terceiro - usa core para parsing/generation
4. **testing** por último - utilities que dependem dos outros

---

## 📝 Notas de Implementação

### @mcp-weave/core
```
Responsabilidades:
├── spec/
│   ├── parser.ts      → Parse mcp-spec.yaml
│   ├── validator.ts   → Validar spec contra schema
│   └── types.ts       → Tipos TypeScript para spec
├── scanner/
│   └── metadata.ts    → Extrair metadata de decorators
├── generator/
│   ├── server.ts      → Gerar código do servidor
│   └── templates/     → Templates de código
└── index.ts           → Exports públicos
```

### @mcp-weave/nestjs
```
Responsabilidades:
├── decorators/
│   ├── mcp-server.ts
│   ├── mcp-tool.ts
│   ├── mcp-resource.ts
│   ├── mcp-prompt.ts
│   └── params.ts      → @McpInput, @McpParam, @McpPromptArg
├── metadata/
│   └── storage.ts     → Reflect metadata storage
├── runtime/
│   └── server.ts      → Runtime MCP server
└── index.ts
```

### @mcp-weave/cli
```
Responsabilidades:
├── commands/
│   ├── generate.ts    → mcp-weave generate
│   ├── start.ts       → mcp-weave start
│   ├── extract.ts     → mcp-weave extract
│   └── init.ts        → mcp-weave init
├── utils/
└── index.ts
```

---

## 🔄 Progresso

| Task | Status | Notas |
|------|--------|-------|
| Criar REASONING.md | ✅ | Este arquivo |
| Estrutura monorepo | ✅ | pnpm + turbo + changesets |
| Configuração base | ✅ | tsconfig, eslint, prettier |
| @mcp-weave/core | ✅ | Parser, validator, generator (51 tests) |
| @mcp-weave/nestjs | ✅ | Decorators + runtime server (42 tests) |
| @mcp-weave/cli | ✅ | generate, init, start, extract (12 tests) |
| @mcp-weave/testing | ✅ | Mock server, transport, assertions (47 tests) |
| Testes unitários | ✅ | 152 testes passando |

---

## 🐛 Problemas Encontrados

_(Será atualizado durante o desenvolvimento)_

---

## 💡 Ideias Futuras

- [ ] Plugin system para frameworks adicionais
- [ ] VS Code extension para preview de spec
- [ ] Playground online para testar specs
- [ ] Geração automática de documentação

---

## 📚 Referências

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Anthropic MCP](https://www.anthropic.com/news/model-context-protocol)
- [NestJS Decorators](https://docs.nestjs.com/custom-decorators)
- [Turbo Docs](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
