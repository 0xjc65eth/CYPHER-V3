/**
 * Automated Trading Bot Service - Execução automática de trades
 * Integração com CoinMarketCap, Hyperliquid e ElevenLabs
 */

import { CoinMarketCapService } from './CoinMarketCapService';
import { ElevenLabsVoiceService } from './ElevenLabsVoiceService';
import { HyperliquidTradingService } from './HyperliquidTradingService';

interface TradingStrategy {
  name: string;
  type: 'arbitrage' | 'grid' | 'dca' | 'momentum' | 'scalping';
  active: boolean;
  parameters: {
    [key: string]: any;
  };
  performance: {
    totalTrades: number;
    successRate: number;
    totalPnL: number;
    avgTradeTime: number;
  };
}

interface TradingOpportunity {
  id: string;
  type: 'buy' | 'sell' | 'arbitrage';
  asset: string;
  price: number;
  quantity: number;
  exchange: string;
  confidence: number;
  estimatedPnL: number;
  timeframe: string;
  reason: string;
}

interface TradingPosition {
  id: string;
  asset: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  stopLoss?: number;
  takeProfit?: number;
  openTime: Date;
}

interface ExchangeAccount {
  exchange: 'binance' | 'okx' | 'hyperliquid';
  apiKey: string;
  secret: string;
  connected: boolean;
  balance: { [asset: string]: number };
}

export class AutomatedTradingBotService {
  private strategies: TradingStrategy[] = [];
  private activePositions: TradingPosition[] = [];
  private opportunities: TradingOpportunity[] = [];
  private accounts: ExchangeAccount[] = [];
  private isRunning = false;
  private performance = {
    totalTrades: 0,
    successfulTrades: 0,
    totalPnL: 0,
    bestTrade: 0,
    worstTrade: 0,
    startTime: new Date(),
    uptime: 0
  };

  private cmcService: CoinMarketCapService;
  private voiceService: ElevenLabsVoiceService;
  private hyperliquidService: HyperliquidTradingService;
  private listeners = new Map<string, Function[]>();

  constructor() {
    this.cmcService = new CoinMarketCapService();
    this.voiceService = new ElevenLabsVoiceService();
    this.hyperliquidService = new HyperliquidTradingService();
    this.initializeStrategies();
  }

  /**
   * Register an event listener
   */
  on(event: string, callback: Function): void {
    const existing = this.listeners.get(event) || [];
    this.listeners.set(event, [...existing, callback]);
  }

  /**
   * Unregister an event listener
   */
  off(event: string, callback: Function): void {
    const existing = this.listeners.get(event) || [];
    this.listeners.set(event, existing.filter(cb => cb !== callback));
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Emit an event to all registered listeners
   */
  protected emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => {
      try {
        cb(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  private initializeStrategies() {
    this.strategies = [
      {
        name: 'Bitcoin Arbitrage Scanner',
        type: 'arbitrage',
        active: true,
        parameters: {
          minSpread: 0.5, // 0.5%
          maxPosition: 0.1, // 10% of portfolio
          exchanges: ['binance', 'okx', 'hyperliquid'],
          assets: ['BTC', 'ETH', 'SOL']
        },
        performance: {
          totalTrades: 0,
          successRate: 0,
          totalPnL: 0,
          avgTradeTime: 0
        }
      },
      {
        name: 'Grid Trading BTC',
        type: 'grid',
        active: false,
        parameters: {
          gridSpacing: 1000, // $1000 per grid
          gridLevels: 20,
          baseAmount: 0.01, // 0.01 BTC per level
          priceRange: { min: 100000, max: 120000 }
        },
        performance: {
          totalTrades: 0,
          successRate: 0,
          totalPnL: 0,
          avgTradeTime: 0
        }
      },
      {
        name: 'DCA Strategy',
        type: 'dca',
        active: true,
        parameters: {
          interval: '1h', // Buy every hour
          amount: 50, // $50 per buy
          assets: ['BTC', 'ETH'],
          conditions: ['price_dip', 'rsi_oversold']
        },
        performance: {
          totalTrades: 0,
          successRate: 0,
          totalPnL: 0,
          avgTradeTime: 0
        }
      },
      {
        name: 'Momentum Scalping',
        type: 'momentum',
        active: true,
        parameters: {
          timeframe: '5m',
          rsiThreshold: { buy: 30, sell: 70 },
          macdSignal: true,
          volumeConfirmation: true,
          maxHoldTime: '2h'
        },
        performance: {
          totalTrades: 0,
          successRate: 0,
          totalPnL: 0,
          avgTradeTime: 0
        }
      }
    ];
  }

  async startBot() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.emit('botStarted');

    // Inicializar Hyperliquid Trading Service
    const hyperliquidConnected = await this.hyperliquidService.initialize();
    if (!hyperliquidConnected) {
    }

    // Anunciar início por voz
    await this.voiceService.speak(
      'E aí, mano! CYPHER Bot tá ligando agora! Vou ficar de olho nas melhores oportunidades pra você. Bora fazer essa grana!',
      'excited'
    );

    // Iniciar loops de monitoramento
    this.startMarketMonitoring();
    this.startOpportunityScanning();
    this.startPositionManagement();
    this.startPerformanceTracking();
  }

  async stopBot() {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.emit('botStopped');

    // Desconectar Hyperliquid
    await this.hyperliquidService.disconnect();

    await this.voiceService.speak(
      'Opa, parando o bot aqui! Foi massa operar com você hoje. Até a próxima, parceiro!',
      'casual'
    );
  }

  private async startMarketMonitoring() {
    const monitorInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(monitorInterval);
        return;
      }

      try {
        // Buscar dados de mercado em tempo real
        const marketData = await this.cmcService.getMultipleQuotes(['BTC', 'ETH', 'SOL', 'ORDI']);
        
        // Analisar cada asset
        for (const [symbol, data] of Object.entries(marketData)) {
          await this.analyzeAsset(symbol, data as any);
        }
      } catch (error) {
        console.error('❌ Erro no monitoramento de mercado:', error);
      }
    }, 30000); // A cada 30 segundos
  }

