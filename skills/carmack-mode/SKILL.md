---
name: carmack-mode
description: Modo John Carmack — foco absoluto numa única tarefa técnica, sem distrações, implementação direta e eficiente
version: "2.0"
tags: [focus, performance, implementation, no-bs]
---

# SKILL: Carmack Mode — CYPHER V3

## Princípio Fundamental
"Trabalha no problema. Não fales sobre o problema."
— Inspirado em John Carmack (id Software, Oculus, Keen Technologies)

## Ativação
Ativar quando a tarefa é:
- Uma bug crítica que bloqueia produção
- Performance degradada acima de threshold
- Feature com deadline iminente
- Problema que já foi "discutido" demasiado sem progresso

## Modo de Operação

### 1. Lê o código antes de qualquer coisa
```bash
# Nunca assumir — sempre ler o código real
cat src/[ficheiro relevante]
grep -rn "[símbolo]" src/
```

### 2. Identifica o root cause
- Não o sintoma — a CAUSA RAIZ
- "O Redis não conecta" → porquê? → "REDIS_URL está vazio" → porquê? → "fallback não implementado"
- Desce até ao fundo antes de escrever uma linha de código

### 3. Menor mudança que resolve o problema
```typescript
// Carmack não reescreve o mundo para resolver um bug
// Faz a mudança MÍNIMA e CIRÚRGICA

// ❌ Carmack NÃO faz:
// "Vou refatorar todo o sistema de cache enquanto estou aqui..."

// ✅ Carmack FAZ:
// Encontra a linha exata, muda o mínimo necessário, testa, commit.
```

### 4. Escreve o código, não a documentação
- Zero comentários desnecessários
- Nomes de variáveis que se auto-documentam
- Se precisas de comentário para explicar COMO funciona → reescreve o código
- Comentários para explicar PORQUÊ está assim → aceitável

### 5. Verifica antes de declarar vitória
```bash
npm run type-check   # zero erros
npm run lint         # zero warnings relevantes
npm run build        # build com sucesso
# Se há testes para o módulo:
npm test -- --testPathPattern="[módulo]"
```

## Anti-Padrões em Carmack Mode
```
❌ "Posso também melhorar..."
❌ "Enquanto estou aqui, vou refatorar..."
❌ "Talvez devêssemos considerar..."
❌ "Em teoria, poderíamos..."
❌ Mais de 150 linhas para uma bug fix
❌ Mudar 5 ficheiros para resolver 1 problema
```

## Métricas de Sucesso
- Problema resolvido? ✅
- Regressões introduzidas? ❌
- Build passa? ✅
- Código mais simples que antes? ✅ (se possível)

## Exemplos de Carmack Mode no CYPHER V3

### Problema: Mock data em produção no módulo Runes
```bash
# 1. Encontrar exatamente onde está
grep -rn "mockData\|MOCK" src/services/runes/
# 2. Ver o ficheiro completo
cat src/services/runes/[ficheiro]
# 3. Substituir pela call real à API
# 4. Verificar que não quebrou nada
npm run type-check && npm run build
```

### Problema: AgentOrchestrator memory leak
```bash
# 1. Encontrar o setInterval
grep -n "setInterval" src/agent/core/AgentOrchestrator.ts
# 2. Ver o useEffect que o contém
# 3. Adicionar cleanup return
# 4. Verificar
```

## Outputs Esperados em Carmack Mode
- Diff limpo, focado
- Commit message preciso: `fix(runes): replace mock data with OKX NFT API`
- Nenhuma feature desnecessária adicionada
- Código MAIS simples que o original (se possível)
- Build verde

## Citação Operacional
"Uma boa solução aplicada agressivamente agora é melhor que uma solução perfeita aplicada amanhã."
