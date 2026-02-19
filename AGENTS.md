# Agents

## cypher-dev

O agente principal de desenvolvimento. Roteia todas as tarefas relacionadas a codigo.

### Capacidades

| Skill | Descricao |
|-------|-----------|
| code-writer | Gera e implementa codigo |
| debugger | Diagnostica e corrige bugs |
| refactor | Refatora codigo com seguranca |
| test-runner | Cria e executa testes |
| git-ops | Gerencia git (commits, branches, PRs) |
| claude-code-bridge | Delega tarefas ao Claude Code CLI |
| researcher | Pesquisa profunda em codebases, docs, web e APIs |
| carmack-mode | Resolve problemas com first principles, performance e simplicidade radical |

### Roteamento

- Qualquer mensagem sobre codigo, bugs, testes, git → `cypher-dev`
- Mensagens pedindo implementacao de features → `cypher-dev`
- Mensagens sobre erros ou exceptions → `cypher-dev`
- Pedidos de refatoracao ou limpeza → `cypher-dev`
- Pesquisa, investigacao, "como funciona", "encontre" → `cypher-dev` (skill: researcher)
- Problemas de performance, "otimize", arquitetura complexa → `cypher-dev` (skill: carmack-mode)
- "Nao sei por que isso e lento", problemas impossveis → `cypher-dev` (skill: carmack-mode)

### Modelo

- Provider: Anthropic
- Model: claude-opus-4-6
- Temperature: 0.3 (determinismo alto para codigo)