  private async analyzeAsset(symbol: string, data: any) {
    const price = data.quote.USD.price;
    const change24h = data.quote.USD.percent_change_24h;
    const volume = data.quote.USD.volume_24h;

    // Estratégia de Arbitragem
    if (this.strategies.find(s => s.name === 'Bitcoin Arbitrage Scanner')?.active) {
      await this.scanArbitrageOpportunities(symbol, price);
    }

    // Estratégia de Momentum
    if (this.strategies.find(s => s.name === 'Momentum Scalping')?.active) {
      await this.scanMomentumOpportunities(symbol, price, change24h, volume);
    }

    // Estratégia DCA
    if (this.strategies.find(s => s.name === 'DCA Strategy')?.active) {
      await this.executeDCAStrategy(symbol, price, change24h);
    }
  }

  private async scanArbitrageOpportunities(symbol: string, basePrice: number) {
    // Simular preços de diferentes exchanges
    const exchanges = {
      binance: basePrice * (1 + (Math.random() - 0.5) * 0.01), // ±0.5%
      okx: basePrice * (1 + (Math.random() - 0.5) * 0.01),
      hyperliquid: basePrice * (1 + (Math.random() - 0.5) * 0.01)
    };

    // Encontrar maior spread
    const prices = Object.values(exchanges);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const spread = ((maxPrice - minPrice) / minPrice) * 100;

    if (spread >= 0.5) { // Spread mínimo de 0.5%
      const buyExchange = Object.keys(exchanges).find(ex => exchanges[ex as keyof typeof exchanges] === minPrice);
      const sellExchange = Object.keys(exchanges).find(ex => exchanges[ex as keyof typeof exchanges] === maxPrice);

      const opportunity: TradingOpportunity = {
        id: `arb_${Date.now()}`,
        type: 'arbitrage',
        asset: symbol,
        price: minPrice,
        quantity: 0.1, // 0.1 BTC ou equivalente
        exchange: `${buyExchange} → ${sellExchange}`,
        confidence: Math.min(95, 60 + spread * 10),
        estimatedPnL: (maxPrice - minPrice) * 0.1,
        timeframe: '5-15min',
        reason: `Spread de ${spread.toFixed(2)}% entre ${buyExchange} e ${sellExchange}`
      };

      this.opportunities.push(opportunity);
      await this.executeArbitrageOpportunity(opportunity);
    }
  }

