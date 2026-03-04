/**
 * 🛡️ INTELLIGENT RISK MANAGER - CYPHER AI v3.0
 * Sistema avançado de gerenciamento de risco com IA
 */

import { TradingSignal, Position } from './AutomatedTradingEngine';

export interface RiskProfile {
  maxDrawdown: number;
  maxPositionSize: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  correlationThreshold: number;
  volatilityMultiplier: number;
}

export interface PortfolioRisk {
  totalExposure: number;
  currentDrawdown: number;
  dailyLoss: number;
  openPositions: number;
  correlationRisk: number;
  marginUsed: number;
  riskScore: number; // 0-100
}

export class IntelligentRiskManager {
  private dailyLosses: Map<string, number> = new Map();
  private correlationMatrix: Map<string, Map<string, number>> = new Map();
  private volatilityCache: Map<string, number> = new Map();
  
  private riskProfiles: Record<string, RiskProfile> = {
    aggressive: {
      maxDrawdown: 0.25,      // 25%
      maxPositionSize: 0.05,   // 5% por trade
      maxDailyLoss: 0.10,      // 10% por dia
      maxOpenPositions: 10,
      correlationThreshold: 0.7,
      volatilityMultiplier: 1.5
    },
    moderate: {
      maxDrawdown: 0.15,       // 15%
      maxPositionSize: 0.02,   // 2% por trade
      maxDailyLoss: 0.05,      // 5% por dia
      maxOpenPositions: 5,
      correlationThreshold: 0.6,
      volatilityMultiplier: 2.0
    },
    conservative: {
      maxDrawdown: 0.10,       // 10%
      maxPositionSize: 0.01,   // 1% por trade
      maxDailyLoss: 0.03,      // 3% por dia
      maxOpenPositions: 3,
      correlationThreshold: 0.5,
      volatilityMultiplier: 2.5
    },
    defensive: {
      maxDrawdown: 0.05,       // 5%
      maxPositionSize: 0.005,  // 0.5% por trade
      maxDailyLoss: 0.02,      // 2% por dia
      maxOpenPositions: 2,
      correlationThreshold: 0.4,
      volatilityMultiplier: 3.0
    }
  };
  
  constructor(
    private profile: keyof typeof IntelligentRiskManager.prototype.riskProfiles = 'moderate',
    private accountBalance: number = 10000
  ) {
    this.initializeDailyTracking();
  }

