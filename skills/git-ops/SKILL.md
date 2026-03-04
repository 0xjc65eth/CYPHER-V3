---
name: git-ops
description: Git workflow, commits convencionais, branching strategy e deploy pipeline para CYPHER V3
version: "2.0"
tags: [git, commits, branching, deploy, ci-cd]
---

# SKILL: Git Ops — CYPHER V3

## Conventional Commits (obrigatório)
```
<tipo>(<módulo>): <descrição em inglês, imperativo, lowercase>

Tipos:
  feat     → nova feature
  fix      → bug fix
  perf     → melhoria de performance
  security → fix de segurança
  refactor → refactoring sem mudança de comportamento
  style    → formatação, sem mudança de lógica
  test     → testes
  docs     → documentação
  chore    → config, deps, tooling
  revert   → reverter commit

Módulos CYPHER V3:
  ordinals | runes | brc20 | rare-sats | trading | agent
  wallet | auth | api | ui | redis | stripe | performance
  security | types | deps | config
```

### Exemplos Corretos
```bash
git commit -m "feat(ordinals): integrate OKX NFT API as Magic Eden replacement"
git commit -m "fix(redis): add in-memory fallback when REDIS_URL is empty"
git commit -m "security(api): add zod validation to all agent routes"
git commit -m "perf(bundle): lazy load tensorflow and ccxt modules"
git commit -m "fix(agent): cleanup AgentOrchestrator interval on unmount"
git commit -m "feat(rare-sats): add satribute filtering by category"
```

## Branching Strategy
```
main              → produção (protegido)
├── staging       → pré-produção, testes finais
├── feat/[nome]   → novas features
├── fix/[nome]    → bug fixes
└── hotfix/[nome] → fixes críticos direto para main
```

### Workflow
```bash
# Nova feature
git checkout -b feat/okx-nft-integration
# ... trabalho ...
git add -p  # staging por partes — NUNCA git add .
git commit -m "feat(ordinals): add OKX NFT API client"
git push origin feat/okx-nft-integration

# Hotfix crítico
git checkout main
git checkout -b hotfix/redis-connection-crash
# ... fix ...
git commit -m "fix(redis): prevent crash when REDIS_URL is undefined"
git push origin hotfix/redis-connection-crash
```

## Pre-commit Checks (Husky)
```bash
# .husky/pre-commit
npm run type-check
npm run lint
# Se falhar → commit é bloqueado automaticamente
```

## Comandos Úteis
```bash
# Estado do projeto
git log --oneline -10
git diff HEAD --stat
git status

# Verificar o que mudou desde último commit estável
git diff c38e846 HEAD --stat
git diff c38e846 HEAD -- src/

# Reverter um ficheiro específico
git checkout HEAD -- src/path/to/file.ts

# Ver history de um ficheiro
git log --oneline src/path/to/file.ts

# Stash de trabalho temporário
git stash push -m "WIP: redis fallback"
git stash pop

# Squash de commits antes de merge
git rebase -i HEAD~3

# Verificar merge conflicts
git diff --name-only --diff-filter=U
```

## Deploy Pipeline
```bash
# Vercel (produção)
# Push para main → deploy automático
# PR preview: cada PR tem URL própria

# Railway (alternativo)
# railway up  # deploy manual
# railway logs  # ver logs em tempo real

# Docker
docker build -t cypher-v3:latest .
docker run -p 4444:4444 --env-file .env.production cypher-v3:latest
```

## Checklist Pré-Merge
```
[ ] npm run type-check → zero erros
[ ] npm run lint → zero warnings críticos
[ ] npm run build → build sucesso
[ ] npm audit → zero HIGH/CRITICAL
[ ] Sem API keys hardcoded
[ ] Sem console.log em código de produção
[ ] Sem mock data no código principal
[ ] Commits com mensagens convencionais
[ ] PR description explica o "porquê", não só o "o quê"
```

## .gitignore Crítico
```
# NUNCA comitar
.env.local
.env.production
*.pem
*.key
node_modules/
.next/
dist/
```
