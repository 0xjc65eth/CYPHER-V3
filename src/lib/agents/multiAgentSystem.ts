/**
 * 🧠 Multi-Agent System Coordinator
 * Orchestrates all AI agents for CYPHER ORDI FUTURE
 */

import { EventEmitter } from 'events';
import { Agent024_TradingIntelligence } from './agent-024';
import { Agent025_AutoTrading } from './agent-025';
import { TradingEngine } from '../trading/trading-engine';

export interface SystemStatus {
  agents: {
    AGENT_024: {
      active: boolean;
      totalSignals: number;
    };
    AGENT_025: {
      active: boolean;
      autoTradingEnabled: boolean;
      totalExecutions: number;
    };
  };
  systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  uptime: number;
  performance: {
    winRate: number;
    totalPnL: number;
    sharpeRatio: number;
  };
}

export class MultiAgentSystem extends EventEmitter {
  private agent024: Agent024_TradingIntelligence;
  private agent025: Agent025_AutoTrading;
  private tradingEngine: TradingEngine;
  private startTime: Date;
  private isRunning: boolean = false;

  constructor() {
    super();
    
    // Initialize trading engine
    this.tradingEngine = new TradingEngine({
      maxDrawdown: 2,
      positionSize: 5,
      stopLoss: 3,
      takeProfit: 6,
      dailyTradeLimit: 20,
      riskRewardRatio: 2
    });

    // Initialize agents
    this.agent024 = new Agent024_TradingIntelligence();
    this.agent025 = new Agent025_AutoTrading(this.tradingEngine);
    
    this.startTime = new Date();
    this.setupAgentConnections();
    
  }

  private setupAgentConnections() {
    // Connect AGENT_024 signals to AGENT_025 execution
    this.agent024.on('signal:generated', async (signal) => {
      if (this.agent025.getStatus().autoTradingEnabled) {
        await this.agent025.processSignal(signal);
      }
      this.emit('signal:generated', signal);
    });

    // Forward agent events
    this.agent024.on('agent:started', () => this.emit('agent:started', 'AGENT_024'));
    this.agent024.on('agent:stopped', () => this.emit('agent:stopped', 'AGENT_024'));
    
    this.agent025.on('agent:started', () => this.emit('agent:started', 'AGENT_025'));
    this.agent025.on('agent:stopped', () => this.emit('agent:stopped', 'AGENT_025'));
    
    this.agent025.on('trade:executed', (execution) => this.emit('trade:executed', execution));
    this.agent025.on('trade:failed', (execution) => this.emit('trade:failed', execution));
    this.agent025.on('emergency:stop', () => this.handleEmergencyStop());
  }

  async start() {
    if (this.isRunning) return;
    
    
    // Start trading engine
    this.tradingEngine.start();
    
    // Start agents
    this.agent024.start();
    this.agent025.start();
    
    this.isRunning = true;
    this.emit('system:started');
    
  }

  async stop() {
    if (!this.isRunning) return;
    
    
    // Stop agents
    this.agent024.stop();
    this.agent025.stop();
    
    // Stop trading engine
    this.tradingEngine.stop();
    
    this.isRunning = false;
    this.emit('system:stopped');
    
  }

  emergencyStop() {
    
    this.agent025.emergencyStop();
    this.agent024.stop();
    this.tradingEngine.stop();
    
    this.isRunning = false;
    this.emit('emergency:stop');
  }

  private handleEmergencyStop() {
    this.stop();
    this.emit('system:emergency', 'Emergency stop triggered by AGENT_025');
  }

  getSystemStatus(): SystemStatus {
    const agent024Status = this.agent024.getStatus();
    const agent025Status = this.agent025.getStatus();
    const engineStatus = this.tradingEngine.getStatus();
    
    // Calculate performance metrics
    const executions = this.agent025.getExecutionHistory();
    const successfulTrades = executions.filter(e => e.status === 'SUCCESS').length;
    const winRate = executions.length > 0 ? (successfulTrades / executions.length) * 100 : 0;
    
    // Determine system health
    let systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    
    if (!this.isRunning) {
      systemHealth = 'WARNING';
    } else if (agent025Status.emergencyStop || winRate < 40) {
      systemHealth = 'CRITICAL';
    }
    
    const uptime = Date.now() - this.startTime.getTime();
    
    return {
      agents: {
        AGENT_024: {
          active: agent024Status.isActive,
          totalSignals: agent024Status.totalSignals
        },
        AGENT_025: {
          active: agent025Status.isActive,
          autoTradingEnabled: agent025Status.autoTradingEnabled,
          totalExecutions: agent025Status.totalExecutions
        }
      },
      systemHealth,
      uptime,
      performance: {
        winRate,
        totalPnL: agent025Status.dailyPnL,
        sharpeRatio: 2.4 // Mock value
      }
    };
  }

  // Agent control methods
  getAgent024() { return this.agent024; }
  getAgent025() { return this.agent025; }
  getTradingEngine() { return this.tradingEngine; }
}

// Singleton instance
let systemInstance: MultiAgentSystem | null = null;

export function getMultiAgentSystem(): MultiAgentSystem {
  if (!systemInstance) {
    systemInstance = new MultiAgentSystem();
  }
  return systemInstance;
}