  private initializeDailyTracking(): void {
    // Reset daily losses at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.dailyLosses.clear();
      this.initializeDailyTracking(); // Reagendar para o próximo dia
    }, msUntilMidnight);
  }

  async validateSignals(
    signals: TradingSignal[],
    currentPositions: Map<string, Position>,
    performance: any
  ): Promise<TradingSignal[]> {
    const validSignals: TradingSignal[] = [];
    const portfolioRisk = this.calculatePortfolioRisk(currentPositions, performance);
    
    // Verificar se podemos abrir novas posições
    if (!this.canOpenNewPositions(portfolioRisk)) {
      return [];
    }
    
    for (const signal of signals) {
      // 1. Verificar exposição total
      if (this.checkTotalExposure(signal, portfolioRisk)) {
        continue;
      }
      
      // 2. Verificar correlação com posições existentes
      if (await this.checkCorrelation(signal, currentPositions)) {
        continue;
      }
      
      // 3. Verificar volatilidade
      if (await this.checkVolatility(signal)) {
        continue;
      }
      
      // 4. Calcular tamanho ótimo da posição
      signal.optimalSize = this.calculateOptimalSize(signal, portfolioRisk);
      
      // 5. Aplicar stop loss dinâmico
      signal.stopLoss = this.calculateDynamicStopLoss(signal);
      
      // 6. Verificar risco/recompensa
      if (!this.validateRiskReward(signal)) {
        continue;
      }
      
      validSignals.push(signal);
    }
    
    // Priorizar sinais por confiança e diversificação
    return this.prioritizeSignals(validSignals, currentPositions);
  }

  private calculatePortfolioRisk(
    positions: Map<string, Position>,
    performance: any
  ): PortfolioRisk {
    const openPositions = Array.from(positions.values()).filter(p => p.status === 'OPEN');
    
    // Calcular exposição total
    const totalExposure = openPositions.reduce((sum, p) => {
      const value = p.quantity * (p.currentPrice || p.entryPrice);
      return sum + value;
    }, 0);
    
    // Calcular drawdown atual
    const currentValue = this.accountBalance + performance.totalProfit;
    const peakValue = Math.max(this.accountBalance, currentValue);
    const currentDrawdown = (peakValue - currentValue) / peakValue;
    
    // Calcular perda diária
    const today = new Date().toDateString();
    const dailyLoss = this.dailyLosses.get(today) || 0;
    
    // Calcular risco de correlação
    const correlationRisk = this.calculateCorrelationRisk(openPositions);
    
    // Calcular margem usada
    const marginUsed = totalExposure / this.accountBalance;
    
    // Calcular score de risco geral (0-100)
    const riskScore = this.calculateRiskScore({
      drawdown: currentDrawdown,
      dailyLoss: dailyLoss / this.accountBalance,
      marginUsed,
      correlationRisk,
      openPositions: openPositions.length
    });
    
    return {
      totalExposure,
      currentDrawdown,
      dailyLoss,
      openPositions: openPositions.length,
      correlationRisk,
      marginUsed,
      riskScore
    };
  }

  private canOpenNewPositions(portfolioRisk: PortfolioRisk): boolean {
    const profile = this.riskProfiles[this.profile];
    
    // Verificar limites
    if (portfolioRisk.currentDrawdown >= profile.maxDrawdown * 0.8) {
      return false;
    }
    
    if (portfolioRisk.dailyLoss >= profile.maxDailyLoss * this.accountBalance) {
      return false;
    }
    
    if (portfolioRisk.openPositions >= profile.maxOpenPositions) {
      return false;
    }
    
    if (portfolioRisk.riskScore > 80) {
      return false;
    }
    
    return true;
  }

  private checkTotalExposure(signal: TradingSignal, portfolioRisk: PortfolioRisk): boolean {
    const profile = this.riskProfiles[this.profile];
    const potentialExposure = portfolioRisk.totalExposure + (signal.entryPrice * 0.01); // Assumindo 0.01 BTC
    
    return potentialExposure > this.accountBalance * 0.5; // Max 50% exposure
  }

  private async checkCorrelation(
    signal: TradingSignal,
    currentPositions: Map<string, Position>
  ): Promise<boolean> {
    const profile = this.riskProfiles[this.profile];
    const openPositions = Array.from(currentPositions.values()).filter(p => p.status === 'OPEN');
    
    for (const position of openPositions) {
      const correlation = await this.getCorrelation(signal.symbol, position.symbol);
      
      if (Math.abs(correlation) > profile.correlationThreshold) {
        // Alta correlação - evitar concentração
        if (position.side === signal.action) {
          return true; // Reject signal
        }
      }
    }
    
    return false;
  }

  private async checkVolatility(signal: TradingSignal): Promise<boolean> {
    const volatility = signal.indicators.volatility;
    const avgVolatility = await this.getAverageVolatility(signal.symbol);
    
    // Se volatilidade está muito alta comparada à média
    if (volatility > avgVolatility * 2) {
      // Apenas aceitar em modo agressivo
      return this.profile !== 'aggressive';
    }
    
    return false;
  }

  private calculateOptimalSize(signal: TradingSignal, portfolioRisk: PortfolioRisk): number {
    const profile = this.riskProfiles[this.profile];
    
    // Kelly Criterion modificado
    const winRate = 0.55; // Assumindo 55% win rate
    const avgWin = 0.02;  // 2% ganho médio
    const avgLoss = 0.01; // 1% perda média
    
    const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
    
    // Ajustar pelo perfil de risco
    let adjustedSize = kellyFraction * 0.25; // 25% do Kelly
    
    // Ajustar pela confiança do sinal
    adjustedSize *= signal.confidence;
    
    // Ajustar pelo risco do portfolio
    const riskAdjustment = 1 - (portfolioRisk.riskScore / 100);
    adjustedSize *= riskAdjustment;
    
    // Aplicar limites
    return Math.min(adjustedSize, profile.maxPositionSize);
  }

  private calculateDynamicStopLoss(signal: TradingSignal): number {
    const profile = this.riskProfiles[this.profile];
    const atr = signal.indicators.atr;
    const volatility = signal.indicators.volatility;
    
    // Stop loss baseado em ATR e volatilidade
    const baseMultiplier = profile.volatilityMultiplier;
    const volatilityAdjustment = 1 + (volatility - 0.01) * 10; // Ajustar se vol > 1%
    
    const stopDistance = atr * baseMultiplier * volatilityAdjustment;
    
    if (signal.action === 'buy') {
      return signal.entryPrice - stopDistance;
    } else {
      return signal.entryPrice + stopDistance;
    }
  }

  private validateRiskReward(signal: TradingSignal): boolean {
    const risk = Math.abs(signal.entryPrice - signal.stopLoss);
    const reward = Math.abs(signal.takeProfit - signal.entryPrice);
    
    const riskRewardRatio = reward / risk;
    
    // Mínimo risk/reward baseado no perfil
    const minRatios: Record<string, number> = {
      aggressive: 1.5,
      moderate: 2.0,
      conservative: 2.5,
      defensive: 3.0
    };

    return riskRewardRatio >= minRatios[this.profile];
  }

  private prioritizeSignals(
    signals: TradingSignal[],
    currentPositions: Map<string, Position>
  ): TradingSignal[] {
    // Calcular score para cada sinal
    const scoredSignals = signals.map(signal => ({
      signal,
      score: this.calculateSignalScore(signal, currentPositions)
    }));
    
    // Ordenar por score
    scoredSignals.sort((a, b) => b.score - a.score);
    
    // Retornar top sinais baseado no perfil
    const maxSignals: Record<string, number> = {
      aggressive: 3,
      moderate: 2,
      conservative: 1,
      defensive: 1
    };

    return scoredSignals
      .slice(0, maxSignals[this.profile])
      .map(s => s.signal);
  }

  private calculateSignalScore(
    signal: TradingSignal,
    currentPositions: Map<string, Position>
  ): number {
    let score = signal.confidence * 100;
    
    // Bonus por diversificação
    const symbolsInPortfolio = new Set(
      Array.from(currentPositions.values())
        .filter(p => p.status === 'OPEN')
        .map(p => p.symbol)
    );
    
    if (!symbolsInPortfolio.has(signal.symbol)) {
      score += 20; // Bonus por novo símbolo
    }
    
    // Ajustar por trend
    if (signal.indicators.trend === 'bullish' && signal.action === 'buy') {
      score += 10;
    } else if (signal.indicators.trend === 'bearish' && signal.action === 'sell') {
      score += 10;
    }
    
    // Ajustar por momentum
    score += signal.indicators.momentum * 10;
    
    return score;
  }

  private calculateCorrelationRisk(positions: Position[]): number {
    if (positions.length < 2) return 0;
    
    let totalCorrelation = 0;
    let pairs = 0;
    
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const correlation = this.getStoredCorrelation(
          positions[i].symbol,
          positions[j].symbol
        );
        totalCorrelation += Math.abs(correlation);
        pairs++;
      }
    }
    
    return pairs > 0 ? totalCorrelation / pairs : 0;
  }

  private calculateRiskScore(factors: {
    drawdown: number;
    dailyLoss: number;
    marginUsed: number;
    correlationRisk: number;
    openPositions: number;
  }): number {
    const profile = this.riskProfiles[this.profile];
    
    // Pesos para cada fator
    const weights = {
      drawdown: 30,
      dailyLoss: 25,
      marginUsed: 20,
      correlationRisk: 15,
      openPositions: 10
    };
    
    // Normalizar cada fator (0-1)
    const normalized = {
      drawdown: factors.drawdown / profile.maxDrawdown,
      dailyLoss: factors.dailyLoss / profile.maxDailyLoss,
      marginUsed: factors.marginUsed,
      correlationRisk: factors.correlationRisk,
      openPositions: factors.openPositions / profile.maxOpenPositions
    };
    
    // Calcular score ponderado
    let score = 0;
    score += normalized.drawdown * weights.drawdown;
    score += normalized.dailyLoss * weights.dailyLoss;
    score += normalized.marginUsed * weights.marginUsed;
    score += normalized.correlationRisk * weights.correlationRisk;
    score += normalized.openPositions * weights.openPositions;
    
    return Math.min(score, 100);
  }

  private async getCorrelation(symbol1: string, symbol2: string): Promise<number> {
    // Verificar cache
    const cached = this.getStoredCorrelation(symbol1, symbol2);
    if (cached !== 0) return cached;
    
    // TODO: Calcular correlação real baseada em dados históricos
    // Por enquanto, usar valores simulados
    const correlations: Record<string, Record<string, number>> = {
      'BTCUSDT': { 'ETHUSDT': 0.8, 'ORDIUSDT': 0.6 },
      'ETHUSDT': { 'BTCUSDT': 0.8, 'ORDIUSDT': 0.5 },
      'ORDIUSDT': { 'BTCUSDT': 0.6, 'ETHUSDT': 0.5 }
    };
    
    const correlation = correlations[symbol1]?.[symbol2] || 0;
    
    // Armazenar no cache
    this.storeCorrelation(symbol1, symbol2, correlation);
    
    return correlation;
  }

  private getStoredCorrelation(symbol1: string, symbol2: string): number {
    return this.correlationMatrix.get(symbol1)?.get(symbol2) || 
           this.correlationMatrix.get(symbol2)?.get(symbol1) || 0;
  }

  private storeCorrelation(symbol1: string, symbol2: string, correlation: number): void {
    if (!this.correlationMatrix.has(symbol1)) {
      this.correlationMatrix.set(symbol1, new Map());
    }
    this.correlationMatrix.get(symbol1)!.set(symbol2, correlation);
  }

  private async getAverageVolatility(symbol: string): Promise<number> {
    // Verificar cache
    if (this.volatilityCache.has(symbol)) {
      return this.volatilityCache.get(symbol)!;
    }
    
    // TODO: Calcular volatilidade média dos últimos 30 dias
    const avgVolatility = 0.015; // 1.5% como padrão
    
    this.volatilityCache.set(symbol, avgVolatility);
    return avgVolatility;
  }

  // Métodos públicos
  
  public updateDailyLoss(loss: number): void {
    const today = new Date().toDateString();
    const currentLoss = this.dailyLosses.get(today) || 0;
    this.dailyLosses.set(today, currentLoss + loss);
  }

  public setProfile(profile: keyof typeof this.riskProfiles): void {
    this.profile = profile;
  }

  public updateAccountBalance(balance: number): void {
    this.accountBalance = balance;
  }

  public getRiskProfile(): RiskProfile {
    return this.riskProfiles[this.profile];
  }

  public getPortfolioRisk(
    positions: Map<string, Position>,
    performance: any
  ): PortfolioRisk {
    return this.calculatePortfolioRisk(positions, performance);
  }
}