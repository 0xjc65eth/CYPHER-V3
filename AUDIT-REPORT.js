const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat, TabStopType, TabStopPosition } = require('docx');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "1A1A2E", type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FF8C00", font: "Arial", size: 18 })] })]
  });
}

function cell(text, width, opts = {}) {
  const color = opts.color || "FFFFFF";
  const fill = opts.fill || "0D0D1A";
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text: String(text), color, font: "Arial", size: 17, bold: opts.bold || false })] })]
  });
}

function severityCell(severity, width) {
  const colors = {
    'CRITICAL': { fill: "4A0000", color: "FF4444" },
    'HIGH': { fill: "4A2200", color: "FF8800" },
    'MEDIUM': { fill: "4A4A00", color: "FFCC00" },
    'LOW': { fill: "003300", color: "66FF66" },
    'WORKING': { fill: "003300", color: "66FF66" },
    'PARTIAL': { fill: "4A4A00", color: "FFCC00" },
    'BROKEN': { fill: "4A0000", color: "FF4444" },
    'SIMULATED': { fill: "4A2200", color: "FF8800" },
  };
  const c = colors[severity] || { fill: "1A1A2E", color: "FFFFFF" };
  return cell(severity, width, { fill: c.fill, color: c.color, bold: true });
}

function scoreRow(label, score, maxScore = 10) {
  const pct = score / maxScore;
  const color = pct >= 0.7 ? "66FF66" : pct >= 0.4 ? "FFCC00" : "FF4444";
  return new TableRow({
    children: [
      cell(label, 4680, { bold: true, color: "FF8C00" }),
      cell(`${score} / ${maxScore}`, 2340, { color, bold: true }),
      cell(pct >= 0.7 ? "Aceitavel" : pct >= 0.4 ? "Atencao" : "Critico", 2340, { color })
    ]
  });
}

function sectionTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, color: "FF8C00", font: "Arial", size: 28 })]
  });
}

function subTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, color: "CCCCCC", font: "Arial", size: 24 })]
  });
}

function bodyText(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, color: "BBBBBB", font: "Arial", size: 20 })]
  });
}

function boldText(label, value) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: label, bold: true, color: "FF8C00", font: "Arial", size: 20 }),
      new TextRun({ text: value, color: "BBBBBB", font: "Arial", size: 20 })
    ]
  });
}