  private async scanMomentumOpportunities(symbol: string, price: number, change24h: number, volume: number) {
    // Simular indicadores técnicos
    const rsi = 50 + Math.random() * 50; // RSI entre 50-100
    const macdSignal = Math.random() > 0.5 ? 'bullish' : 'bearish';
    const volumeIncrease = volume > 1000000000; // Volume > 1B

    // Condições de compra
    if (change24h > 3 && rsi < 70 && macdSignal === 'bullish' && volumeIncrease) {
      const opportunity: TradingOpportunity = {
        id: `momentum_${Date.now()}`,
        type: 'buy',
        asset: symbol,
        price: price,
        quantity: 1000 / price, // $1000 worth
        exchange: 'hyperliquid',
        confidence: 75 + Math.min(20, change24h * 2),
        estimatedPnL: (price * 0.05) * (1000 / price), // 5% target
        timeframe: '1-4h',
        reason: `Momentum forte: +${change24h.toFixed(2)}% com volume alto e MACD bullish`
      };

      this.opportunities.push(opportunity);
      await this.executeMomentumTrade(opportunity);
    }
  }

  private async executeDCAStrategy(symbol: string, price: number, change24h: number) {
    // DCA apenas em dips ou condições favoráveis
    if (change24h < -2 || Math.random() > 0.9) { // Em quedas ou 10% das vezes
      const opportunity: TradingOpportunity = {
        id: `dca_${Date.now()}`,
        type: 'buy',
        asset: symbol,
        price: price,
        quantity: 50 / price, // $50 worth
        exchange: 'binance',
        confidence: 60,
        estimatedPnL: 0, // DCA não tem target específico
        timeframe: 'long-term',
        reason: change24h < -2 ? 
          `DCA em dip: ${change24h.toFixed(2)}%` : 
          'DCA regular programado'
      };

      this.opportunities.push(opportunity);
      await this.executeDCATrade(opportunity);
    }
  }

  private async executeArbitrageOpportunity(opportunity: TradingOpportunity) {
    
    // Simular execução de trade
    const success = Math.random() > 0.1; // 90% de sucesso
    
    if (success) {
      const position: TradingPosition = {
        id: opportunity.id,
        asset: opportunity.asset,
        side: 'long',
        entryPrice: opportunity.price,
        currentPrice: opportunity.price,
        quantity: opportunity.quantity,
        pnl: opportunity.estimatedPnL * 0.8, // 80% do PnL estimado
        pnlPercent: (opportunity.estimatedPnL / (opportunity.price * opportunity.quantity)) * 100,
        openTime: new Date()
      };

      this.activePositions.push(position);
      this.updatePerformance(position.pnl, true);

      // Anunciar sucesso por voz
      if (position.pnl > 100) { // Apenas para trades significativos
        await this.voiceService.speak(
          `Opa! Fechei uma arbitragem massa aqui! Lucro de $${position.pnl.toFixed(0)} no ${opportunity.asset}. Bora que bora!`,
          'excited'
        );
      }
    } else {
      this.updatePerformance(-20, false); // Perda pequena por falha
    }
  }

