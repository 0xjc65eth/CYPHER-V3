/**
 * CYPHER AI Trading Agent - Liquidation Guard
 * Monitors positions and prevents liquidation
 */

import { Position, RiskLimits } from '../core/types';

export class LiquidationGuard {
  private alertCallbacks: Array<(level: string, message: string, position: Position) => void> = [];

  onAlert(callback: (level: string, message: string, position: Position) => void): void {
    this.alertCallbacks.push(callback);
  }

  private emitAlert(level: string, message: string, position: Position): void {
    this.alertCallbacks.forEach(cb => cb(level, message, position));
  }

  // Check all positions for liquidation risk
  async checkPositions(positions: Position[]): Promise<Array<{
    position: Position;
    distanceToLiquidation: number;
    action: 'none' | 'warn' | 'reduce' | 'close';
    message: string;
  }>> {
    return positions.map(pos => {
      const liqPrice = this.calculateLiquidationPrice(pos);
      const distance = Math.abs(pos.currentPrice - liqPrice) / pos.currentPrice;

      if (distance < 0.02) {
        this.emitAlert('EMERGENCY', `${pos.pair} EMERGENCY - ${(distance * 100).toFixed(1)}% from liquidation`, pos);
        return { position: pos, distanceToLiquidation: distance, action: 'close' as const, message: `Emergency close: ${(distance * 100).toFixed(1)}% from liquidation` };
      }
      if (distance < 0.05) {
        this.emitAlert('CRITICAL', `${pos.pair} reducing 50% - ${(distance * 100).toFixed(1)}% from liquidation`, pos);
        return { position: pos, distanceToLiquidation: distance, action: 'reduce' as const, message: `Reduce 50%: ${(distance * 100).toFixed(1)}% from liquidation` };
      }
      if (distance < 0.10) {
        this.emitAlert('WARNING', `${pos.pair} approaching liquidation: ${(distance * 100).toFixed(1)}%`, pos);
        return { position: pos, distanceToLiquidation: distance, action: 'warn' as const, message: `Warning: ${(distance * 100).toFixed(1)}% from liquidation` };
      }

      return { position: pos, distanceToLiquidation: distance, action: 'none' as const, message: 'Position safe' };
    });
  }

  // Calculate liquidation price using Hyperliquid formula
  calculateLiquidationPrice(pos: Position): number {
    // Hyperliquid maintenance margin tiers
    const maintenanceLeverage = pos.leverage <= 3 ? 3 :
                                 pos.leverage <= 10 ? 10 :
                                 pos.leverage <= 25 ? 25 : 40;
    const l = 1 / maintenanceLeverage;
    const side = pos.direction === 'long' ? 1 : -1;
    const marginAvailable = pos.marginUsed;

    return pos.entryPrice - side * marginAvailable / pos.size / (1 - l * side);
  }

  // Check daily drawdown limit
  checkDrawdown(currentPnl: number, capital: number, limits: RiskLimits): {
    exceeded: boolean;
    level: 'safe' | 'warning' | 'critical' | 'emergency';
    drawdownPercent: number;
    action: string;
  } {
    const drawdown = currentPnl < 0 ? Math.abs(currentPnl / capital) : 0;

    if (drawdown >= limits.shutdownOnDrawdown) {
      return { exceeded: true, level: 'emergency', drawdownPercent: drawdown, action: 'SHUTDOWN - Close all and stop agent' };
    }
    if (drawdown >= limits.closeAllOnDrawdown) {
      return { exceeded: true, level: 'critical', drawdownPercent: drawdown, action: 'CLOSE ALL positions immediately' };
    }
    if (drawdown >= limits.pauseOnDrawdown) {
      return { exceeded: true, level: 'warning', drawdownPercent: drawdown, action: 'PAUSE agent - no new trades' };
    }
    return { exceeded: false, level: 'safe', drawdownPercent: drawdown, action: 'Continue trading' };
  }
}
