import { NextRequest, NextResponse } from 'next/server';

// Commands that require explicit confirmation before execution
const DANGEROUS_ACTIONS = new Set(['BUY', 'SELL_ALL', 'START_AUTO_TRADE', 'EMERGENCY_STOP']);

// Safe commands that can execute immediately
const SAFE_ACTIONS = new Set(['SHOW_PORTFOLIO']);

// Mapeamento simples de comandos informais
const commandMap: { [key: string]: any } = {
  'compra bitcoin': { action: 'BUY', asset: 'BTC' },
  'compra btc': { action: 'BUY', asset: 'BTC' },
  'compra': { action: 'BUY', asset: 'BTC' },
  'vende tudo': { action: 'SELL_ALL' },
  'mostra carteira': { action: 'SHOW_PORTFOLIO' },
  'liga robo': { action: 'START_AUTO_TRADE' },
  'liga o robo': { action: 'START_AUTO_TRADE' },
  'para tudo': { action: 'EMERGENCY_STOP' }
};

// In-memory pending confirmations (in production, use Redis with TTL)
const pendingConfirmations = new Map<string, { action: any; expiresAt: number; command: string }>();

export async function POST(request: NextRequest) {
  try {
    const { command, confirmationId } = await request.json();

    // Handle confirmation of a pending action
    if (confirmationId) {
      const pending = pendingConfirmations.get(confirmationId);
      if (!pending) {
        return NextResponse.json({
          success: false,
          response: 'Confirmação expirada ou inválida. Repita o comando.',
        });
      }
      if (Date.now() > pending.expiresAt) {
        pendingConfirmations.delete(confirmationId);
        return NextResponse.json({
          success: false,
          response: 'Confirmação expirou (30s). Repita o comando.',
        });
      }

      // Confirmed - execute the action
      pendingConfirmations.delete(confirmationId);
      return NextResponse.json({
        success: true,
        action: pending.action,
        confirmed: true,
        response: `Confirmado! Executando: ${pending.action.action}`,
        timestamp: new Date().toISOString()
      });
    }

    // Process new voice command
    const normalizedCommand = command.toLowerCase().trim();

    // Buscar comando correspondente
    let matchedAction = null;
    let matchedPattern = '';
    for (const [pattern, action] of Object.entries(commandMap)) {
      if (normalizedCommand.includes(pattern)) {
        matchedAction = action;
        matchedPattern = pattern;
        break;
      }
    }

    if (!matchedAction) {
      return NextResponse.json({
        success: false,
        response: 'Não entendi o comando. Tenta de novo?',
        suggestions: ['compra bitcoin', 'mostra carteira', 'liga robô']
      });
    }

    // Safe actions execute immediately
    if (SAFE_ACTIONS.has(matchedAction.action)) {
      return NextResponse.json({
        success: true,
        action: matchedAction,
        confirmed: true,
        response: `Executando: ${matchedAction.action}`,
        timestamp: new Date().toISOString()
      });
    }

    // Dangerous actions require confirmation
    if (DANGEROUS_ACTIONS.has(matchedAction.action)) {
      const id = `confirm_${Date.now()}`;
      pendingConfirmations.set(id, {
        action: matchedAction,
        expiresAt: Date.now() + 30000, // 30 second expiry
        command: matchedPattern,
      });

      // Clean up expired confirmations
      for (const [key, val] of pendingConfirmations) {
        if (Date.now() > val.expiresAt) pendingConfirmations.delete(key);
      }

      return NextResponse.json({
        success: true,
        requiresConfirmation: true,
        confirmationId: id,
        action: matchedAction,
        response: `Você quer ${matchedPattern}? Diga "confirma" ou clique para confirmar. Expira em 30 segundos.`,
        expiresIn: 30,
        timestamp: new Date().toISOString()
      });
    }

    // Fallback - should not reach here
    return NextResponse.json({
      success: false,
      response: 'Comando não reconhecido.',
    });
  } catch (error) {
    console.error('[Voice Command] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar comando de voz' },
      { status: 500 }
    );
  }
}
