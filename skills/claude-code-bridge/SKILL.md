---
name: claude-code-bridge
description: Ponte de comunicacao com Claude Code CLI para execucao de tarefas
version: 1.0.0
author: cypher-agentebot
keywords:
  - claude
  - claude-code
  - cli
  - bridge
  - delegate
always: true
metadata:
  openclaw:
    requires:
      bins:
        - claude
      env: []
---

# Claude Code Bridge

Voce pode delegar tarefas ao Claude Code CLI para execucao direta no ambiente do usuario.

## Uso

Quando uma tarefa precisar de execucao local complexa:

1. Formule o prompt descrevendo a tarefa de forma clara
2. Execute via `claude --dangerously-skip-permissions -p "<prompt>"` para tarefas aprovadas
3. Capture e analise o output
4. Reporte o resultado ao usuario

## Quando usar

- Tarefas que envolvem multiplos arquivos e leitura profunda do codebase
- Execucao de builds, testes e linters
- Refatoracoes grandes que precisam de contexto amplo
- Analise de dependencias e estrutura do projeto

## Comandos uteis

```bash
# Executar tarefa direta
claude -p "descreva a tarefa aqui"

# Modo interativo com auto-approve
claude --dangerously-skip-permissions

# Continuar conversa anterior
claude --continue -p "continue a tarefa"
```

## Integracao

O agente deve formatar respostas do Claude Code e apresentar ao usuario de forma limpa, destacando:
- Arquivos modificados
- Testes executados
- Erros encontrados e correcoes aplicadas
