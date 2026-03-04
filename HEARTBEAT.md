# HEARTBEAT.md — Tarefas Autónomas do cypher-dev

## Instruções
O OpenClaw lê este ficheiro a cada 30 minutos.
Se houver tarefas na secção PENDING, o agente executa-as e reporta via Telegram/CLI.
Mover tarefas completadas para DONE.
O agente pode adicionar novas tarefas descobertas automaticamente.

---

## 🔴 PENDING — Tarefas Ativas

### P0: Magic Eden Migration
```
Tarefa: Encontrar todos os ficheiros que importam Magic Eden e migrar para OKX NFT API
Comandos:
  grep -rn "magic_eden\|magicEden\|MAGIC_EDEN\|MagicEden" src/ --include="*.ts" --include="*.tsx"
Skill: mock-eliminator + bitcoin-specialist
Commit: feat(ordinals): replace Magic Eden with OKX NFT API
```

### P0: Mock Data Scan
```
Tarefa: Scan completo de mock data e relatório do que falta integrar com APIs reais
Comandos:
  grep -rn "mockData\|MOCK_DATA\|isMock\|Math\.random()" src/ --include="*.ts" --include="*.tsx"
Skill: mock-eliminator
Output: relatório com lista de ficheiros e APIs necessárias
```

### P0: Type Check Report
```
Tarefa: Correr type-check e corrigir erros críticos
Comandos:
  npm run type-check 2>&1 | head -100
Skill: debugger + code-writer
Commit: fix(types): resolve TypeScript strict mode errors
```

### P1: Security Audit
```
Tarefa: Audit de segurança completo — keys expostas, rate limiting, validação
Comandos:
  grep -rn "process\.env\." src/app/api/ | grep -v "!" 
  npm audit --audit-level=high
Skill: security-auditor
Output: relatório P0/P1/P2
```

### P1: Performance Baseline
```
Tarefa: Build e análise de bundle size
Comandos:
  npm run build 2>&1 | grep "First Load JS"
Skill: performance-engineer
Alerta se: First Load JS > 400KB
```

---

## ✅ DONE — Tarefas Completadas

<!-- O agente moverá tarefas aqui após conclusão -->

---

## 📋 BACKLOG — Próximas Tarefas

### Feature: Rare Sats Watchlist
```
Descrição: Permitir utilizador guardar rare sats favoritos com alertas de preço
Skills necessárias: code-writer, bitcoin-specialist, ux-analyst
Prioridade: P2
```

### Feature: Runes Portfolio Tracker
```
Descrição: Dashboard de Runes holdings com P&L em tempo real
APIs: Hiro Runehook, UniSat Runes
Skills: code-writer, bitcoin-specialist, performance-engineer
Prioridade: P2
```

### Improvement: Agent Teams Dashboard
```
Descrição: UI para visualizar os 6 agentes a trabalhar em paralelo
Skills: ux-analyst, code-writer
Prioridade: P3
```

---

## 🔔 Alertas Automáticos
O agente monitoriza e alerta quando:
- `npm audit` encontra vulnerabilidades HIGH/CRITICAL
- Bundle size > 400KB
- TypeScript errors > 10
- Magic Eden API retorna 404/410 (deprecação confirmada)
- Redis connection failures > 3 em 1 hora
