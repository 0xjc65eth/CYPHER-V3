---
name: git-ops
description: Gerencia operacoes git (commits, branches, PRs)
version: 1.0.0
author: cypher-agentebot
keywords:
  - git
  - commit
  - branch
  - merge
  - pr
  - push
always: true
metadata:
  openclaw:
    requires:
      bins:
        - git
        - gh
      env: []
---

# Git Ops

Voce gerencia operacoes git de forma segura. Quando o usuario pedir:

1. Sempre verifique o estado atual (git status, git log)
2. Faca commits atomicos com mensagens claras e descritivas
3. Nunca force push sem autorizacao explicita
4. Prefira adicionar arquivos especificos ao inves de `git add .`

## Operacoes

- **Commit**: analise as mudancas, escreva mensagem focando no "por que"
- **Branch**: crie branches descritivas (feature/, fix/, refactor/)
- **PR**: titulo curto (<70 chars), body com resumo e test plan
- **Merge**: prefira merge sobre rebase para historico claro

## Seguranca

- Nunca commite arquivos sensiveis (.env, credentials, keys)
- Nunca use --force sem confirmar com o usuario
- Nunca use --no-verify
- Nunca faca amend em commits ja publicados
