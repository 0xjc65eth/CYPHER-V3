/**
 * CYPHER AI Trading Agent - Risk Manager Agent
 * Evaluates trade proposals for risk compliance
 * HAS VETO POWER - can reject any trade regardless of other votes
 */

import { ConsensusVote, Position, RiskLimits, AgentPerformance } from '../core/types';

export interface TradeProposal {
  pair: string;
  exchange: string;
  direction: 'long' | 'short';
  entry: number;
  stopLoss: number;
  takeProfit: number[];
  positionSizeUSD: number;
  leverage: number;
  strategy: 'scalp' | 'mm' | 'lp' | 'ipo';
  confidence: number;
}

interface PortfolioContext {
  totalEquity: number;
  openPositions: Position[];
  performance: AgentPerformance;
  riskLimits: RiskLimits;
}

export class RiskManagerAgent {
  private name = 'RiskManager';

  async evaluate(
    proposal: TradeProposal,
    portfolio: PortfolioContext
  ): Promise<ConsensusVote> {
    const checks: Array<{ passed: boolean; reason: string; severity: 'block' | 'warn' }> = [];

    // 1. Drawdown check (BLOCKING)
    checks.push(this.checkDrawdown(portfolio));

    // 2. Position size check (BLOCKING)
    checks.push(this.checkPositionSize(proposal, portfolio));

    // 3. Leverage check (BLOCKING)
    checks.push(this.checkLeverage(proposal, portfolio));

    // 4. Concentration check (WARNING)
    checks.push(this.checkConcentration(proposal, portfolio));

    // 5. Risk/reward ratio check (WARNING)
    checks.push(this.checkRiskReward(proposal));

    // 6. Correlation check (WARNING)
    checks.push(this.checkCorrelation(proposal, portfolio));

    // 7. Exposure check (BLOCKING)
    checks.push(this.checkTotalExposure(proposal, portfolio));

    // 8. Volatility-adjusted sizing (WARNING)
    checks.push(this.checkVolatilityAdjustment(proposal));

    // Process results
    const blockers = checks.filter(c => !c.passed && c.severity === 'block');
    const warnings = checks.filter(c => !c.passed && c.severity === 'warn');
    const passed = checks.filter(c => c.passed);

    // VETO: any blocker = reject
    if (blockers.length > 0) {
      return {
        agent: this.name,
        direction: 'abstain', // Veto
        confidence: 1.0, // Maximum confidence in rejection
        reasoning: `VETO: ${blockers.map(b => b.reason).join('; ')}`,
        timestamp: Date.now(),
      };
    }

    // Calculate risk-adjusted position size
    const adjustedSize = this.calculateKellySize(proposal, portfolio);

    // All checks passed with possible warnings
    const confidence = warnings.length === 0
      ? 0.9
      : Math.max(0.3, 0.9 - warnings.length * 0.15);

    const allReasons = [
      ...passed.map(p => p.reason),
      ...warnings.map(w => `WARN: ${w.reason}`),
    ];

    return {
      agent: this.name,
      direction: proposal.direction,
      confidence,
      positionSize: adjustedSize,
      reasoning: allReasons.join('; '),
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Risk Checks
  // ============================================================================

  private checkDrawdown(portfolio: PortfolioContext): { passed: boolean; reason: string; severity: 'block' | 'warn' } {
    const { currentDrawdown } = portfolio.performance;
    const limits = portfolio.riskLimits;
    // currentDrawdown is a positive number (0 to 1) from MaxDrawdownProtection
    const dd = Math.abs(currentDrawdown);

    if (dd >= limits.closeAllOnDrawdown) {
      return { passed: false, reason: `Drawdown ${(dd * 100).toFixed(1)}% exceeds close-all threshold ${(limits.closeAllOnDrawdown * 100).toFixed(0)}%`, severity: 'block' };
    }

    if (dd >= limits.pauseOnDrawdown) {
      return { passed: false, reason: `Drawdown ${(dd * 100).toFixed(1)}% exceeds pause threshold ${(limits.pauseOnDrawdown * 100).toFixed(0)}%`, severity: 'block' };
    }

    if (dd >= limits.maxDailyDrawdown) {
      return { passed: false, reason: `Daily drawdown limit reached: ${(dd * 100).toFixed(1)}%`, severity: 'warn' };
    }

    return { passed: true, reason: `Drawdown OK (${(dd * 100).toFixed(1)}%)`, severity: 'block' };
  }

  private checkPositionSize(proposal: TradeProposal, portfolio: PortfolioContext): { passed: boolean; reason: string; severity: 'block' | 'warn' } {
    const maxSize = portfolio.riskLimits.maxPositionSize;

    if (proposal.positionSizeUSD > maxSize) {
      return { passed: false, reason: `Position $${proposal.positionSizeUSD} exceeds max $${maxSize}`, severity: 'block' };
    }

    // Check against equity percentage (max 5% per position)
    const maxEquityPercent = 0.05;
    const maxByEquity = portfolio.totalEquity * maxEquityPercent;

    if (proposal.positionSizeUSD > maxByEquity) {
      return { passed: false, reason: `Position $${proposal.positionSizeUSD} exceeds 5% of equity ($${maxByEquity.toFixed(0)})`, severity: 'warn' };
    }

    return { passed: true, reason: `Position size OK ($${proposal.positionSizeUSD})`, severity: 'block' };
  }

  private checkLeverage(proposal: TradeProposal, portfolio: PortfolioContext): { passed: boolean; reason: string; severity: 'block' | 'warn' } {
    if (proposal.leverage > portfolio.riskLimits.maxLeverage) {
      return { passed: false, reason: `Leverage ${proposal.leverage}x exceeds max ${portfolio.riskLimits.maxLeverage}x`, severity: 'block' };
    }
    return { passed: true, reason: `Leverage OK (${proposal.leverage}x)`, severity: 'block' };
  }

  private checkConcentration(proposal: TradeProposal, portfolio: PortfolioContext): { passed: boolean; reason: string; severity: 'block' | 'warn' } {
    const existingInPair = portfolio.openPositions.filter(p => p.pair === proposal.pair);
    const existingExposure = existingInPair.reduce((sum, p) => sum + p.size * p.currentPrice, 0);

    if (existingExposure + proposal.positionSizeUSD > portfolio.totalEquity * 0.15) {
      return { passed: false, reason: `Concentration in ${proposal.pair} would exceed 15% of equity`, severity: 'warn' };
    }
    return { passed: true, reason: `Concentration OK for ${proposal.pair}`, severity: 'warn' };
  }

  private checkRiskReward(proposal: TradeProposal): { passed: boolean; reason: string; severity: 'block' | 'warn' } {
    if (!proposal.stopLoss || proposal.stopLoss <= 0) {
      return { passed: false, reason: 'Missing stop loss - cannot trade without risk protection', severity: 'block' };
    }
    if (!proposal.takeProfit || proposal.takeProfit.length === 0) {
      return { passed: false, reason: 'Missing take profit targets', severity: 'warn' };
    }

    const risk = Math.abs(proposal.entry - proposal.stopLoss);
    const reward = Math.abs(proposal.takeProfit[0] - proposal.entry);
    const rr = reward / (risk || 1);

    if (rr < 1.5) {
      return { passed: false, reason: `Risk/Reward ${rr.toFixed(1)} below minimum 1.5`, severity: 'warn' };
    }

    return { passed: true, reason: `R/R OK (${rr.toFixed(1)})`, severity: 'warn' };
  }

  private checkCorrelation(proposal: TradeProposal, portfolio: PortfolioContext): { passed: boolean; reason: string; severity: 'block' | 'warn' } {
    // Check how many positions are in the same direction
    const sameDirection = portfolio.openPositions.filter(p => p.direction === proposal.direction);
    const totalLongExposure = portfolio.openPositions
      .filter(p => p.direction === 'long')
      .reduce((sum, p) => sum + p.size * p.currentPrice, 0);
    const totalShortExposure = portfolio.openPositions
      .filter(p => p.direction === 'short')
      .reduce((sum, p) => sum + p.size * p.currentPrice, 0);

    const netExposure = totalLongExposure - totalShortExposure;
    const grossExposure = totalLongExposure + totalShortExposure;

    // If net exposure is already > 60% of equity in one direction, warn
    if (Math.abs(netExposure + proposal.positionSizeUSD) > portfolio.totalEquity * 0.6) {
      return { passed: false, reason: `Net exposure would be ${((netExposure + proposal.positionSizeUSD) / portfolio.totalEquity * 100).toFixed(0)}% - too directional`, severity: 'warn' };
    }

    return { passed: true, reason: 'Correlation OK', severity: 'warn' };
  }

  private checkTotalExposure(proposal: TradeProposal, portfolio: PortfolioContext): { passed: boolean; reason: string; severity: 'block' | 'warn' } {
    const currentExposure = portfolio.openPositions.reduce(
      (sum, p) => sum + p.size * p.currentPrice * p.leverage, 0
    );
    const newExposure = currentExposure + proposal.positionSizeUSD * proposal.leverage;
    const maxExposure = portfolio.totalEquity * 3; // Max 3x total equity exposure

    if (newExposure > maxExposure) {
      return { passed: false, reason: `Total exposure $${newExposure.toFixed(0)} would exceed 3x equity ($${maxExposure.toFixed(0)})`, severity: 'block' };
    }

    return { passed: true, reason: `Total exposure OK ($${newExposure.toFixed(0)})`, severity: 'block' };
  }

  private checkVolatilityAdjustment(proposal: TradeProposal): { passed: boolean; reason: string; severity: 'block' | 'warn' } {
    // If stop loss is very tight relative to entry, size may need adjustment
    if (proposal.stopLoss) {
      const slPercent = Math.abs(proposal.entry - proposal.stopLoss) / proposal.entry;
      if (slPercent < 0.002) { // SL tighter than 0.2%
        return { passed: false, reason: `Stop loss too tight (${(slPercent * 100).toFixed(2)}%) - likely to get stopped out`, severity: 'warn' };
      }
    }
    return { passed: true, reason: 'Volatility check OK', severity: 'warn' };
  }

  // ============================================================================
  // Position Sizing
  // ============================================================================

  private calculateKellySize(proposal: TradeProposal, portfolio: PortfolioContext): number {
    // Simplified Kelly Criterion: f = (bp - q) / b
    // where b = win/loss ratio, p = win probability, q = 1-p
    const winRate = portfolio.performance.winRate || 0.5;
    const avgWin = proposal.takeProfit[0] ? Math.abs(proposal.takeProfit[0] - proposal.entry) : 1;
    const avgLoss = proposal.stopLoss ? Math.abs(proposal.entry - proposal.stopLoss) : 1;

    const b = avgWin / (avgLoss || 1);
    const p = winRate;
    const q = 1 - p;

    let kellyFraction = (b * p - q) / (b || 1);

    // Use quarter-Kelly for safety
    kellyFraction = Math.max(0, kellyFraction * 0.25);

    // Cap at 5% of equity
    const maxSize = portfolio.totalEquity * 0.05;
    const kellySize = portfolio.totalEquity * kellyFraction;

    return Math.min(proposal.positionSizeUSD, kellySize, maxSize);
  }
}
