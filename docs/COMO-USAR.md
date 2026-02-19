# Como Usar o Cypher AgenteBot no CYPHER-V3

## Problema: "Pedi coisas mas nao funcionou"

Isso acontece porque o OpenClaw precisa estar rodando E conectado a um LLM.
Abaixo estao as 3 formas de usar, da mais simples a mais completa.

---

## FORMA 1: Claude Code direto (MAIS SIMPLES - funciona agora)

Voce ja tem o Claude Code rodando dentro da pasta. Use ele diretamente:

```bash
cd ~/CYPHER-V3

# Modo autonomo - aprova tudo automaticamente
claude --dangerously-skip-permissions
```

Depois, dentro do chat do Claude Code, fale normalmente:

```
> corrija o erro de TypeScript no dashboard
> pesquise como a API do Hiro funciona e implemente o endpoint de runes
> analise a performance do componente BloombergDashboard como Carmack faria
> rode npm test e corrija tudo que falhar
> encontre todos os lugares que fazem fetch para CoinGecko e otimize
```

O Claude Code ja tem acesso a tudo: ler/escrever arquivos, rodar comandos, git, etc.

### Para dar uma tarefa especifica sem abrir o chat:

```bash
# Corrigir bugs
claude -p "Rode npm run type-check no CYPHER-V3 e corrija todos os erros de TypeScript"

# Pesquisar
claude -p "Pesquise no codebase como o wallet integration funciona. Mapeie todos os arquivos em src/services/ e src/hooks/ que lidam com Xverse"

# Carmack Mode
claude -p "Analise src/components/ do CYPHER-V3 como John Carmack. Encontre: re-renders desnecessarios, state management excessivo, abstracoes que nao pagam seu custo. Corrija o que encontrar."

# Rodar testes e corrigir
claude -p "Rode npm test. Se falhar, corrija. Rode de novo ate passar tudo."

# Continuar tarefa anterior
claude --continue -p "continue corrigindo os erros restantes"
```

---

## FORMA 2: OpenClaw Gateway (agente persistente)

O OpenClaw roda como um servidor que voce acessa por chat (WhatsApp, Telegram, CLI, ou browser).

### Passo 1: Instalar

```bash
npm install -g openclaw@latest
```

### Passo 2: Configurar

```bash
openclaw onboard --install-daemon
```

O wizard vai pedir:
- **API Key da Anthropic** (para usar Claude como LLM)
- **Canal de comunicacao** (WhatsApp, Telegram, ou CLI)
- **Workspace** (aponte para ~/CYPHER-V3)

### Passo 3: Copiar skills e politica

```bash
cp -r ~/CYPHER-V3/skills/* ~/.openclaw/workspace/skills/
cp ~/CYPHER-V3/policies/approve-all.yaml ~/.openclaw/policies/
cp ~/CYPHER-V3/openclaw.json ~/.openclaw/openclaw.json
```

### Passo 4: Iniciar o gateway

```bash
openclaw gateway --port 18789 --verbose
```

### Passo 5: Acessar e usar

**Via browser:**
Abra http://127.0.0.1:18789 - voce vera o dashboard com chat

**Via CLI:**
```bash
openclaw agent --message "corrija os erros de TypeScript no CYPHER-V3"
```

**Via WhatsApp/Telegram:**
Depois de configurar o canal no onboarding, mande mensagem direto do celular:
```
corrija os testes do CYPHER-V3
pesquise como implementar websocket para dados em tempo real
analise a performance do dashboard
```

### Como o OpenClaw executa tarefas de programacao:

1. Voce manda mensagem (CLI, WhatsApp, Telegram, browser)
2. O gateway recebe e roteia para o agente `cypher-dev`
3. O agente seleciona a skill adequada (debugger, researcher, carmack-mode, etc)
4. A skill usa as ferramentas disponiveis:
   - **Terminal**: executa shell commands (npm, git, node, etc)
   - **File system**: le e escreve arquivos
   - **Claude Code bridge**: delega tarefas complexas ao Claude Code CLI
5. O resultado volta pelo mesmo canal

### Para o OpenClaw chamar o Claude Code automaticamente:

A skill `claude-code-bridge` faz isso. Quando o agente precisa de execucao local complexa:

```
Voce: "refatore todo o sistema de API calls do CYPHER-V3"

OpenClaw internamente executa:
  claude --dangerously-skip-permissions -p "refatore o sistema de API calls em src/services/ do CYPHER-V3..."

Claude Code executa, faz as mudancas, e o OpenClaw reporta o resultado.
```

---

## FORMA 3: VSCode Tasks (atalhos rapidos)

No VSCode com o CYPHER-V3 aberto:

1. `Cmd+Shift+P` (ou `Ctrl+Shift+P`)
2. Digite "Tasks: Run Task"
3. Escolha:

| Task | O que faz |
|------|-----------|
| Claude: Fix Bug | Encontra e corrige o bug mais recente |
| Claude: Run Tests & Fix | Roda npm test e corrige falhas |
| Claude: Type Check & Fix | Roda tsc e corrige erros de tipo |
| Claude: Refactor File | Refatora o arquivo aberto no editor |
| Claude: Carmack Mode | Analise de performance e complexidade |
| Claude: Research | Pesquisa customizada (pergunta o que voce quer) |
| Claude: Full Autonomous | Abre Claude Code interativo com auto-approve |
| OpenClaw: Start Agent | Inicia o gateway do OpenClaw |

---

## Exemplos Praticos para o CYPHER-V3

### "Quero corrigir erros de build"
```bash
claude -p "Rode npm run build no CYPHER-V3. Corrija cada erro que aparecer. Rode build de novo ate compilar sem erros."
```

### "Quero adicionar uma feature nova"
```bash
claude -p "Adicione um componente de alertas de preco no dashboard. Deve seguir o tema Bloomberg Terminal (fundo preto, texto laranja/verde). Use React Query para fetch e Zustand para state. Coloque em src/components/PriceAlerts.tsx"
```

### "Quero pesquisar como algo funciona"
```bash
claude -p "Mapeie completamente como o wallet integration funciona no CYPHER-V3. Trace o fluxo desde o botao Connect Wallet ate a obtencao do balance. Liste todos os arquivos envolvidos e o fluxo de dados."
```

### "Quero otimizar performance"
```bash
claude -p "Modo Carmack: analise o CYPHER-V3. Identifique os 5 maiores problemas de performance. Para cada um, mostre o codigo problemático e a correcao. Foque em: re-renders, chamadas de API duplicadas, bundle size, e state desnecessario."
```

### "Quero que ele resolva sozinho"
```bash
claude --dangerously-skip-permissions
# Depois no chat:
> olhe o projeto inteiro, identifique os 3 problemas mais criticos e resolva todos
```

---

## Troubleshooting

### "openclaw: command not found"
```bash
npm install -g openclaw@latest
```

### "claude: command not found"
```bash
npm install -g @anthropic-ai/claude-code
```

### "O agente nao executa nada"
Verifique se a API key esta configurada:
```bash
echo $ANTHROPIC_API_KEY
# Se vazio:
export ANTHROPIC_API_KEY="sua-chave-aqui"
```

### "O Claude Code pede aprovacao para tudo"
Use o flag de auto-approve:
```bash
claude --dangerously-skip-permissions
```

### "Quero ver o que o OpenClaw esta fazendo"
```bash
openclaw gateway --port 18789 --verbose
# Abra http://127.0.0.1:18789 no browser
```