// ============ BUILD DOCUMENT ============

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20, color: "BBBBBB" } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "FF8C00" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "CCCCCC" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
    ]
  },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
    }]
  },
  sections: [
    // ===== COVER PAGE =====
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
        new Paragraph({ spacing: { before: 3000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "CYPHER ORDi FUTURE V3", bold: true, color: "FF8C00", font: "Arial", size: 52 })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: "AUDITORIA TECNICA COMPLETA", color: "FFFFFF", font: "Arial", size: 36 })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
          children: [new TextRun({ text: "Relatorio de Seguranca, Performance, UX e Integridade de Dados", color: "888888", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: "24 de Fevereiro de 2026", color: "888888", font: "Arial", size: 20 })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 1500 },
          children: [new TextRun({ text: "Classificacao: CONFIDENCIAL", bold: true, color: "FF4444", font: "Arial", size: 24 })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: "Auditor: Claude AI | Nivel: Institucional", color: "666666", font: "Arial", size: 18 })]
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ]
    },

    // ===== MAIN CONTENT =====
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "CYPHER V3 AUDIT REPORT", color: "FF8C00", font: "Arial", size: 16 }),
              new TextRun({ text: "\tCONFIDENCIAL", color: "FF4444", font: "Arial", size: 16 })
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "333333" } }
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "CYPHER ORDi Future V3 - Auditoria Tecnica", color: "555555", font: "Arial", size: 14 }),
              new TextRun({ text: "\tPagina ", color: "555555", font: "Arial", size: 14 }),
              new TextRun({ children: [PageNumber.CURRENT], color: "555555", font: "Arial", size: 14 })
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            border: { top: { style: BorderStyle.SINGLE, size: 1, color: "333333" } }
          })]
        })
      },
      children: [
        // ===== EXECUTIVE SUMMARY =====
        sectionTitle("1. RESUMO EXECUTIVO"),
        bodyText("Esta auditoria tecnica completa do CYPHER ORDi Future V3 foi conduzida analisando 1.823 arquivos TypeScript, 648 componentes React, 200+ rotas de API, e todos os servicos de backend. A analise cobriu seguranca, performance, integridade de dados, experiencia do usuario e capacidade de trading."),

        subTitle("1.1 Scores Finais"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4680, 2340, 2340],
          rows: [
            new TableRow({ children: [headerCell("Categoria", 4680), headerCell("Score", 2340), headerCell("Status", 2340)] }),
            scoreRow("Estrutura & Navegacao", 8),
            scoreRow("Seguranca", 3),
            scoreRow("Integridade de Dados (Financeiro)", 4),
            scoreRow("UX / Experiencia do Usuario", 6),
            scoreRow("Trading Bot", 5),
            scoreRow("AI Agent", 5),
            scoreRow("Performance", 6),
            scoreRow("Wallet Integration", 6),
            scoreRow("SCORE GERAL", 5.4, 10),
          ]
        }),

        new Paragraph({ spacing: { before: 200 } }),
        boldText("Risco de Producao HOJE: ", "ALTO - Chaves de API expostas no Git, precos fallback desatualizados em alguns componentes, trading bot com stop-loss incorreto."),
        boldText("Risco sob Mercado Extremo: ", "CRITICO - Stop-loss implementado como limit order (nao dispara em gap-down), sem mutex para ordens duplicadas, sem reconciliacao de posicoes apos crash."),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== SECTION 2: STRUCTURE =====
        sectionTitle("2. ESTRUTURA & ABAS"),
        bodyText("O projeto possui 25+ paginas, organizadas com Next.js App Router. A navegacao e intuitiva com layout Bloomberg Terminal."),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 2800, 1600, 2760],
          rows: [
            new TableRow({ children: [headerCell("Rota", 2200), headerCell("Funcao", 2800), headerCell("Status", 1600), headerCell("Observacao", 2760)] }),
            new TableRow({ children: [cell("/", 2200), cell("Bloomberg Dashboard", 2800), severityCell("WORKING", 1600), cell("Real data + fallback", 2760)] }),
            new TableRow({ children: [cell("/portfolio", 2200), cell("Portfolio (6 tabs)", 2800), severityCell("PARTIAL", 1600), cell("Mock transaction history", 2760)] }),
            new TableRow({ children: [cell("/trading", 2200), cell("SMC Trading Terminal", 2800), severityCell("PARTIAL", 1600), cell("HyperLiquid simulado parcial", 2760)] }),
            new TableRow({ children: [cell("/quick-trade", 2200), cell("DEX Aggregator", 2800), severityCell("PARTIAL", 1600), cell("Mock prices no fallback", 2760)] }),
            new TableRow({ children: [cell("/ordinals", 2200), cell("Ordinals Marketplace", 2800), severityCell("PARTIAL", 1600), cell("Buy/Sell nao implementado", 2760)] }),
            new TableRow({ children: [cell("/runes", 2200), cell("Runes Terminal", 2800), severityCell("WORKING", 1600), cell("API real + fallback", 2760)] }),
            new TableRow({ children: [cell("/arbitrage", 2200), cell("8-Exchange Arbitrage", 2800), severityCell("PARTIAL", 1600), cell("Scanner real, exec simulada", 2760)] }),
            new TableRow({ children: [cell("/cypher-ai", 2200), cell("AI Terminal (8 agentes)", 2800), severityCell("PARTIAL", 1600), cell("Grok funcional, voz parcial", 2760)] }),
            new TableRow({ children: [cell("/brc20", 2200), cell("BRC-20 Tokens", 2800), severityCell("PARTIAL", 1600), cell("Transfers sao mock", 2760)] }),
            new TableRow({ children: [cell("/miners", 2200), cell("Mining Data", 2800), severityCell("WORKING", 1600), cell("Dados reais mempool.space", 2760)] }),
            new TableRow({ children: [cell("/wallet", 2200), cell("Wallet Management", 2800), severityCell("PARTIAL", 1600), cell("Connect OK, PSBT incompleto", 2760)] }),
            new TableRow({ children: [cell("/settings", 2200), cell("Configuracoes", 2800), severityCell("WORKING", 1600), cell("4 tabs funcionais", 2760)] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== SECTION 3: SECURITY =====
        sectionTitle("3. SEGURANCA"),
        bodyText("A auditoria de seguranca revelou vulnerabilidades criticas que requerem acao imediata."),

        subTitle("3.1 Vulnerabilidades Criticas"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1200, 3360, 2400, 2400],
          rows: [
            new TableRow({ children: [headerCell("Sev.", 1200), headerCell("Problema", 3360), headerCell("Arquivo", 2400), headerCell("Impacto", 2400)] }),
            new TableRow({ children: [severityCell("CRITICAL", 1200), cell("20+ API keys expostas no .env.local commitado no Git", 3360), cell(".env.local, .env", 2400), cell("Comprometimento total de todas as APIs", 2400)] }),
            new TableRow({ children: [severityCell("CRITICAL", 1200), cell("JWT secrets hardcoded (NEXTAUTH, ADMIN, AGENT)", 3360), cell(".env.local linhas 22-25", 2400), cell("Escalacao de privilegios admin", 2400)] }),
            new TableRow({ children: [severityCell("CRITICAL", 1200), cell("Fallback key hardcoded: cypher-v3-dev-key", 3360), cell("agent/wallet/SecureKeyStore.ts", 2400), cell("Decriptacao de session keys", 2400)] }),
            new TableRow({ children: [severityCell("HIGH", 1200), cell("CSP com unsafe-eval permite XSS", 3360), cell("middleware.ts:67", 2400), cell("Injecao de codigo malicioso", 2400)] }),
            new TableRow({ children: [severityCell("HIGH", 1200), cell("JWT token aceito via query string", 3360), cell("adminAuth.ts:300", 2400), cell("Leak via referrer/logs", 2400)] }),
            new TableRow({ children: [severityCell("HIGH", 1200), cell("Nonce gerado com Math.random()", 3360), cell("transaction-validator.ts:32", 2400), cell("Falsificacao de transacoes", 2400)] }),
            new TableRow({ children: [severityCell("HIGH", 1200), cell("Rate limiting definido mas NAO aplicado", 3360), cell("lib/api-middleware.ts:154", 2400), cell("Brute force / DoS", 2400)] }),
            new TableRow({ children: [severityCell("MEDIUM", 1200), cell("Session keys sem mecanismo de revogacao", 3360), cell("SessionKeyManager.ts", 2400), cell("Keys comprometidas ativas", 2400)] }),
            new TableRow({ children: [severityCell("MEDIUM", 1200), cell("BigInt overflow silencioso (MAX_SAFE_INTEGER)", 3360), cell("lib/wallet/bigint-fix.ts", 2400), cell("Erros em calculos financeiros", 2400)] }),
          ]
        }),

        boldText("ACAO IMEDIATA NECESSARIA: ", "Rotacionar TODAS as chaves de API, remover .env do Git, usar secrets manager (Vercel Secrets ou similar), substituir Math.random() por crypto.randomBytes()."),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== SECTION 4: DATA INTEGRITY =====
        sectionTitle("4. INTEGRIDADE DE DADOS"),
        bodyText("Foram encontrados precos fallback obsoletos em multiplos arquivos. As correcoes ja aplicadas atualizaram os precos para valores de Fev 2026 (BTC ~$63.500, ETH ~$1.850)."),

        subTitle("4.1 Precos Corrigidos Nesta Auditoria"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3500, 1500, 1500, 2860],
          rows: [
            new TableRow({ children: [headerCell("Arquivo", 3500), headerCell("Antes", 1500), headerCell("Depois", 1500), headerCell("Status", 2860)] }),
            new TableRow({ children: [cell("config/api-keys.ts", 3500), cell("BTC $64k", 1500), cell("BTC $63.5k", 1500), severityCell("WORKING", 2860)] }),
            new TableRow({ children: [cell("coinmarketcap/route.ts (3x)", 3500), cell("BTC $105k", 1500), cell("Centralizado", 1500), severityCell("WORKING", 2860)] }),
            new TableRow({ children: [cell("optimizedQuickTrade.ts", 3500), cell("BTC $67k", 1500), cell("BTC $63.5k", 1500), severityCell("WORKING", 2860)] }),
            new TableRow({ children: [cell("mobile/CypherMobileApp.tsx", 3500), cell("BTC $45k", 1500), cell("BTC $63.5k", 1500), severityCell("WORKING", 2860)] }),
            new TableRow({ children: [cell("hyperliquid.ts", 3500), cell("BTC $98.5k", 1500), cell("BTC $63.5k", 1500), severityCell("WORKING", 2860)] }),
            new TableRow({ children: [cell("BlockchainEventService.ts", 3500), cell("BTC $105k", 1500), cell("BTC $63.5k", 1500), severityCell("WORKING", 2860)] }),
            new TableRow({ children: [cell("ClickableHeatmap.tsx", 3500), cell("BTC $67.4k", 1500), cell("BTC $63.5k", 1500), severityCell("WORKING", 2860)] }),
            new TableRow({ children: [cell("YieldFarmingEngine.ts", 3500), cell("BTC $45k", 1500), cell("BTC $63.5k", 1500), severityCell("WORKING", 2860)] }),
            new TableRow({ children: [cell("priceComparison.ts", 3500), cell("BTC $42k", 1500), cell("BTC $63.5k", 1500), severityCell("WORKING", 2860)] }),
            new TableRow({ children: [cell("macro-indicators/route.ts", 3500), cell("Fed 5.50%", 1500), cell("Fed 4.50%", 1500), severityCell("WORKING", 2860)] }),
          ]
        }),

        subTitle("4.2 Dados Ainda Simulados (Requerem API Real)"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3000, 2500, 1600, 2260],
          rows: [
            new TableRow({ children: [headerCell("Sistema", 3000), headerCell("Tipo de Dado", 2500), headerCell("Status", 1600), headerCell("Impacto", 2260)] }),
            new TableRow({ children: [cell("Discord API Service", 3000), cell("Mensagens, sentimento", 2500), severityCell("SIMULATED", 1600), cell("Analise social falsa", 2260)] }),
            new TableRow({ children: [cell("Reddit API Service", 3000), cell("Posts, comentarios", 2500), severityCell("SIMULATED", 1600), cell("Sentimento inventado", 2260)] }),
            new TableRow({ children: [cell("Twitter API Service", 3000), cell("Tweets, trending", 2500), severityCell("SIMULATED", 1600), cell("Dados sociais falsos", 2260)] }),
            new TableRow({ children: [cell("Bloomberg API", 3000), cell("Market data financ.", 2500), severityCell("SIMULATED", 1600), cell("Retorna zeros", 2260)] }),
            new TableRow({ children: [cell("Portfolio History", 3000), cell("Transacoes", 2500), severityCell("SIMULATED", 1600), cell("Historico inventado", 2260)] }),
            new TableRow({ children: [cell("News Feed", 3000), cell("Noticias", 2500), severityCell("PARTIAL", 1600), cell("Fallback com msgs sistema", 2260)] }),
            new TableRow({ children: [cell("Ordinals Buy/Sell", 3000), cell("Execucao de trade", 2500), severityCell("BROKEN", 1600), cell("Botoes sem funcao", 2260)] }),
            new TableRow({ children: [cell("BRC20 Transfers", 3000), cell("Transferencias", 2500), severityCell("SIMULATED", 1600), cell("TXID falso gerado", 2260)] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== SECTION 5: TRADING BOT =====
        sectionTitle("5. BOT DE TRADING"),
        bodyText("O sistema de trading possui DUAS implementacoes diferentes: uma simulada (AutomatedTradingBot.ts) e uma real (AgentOrchestrator.ts via HyperliquidConnector). Isso cria confusao e risco."),

        subTitle("5.1 Problemas Criticos do Bot"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1200, 4360, 3800],
          rows: [
            new TableRow({ children: [headerCell("Sev.", 1200), headerCell("Problema", 4360), headerCell("Impacto Real", 3800)] }),
            new TableRow({ children: [severityCell("CRITICAL", 1200), cell("Stop-loss implementado como LIMIT order, nao STOP order", 4360), cell("Em crash (gap-down), stop NUNCA executa. Posicao vai ate liquidacao.", 3800)] }),
            new TableRow({ children: [severityCell("HIGH", 1200), cell("Sem mutex/lock para execucao de ordens. Race condition possivel.", 4360), cell("2 strategies identicas = 2 ordens duplicadas no mesmo tick.", 3800)] }),
            new TableRow({ children: [severityCell("HIGH", 1200), cell("Sem reconciliacao de posicoes apos restart do agent.", 4360), cell("Crash com posicao aberta = posicao orfaa sem gerenciamento.", 3800)] }),
            new TableRow({ children: [severityCell("MEDIUM", 1200), cell("Sem retry com backoff para falha de ordem.", 4360), cell("Ordem falha por timeout = ignorada, sem nova tentativa.", 3800)] }),
            new TableRow({ children: [severityCell("MEDIUM", 1200), cell("Dedup cache key usa signal.id que pode ser vazio.", 4360), cell("Colisao de hash, falsos positivos no dedup.", 3800)] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== SECTION 6: AI AGENT =====
        sectionTitle("6. AGENTE IA"),
        bodyText("O sistema de IA usa ConsensusEngine com 8 agentes especializados e integracao Grok/xAI. A execucao e automatica quando confianca >= 65%."),

        subTitle("6.1 Riscos do AI Agent"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1200, 4360, 3800],
          rows: [
            new TableRow({ children: [headerCell("Sev.", 1200), headerCell("Problema", 4360), headerCell("Risco", 3800)] }),
            new TableRow({ children: [severityCell("CRITICAL", 1200), cell("AI executa trades sem confirmacao do usuario (auto-approve)", 4360), cell("Decisao errada = perda financeira automatica.", 3800)] }),
            new TableRow({ children: [severityCell("MEDIUM", 1200), cell("Prompt injection parcialmente protegida (regex incompleto)", 4360), cell("Atacante pode manipular contexto do LLM.", 3800)] }),
            new TableRow({ children: [severityCell("MEDIUM", 1200), cell("Fallback para dados mock quando APIs falham", 4360), cell("AI toma decisoes baseadas em dados falsos.", 3800)] }),
            new TableRow({ children: [severityCell("LOW", 1200), cell("Contexto perdido apos restart (sem persistencia longa)", 4360), cell("Perde historico de trades e aprendizado.", 3800)] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== SECTION 7: PERFORMANCE =====
        sectionTitle("7. PERFORMANCE & MEMORIA"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1200, 4360, 3800],
          rows: [
            new TableRow({ children: [headerCell("Sev.", 1200), headerCell("Problema", 4360), headerCell("Impacto", 3800)] }),
            new TableRow({ children: [severityCell("MEDIUM", 1200), cell("WebSocket sem limite de tamanho de mensagem", 4360), cell("DoS via mensagens gigantes.", 3800)] }),
            new TableRow({ children: [severityCell("MEDIUM", 1200), cell("Cache de audio (voiceResponseCache) nunca limpo", 4360), cell("Memory leak gradual = OOM em producao.", 3800)] }),
            new TableRow({ children: [severityCell("MEDIUM", 1200), cell("TensorFlow.js (200MB+) importado mas provavelmente nao usado", 4360), cell("Bundle pesado desnecessario.", 3800)] }),
            new TableRow({ children: [severityCell("LOW", 1200), cell("298 de 648 componentes sem error handling", 4360), cell("UI quebra silenciosamente.", 3800)] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== SECTION 8: RECOMMENDATIONS =====
        sectionTitle("8. ACOES RECOMENDADAS POR PRIORIDADE"),

        subTitle("8.1 IMEDIATO (Semana 1) - Seguranca"),
        bodyText("1. ROTACIONAR todas as API keys expostas (CMC, Hiro, UniSat, Magic Eden, Hyperliquid, Grok, ElevenLabs, Gemini, etc.)"),
        bodyText("2. Remover .env e .env.local do Git (git filter-branch ou BFG Repo-Cleaner)"),
        bodyText("3. Implementar secrets manager (Vercel Secrets, AWS Secrets Manager)"),
        bodyText("4. Substituir Math.random() por crypto.randomBytes() no transaction-validator"),
        bodyText("5. Remover unsafe-eval do CSP no middleware.ts"),

        subTitle("8.2 CURTO PRAZO (Mes 1) - Trading"),
        bodyText("1. Converter stop-loss de LIMIT para STOP order no Hyperliquid"),
        bodyText("2. Adicionar mutex/lock atomico para execucao de sinais"),
        bodyText("3. Implementar reconciliacao de posicoes no startup do agent"),
        bodyText("4. Adicionar confirmacao do usuario antes de trades acima de threshold"),
        bodyText("5. Corrigir prompt injection sanitization no LLMConsensusAgent"),

        subTitle("8.3 MEDIO PRAZO (Trimestre 1) - Features"),
        bodyText("1. Integrar APIs reais: Discord, Reddit, Twitter (credenciais necessarias)"),
        bodyText("2. Implementar buy/sell real no Ordinals TradingDesk"),
        bodyText("3. Implementar BRC20 transfers reais (nao mock)"),
        bodyText("4. Conectar WebSocket real para charts em tempo real"),
        bodyText("5. Limpar dependencias pesadas nao utilizadas (TensorFlow.js)"),
        bodyText("6. Adicionar error handling nos 298 componentes sem try/catch"),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== SECTION 9: FINAL SCORES =====
        sectionTitle("9. VEREDITO FINAL"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [
            new TableRow({ children: [headerCell("Metrica", 4680), headerCell("Avaliacao", 4680)] }),
            new TableRow({ children: [cell("Score Estrutural", 4680, { bold: true }), cell("8/10 - Excelente arquitetura, 25+ paginas bem organizadas", 4680, { color: "66FF66" })] }),
            new TableRow({ children: [cell("Score Seguranca", 4680, { bold: true }), cell("3/10 - CRITICO: Keys expostas, CSP fraco, nonce inseguro", 4680, { color: "FF4444" })] }),
            new TableRow({ children: [cell("Score Financeiro (Dados)", 4680, { bold: true }), cell("4/10 - Precos corrigidos, mas dados sociais/portfolio simulados", 4680, { color: "FF8800" })] }),
            new TableRow({ children: [cell("Score UX", 4680, { bold: true }), cell("6/10 - UI profissional, mas botoes inativos e dados mock visiveis", 4680, { color: "FFCC00" })] }),
            new TableRow({ children: [cell("Risco em Producao Hoje", 4680, { bold: true }), cell("ALTO - Nao deve operar com dinheiro real ate corrigir seguranca", 4680, { color: "FF4444" })] }),
            new TableRow({ children: [cell("Risco sob Mercado Extremo", 4680, { bold: true }), cell("CRITICO - Stop-loss nao funciona em crash, posicoes orfas possiveis", 4680, { color: "FF4444" })] }),
          ]
        }),

        new Paragraph({ spacing: { before: 400 } }),
        bodyText("CONCLUSAO: O CYPHER V3 possui uma arquitetura impressionante com 25+ paginas, 648 componentes, 200+ APIs e integracao com 8+ exchanges. A estrutura Bloomberg Terminal e profissional e o potencial e enorme. No entanto, a seguranca precisa de atencao IMEDIATA (keys expostas, CSP fraco) e o trading bot tem um bug critico no stop-loss que pode causar perdas reais. Apos corrigir seguranca e trading, o projeto estara pronto para beta controlado com usuarios reais."),

        new Paragraph({ spacing: { before: 200 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: "--- FIM DO RELATORIO ---", color: "FF8C00", font: "Arial", size: 20, bold: true })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
          children: [new TextRun({ text: "Gerado automaticamente por Claude AI Auditor | 24/02/2026", color: "555555", font: "Arial", size: 16 })]
        }),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/sessions/gifted-wizardly-bardeen/mnt/CYPHER-V3/CYPHER-V3-AUDIT-REPORT.docx", buffer);
  console.log("Report generated successfully!");
});