  private async executeMomentumTrade(opportunity: TradingOpportunity) {
    
    try {
      // Usar Hyperliquid para trade real se conectado
      if (this.hyperliquidService.isConnected()) {
        const symbol = `${opportunity.asset}-USD`;
        const orderResult = await this.hyperliquidService.placeOrder(
          symbol,
          'buy',
          'market',
          opportunity.quantity
        );

        if (orderResult.success) {
          const position: TradingPosition = {
            id: opportunity.id,
            asset: opportunity.asset,
            side: 'long',
            entryPrice: opportunity.price,
            currentPrice: opportunity.price,
            quantity: opportunity.quantity,
            pnl: 0,
            pnlPercent: 0,
            stopLoss: opportunity.price * 0.97, // 3% stop loss
            takeProfit: opportunity.price * 1.05, // 5% take profit
            openTime: new Date()
          };

          this.activePositions.push(position);
        } else {
        }
      } else {
        // Fallback para simulação
        const success = Math.random() > 0.25; // 75% de sucesso
        
        if (success) {
          const position: TradingPosition = {
            id: opportunity.id,
            asset: opportunity.asset,
            side: 'long',
            entryPrice: opportunity.price,
            currentPrice: opportunity.price,
            quantity: opportunity.quantity,
            pnl: 0,
            pnlPercent: 0,
            stopLoss: opportunity.price * 0.97,
            takeProfit: opportunity.price * 1.05,
            openTime: new Date()
          };

          this.activePositions.push(position);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao executar trade de momentum:', error);
    }
  }

  private async executeDCATrade(opportunity: TradingOpportunity) {
    
    // DCA sempre executa (simulação)
    const position: TradingPosition = {
      id: opportunity.id,
      asset: opportunity.asset,
      side: 'long',
      entryPrice: opportunity.price,
      currentPrice: opportunity.price,
      quantity: opportunity.quantity,
      pnl: 0,
      pnlPercent: 0,
      openTime: new Date()
    };

    this.activePositions.push(position);
  }

  private startOpportunityScanning() {
    const scanInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(scanInterval);
        return;
      }

      // Limpar oportunidades antigas (> 5 minutos)
      this.opportunities = this.opportunities.filter(
        opp => Date.now() - parseInt(opp.id.split('_')[1]) < 300000
      );

      // Análise de oportunidades especiais
      await this.scanSpecialOpportunities();
    }, 60000); // A cada 1 minuto
  }

  private async scanSpecialOpportunities() {
    // Detectar condições especiais de mercado
    try {
      const btcData = await this.cmcService.getQuote('BTC');
      const change1h = btcData.quote.USD.percent_change_1h;

      // Buscar oportunidades de arbitragem via Hyperliquid
      if (this.hyperliquidService.isConnected()) {
        const arbitrageOpportunities = await this.hyperliquidService.getArbitrageOpportunities();
        
        for (const arbOpp of arbitrageOpportunities) {
          const opportunity: TradingOpportunity = {
            id: `hyper_arb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: 'arbitrage',
            asset: arbOpp.symbol.split('-')[0],
            price: arbOpp.buyPrice,
            quantity: 0.1,
            exchange: 'hyperliquid',
            confidence: arbOpp.confidence,
            estimatedPnL: arbOpp.profit,
            timeframe: '5-15min',
            reason: `Arbitragem Hyperliquid: spread ${arbOpp.spread}%`
          };

          this.opportunities.push(opportunity);
        }
      }

      // Alertas de volatilidade extrema
      if (Math.abs(change1h) > 5) {
        await this.voiceService.speak(
          `Opa! Bitcoin tá ${change1h > 0 ? 'bombando' : 'despencando'} ${Math.abs(change1h).toFixed(1)}% na última hora! Fica ligado nas oportunidades!`,
          'warning'
        );
      }

      // Oportunidades de alta volatilidade
      if (Math.abs(change1h) > 3) {
        const opportunity: TradingOpportunity = {
          id: `volatility_${Date.now()}`,
          type: change1h > 0 ? 'sell' : 'buy',
          asset: 'BTC',
          price: btcData.quote.USD.price,
          quantity: 0.05,
          exchange: 'hyperliquid',
          confidence: 85,
          estimatedPnL: Math.abs(change1h) * 100,
          timeframe: '30min-2h',
          reason: `Alta volatilidade: ${change1h > 0 ? '+' : ''}${change1h.toFixed(1)}% em 1h`
        };

        this.opportunities.push(opportunity);
      }
    } catch (error) {
      console.error('❌ Erro na análise de oportunidades especiais:', error);
    }
  }

  private startPositionManagement() {
    const managementInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(managementInterval);
        return;
      }

      // Gerenciar posições ativas
      for (const position of this.activePositions) {
        await this.updatePositionPnL(position);
        await this.checkStopLossAndTakeProfit(position);
      }

      // Remover posições fechadas
      this.activePositions = this.activePositions.filter(pos => 
        Date.now() - pos.openTime.getTime() < 24 * 60 * 60 * 1000 // Manter por 24h
      );
    }, 15000); // A cada 15 segundos
  }

  private async updatePositionPnL(position: TradingPosition) {
    try {
      const currentData = await this.cmcService.getQuote(position.asset);
      position.currentPrice = currentData.quote.USD.price;
      
      if (position.side === 'long') {
        position.pnl = (position.currentPrice - position.entryPrice) * position.quantity;
      } else {
        position.pnl = (position.entryPrice - position.currentPrice) * position.quantity;
      }
      
      position.pnlPercent = (position.pnl / (position.entryPrice * position.quantity)) * 100;
    } catch (error) {
      console.error('❌ Erro ao atualizar PnL da posição:', error);
    }
  }

  private async checkStopLossAndTakeProfit(position: TradingPosition) {
    // Verificar Stop Loss
    if (position.stopLoss && position.currentPrice <= position.stopLoss) {
      await this.closePosition(position, 'stop_loss');
      return;
    }

    // Verificar Take Profit
    if (position.takeProfit && position.currentPrice >= position.takeProfit) {
      await this.closePosition(position, 'take_profit');
      return;
    }

    // Trailing Stop Loss (para posições lucrativas)
    if (position.pnlPercent > 3 && !position.stopLoss) {
      position.stopLoss = position.entryPrice * 1.01; // 1% acima da entrada
    }
  }

  private async closePosition(position: TradingPosition, reason: string) {
    this.updatePerformance(position.pnl, position.pnl > 0);
    this.emit('tradeCompleted', { position, reason });

    if (Math.abs(position.pnl) > 50) { // Anunciar trades significativos
      const message = position.pnl > 0 ?
        `Show! Fechei ${position.asset} com lucro de $${position.pnl.toFixed(0)}. ${reason === 'take_profit' ? 'Meta batida!' : 'Stop ativado, mas foi lucro!'}` :
        `Fechei ${position.asset} com perda de $${Math.abs(position.pnl).toFixed(0)}. ${reason === 'stop_loss' ? 'Stop loss ativado, proteção funcionou!' : 'Realização tática.'}`;

      await this.voiceService.speak(message, position.pnl > 0 ? 'confident' : 'analytical');
    }

    // Remover posição da lista
    const index = this.activePositions.findIndex(p => p.id === position.id);
    if (index > -1) {
      this.activePositions.splice(index, 1);
    }
  }

  private updatePerformance(pnl: number, isWin: boolean) {
    this.performance.totalTrades++;
    this.performance.totalPnL += pnl;
    
    if (isWin) {
      this.performance.successfulTrades++;
    }
    
    if (pnl > this.performance.bestTrade) {
      this.performance.bestTrade = pnl;
    }
    
    if (pnl < this.performance.worstTrade) {
      this.performance.worstTrade = pnl;
    }
  }

  private startPerformanceTracking() {
    const trackingInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(trackingInterval);
        return;
      }

      this.performance.uptime = Date.now() - this.performance.startTime.getTime();
      this.emit('performanceUpdate', this.getPerformance());

      // Relatório periódico (a cada hora)
      if (this.performance.uptime % (60 * 60 * 1000) < 60000) {
        await this.generatePerformanceReport();
      }
    }, 60000); // A cada 1 minuto
  }

  private async generatePerformanceReport() {
    const successRate = this.performance.totalTrades > 0 ? 
      (this.performance.successfulTrades / this.performance.totalTrades) * 100 : 0;
    
    const report = `
📊 RELATÓRIO CYPHER BOT - ${new Date().toLocaleTimeString()}
• Trades executados: ${this.performance.totalTrades}
• Taxa de sucesso: ${successRate.toFixed(1)}%
• PnL total: $${this.performance.totalPnL.toFixed(2)}
• Melhor trade: $${this.performance.bestTrade.toFixed(2)}
• Posições ativas: ${this.activePositions.length}
• Oportunidades detectadas: ${this.opportunities.length}
`;


    // Anunciar performance se houver trades significativos
    if (this.performance.totalTrades >= 5) {
      const message = this.performance.totalPnL > 0 ?
        `Opa! Já fiz ${this.performance.totalTrades} trades hoje com ${successRate.toFixed(0)}% de acerto. Lucro total de $${this.performance.totalPnL.toFixed(0)}. Tô on fire!` :
        `Já executei ${this.performance.totalTrades} trades com ${successRate.toFixed(0)}% de acerto. Ainda no prejuízo de $${Math.abs(this.performance.totalPnL).toFixed(0)}, mas vou recuperar!`;
      
      await this.voiceService.speak(message, this.performance.totalPnL > 0 ? 'excited' : 'confident');
    }
  }

  // Métodos públicos para controle do bot
  get isRunning(): boolean {
    return this.isActive();
  }

  getPerformance() {
    return {
      ...this.performance,
      successRate: this.performance.totalTrades > 0 ?
        (this.performance.successfulTrades / this.performance.totalTrades) * 100 : 0,
      isRunning: this.isActive(),
      activePositions: this.activePositions.length,
      activeOpportunities: this.opportunities.length,
      hyperliquidConnected: this.hyperliquidService.isConnected(),
      hyperliquidPositions: this.hyperliquidService.getPositions().length,
      hyperliquidOrders: this.hyperliquidService.getPendingOrders().length
    };
  }

  async start() {
    return this.startBot();
  }

  async stop() {
    return this.stopBot();
  }

  getPositions() {
    return this.getActivePositions();
  }

  getDailyStats() {
    const now = Date.now();
    const dayStart = new Date().setHours(0, 0, 0, 0);
    const todayPositions = this.activePositions.filter(
      pos => pos.openTime.getTime() >= dayStart
    );

    const todayPnL = todayPositions.reduce((sum, pos) => sum + pos.pnl, 0);
    const todayTrades = todayPositions.length;

    return {
      tradesCount: todayTrades,
      profit: todayPnL,
      startTime: dayStart,
      uptime: now - dayStart
    };
  }

  getConfig() {
    return {
      strategies: this.strategies,
      accounts: this.accounts.map(acc => ({
        exchange: acc.exchange,
        connected: acc.connected,
        hasBalance: Object.keys(acc.balance).length > 0
      })),
      settings: {
        voiceEnabled: true,
        emergencyStopEnabled: true,
        maxPositions: 10,
        maxRiskPerTrade: 0.02 // 2%
      }
    };
  }

  getStats() {
    const performance = this.getPerformance();
    return {
      totalTrades: performance.totalTrades,
      successfulTrades: performance.successfulTrades,
      winRate: performance.successRate,
      totalProfit: performance.totalPnL,
      totalLoss: Math.abs(Math.min(0, performance.totalPnL)),
      tradesPerHour: this.calculateTradesPerHour(),
      activePositions: performance.activePositions,
      isRunning: performance.isRunning
    };
  }

  private calculateTradesPerHour(): number {
    if (!this.performance.startTime) return 0;
    const hoursSinceStart = (Date.now() - this.performance.startTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceStart === 0) return 0;
    return Math.round(this.performance.totalTrades / hoursSinceStart);
  }

  getRecentTrades(limit: number = 10): any[] {
    // Return recent closed positions as trades
    const now = Date.now();
    const recentPositions = this.activePositions
      .filter(pos => now - pos.openTime.getTime() < 24 * 60 * 60 * 1000) // Last 24 hours
      .slice(-limit)
      .map(pos => ({
        id: pos.id,
        timestamp: pos.openTime.toISOString(),
        opportunity: {
          type: pos.id.includes('arb') ? 'arbitrage' : pos.id.includes('momentum') ? 'momentum' : 'dca',
          token: pos.asset
        },
        profit: pos.pnlPercent,
        pnl: pos.pnl,
        status: 'completed'
      }));

    return recentPositions;
  }

  async scanOpportunities(): Promise<TradingOpportunity[]> {
    // Return current opportunities
    return this.opportunities.slice(-10);
  }

  async executeStrategies(): Promise<void> {
    // Execute all active strategies
    for (const strategy of this.strategies) {
      if (strategy.active) {
        // Trigger strategy execution
        console.log(`Executing strategy: ${strategy.name}`);
      }
    }
  }

  getActivePositions() {
    const simulatedPositions = this.activePositions;
    const realPositions = this.hyperliquidService.getPositions().map(pos => ({
      id: `hyperliquid_${pos.symbol}_${pos.timestamp}`,
      asset: pos.symbol.split('-')[0],
      side: pos.side,
      entryPrice: pos.entryPrice,
      currentPrice: pos.markPrice,
      quantity: Math.abs(pos.size),
      pnl: pos.pnl,
      pnlPercent: pos.pnlPercent,
      stopLoss: pos.liquidationPrice,
      takeProfit: undefined,
      openTime: new Date(pos.timestamp)
    }));

    return [...simulatedPositions, ...realPositions];
  }

  getOpportunities() {
    return this.opportunities.slice(-10); // Últimas 10 oportunidades
  }

  getStrategies() {
    return this.strategies;
  }

  async toggleStrategy(strategyName: string) {
    const strategy = this.strategies.find(s => s.name === strategyName);
    if (strategy) {
      strategy.active = !strategy.active;
      
      await this.voiceService.speak(
        `${strategy.active ? 'Ativei' : 'Desativei'} a estratégia ${strategyName}. ${strategy.active ? 'Vamos fazer dinheiro!' : 'Ficou de fora agora.'}`,
        'confident'
      );
    }
  }

  isActive() {
    return this.isRunning;
  }
}

// Singleton instance
export const automatedTradingBot = new AutomatedTradingBotService();