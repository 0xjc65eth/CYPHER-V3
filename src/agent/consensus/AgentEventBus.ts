/**
 * CYPHER AI Trading Agent - Event Bus
 * Pub/sub system for inter-agent communication
 */

export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

export type AgentEventType =
  | 'signal' | 'vote' | 'risk_alert' | 'execution_report'
  | 'market_update' | 'consensus_request' | 'consensus_result'
  // Data Engine events
  | 'market.tick' | 'orderbook.update' | 'funding.update' | 'liquidation.detected' | 'candle.update'
  // Alpha Engine events
  | 'alpha.signal' | 'alpha.funding_arb' | 'alpha.liquidation_cascade'
  | 'alpha.spread' | 'alpha.whale_flow' | 'alpha.orderflow'
  // Portfolio events
  | 'portfolio.rebalance' | 'portfolio.allocation' | 'portfolio.exposure_breach'
  // Execution events
  | 'execution.order_sent' | 'execution.order_filled' | 'execution.order_failed'
  | 'execution.twap_tick' | 'execution.vwap_tick'
  // Regime events
  | 'regime.change' | 'regime.volatility_shift';

export interface AgentEvent {
  type: AgentEventType | string;
  source: string;
  data: any;
  timestamp: number;
  priority: EventPriority;
}

type EventHandler = (event: AgentEvent) => void | Promise<void>;

export class AgentEventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();
  private eventLog: AgentEvent[] = [];
  private maxLogSize: number = 1000;

  publish(event: AgentEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    const handlers = this.subscribers.get(event.type) || [];
    const wildcardHandlers = this.subscribers.get('*') || [];

    // Critical events execute handlers synchronously
    const allHandlers = [...handlers, ...wildcardHandlers];

    for (const handler of allHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[EventBus] Handler error for ${event.type}:`, error);
      }
    }
  }

  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => this.unsubscribe(eventType, handler);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) handlers.splice(index, 1);
    }
  }

  getRecentEvents(count: number = 50, type?: string): AgentEvent[] {
    let events = this.eventLog;
    if (type) events = events.filter(e => e.type === type);
    return events.slice(-count);
  }

  clear(): void {
    this.subscribers.clear();
    this.eventLog = [];
  }
}

// Singleton
let eventBusInstance: AgentEventBus | null = null;

export function getAgentEventBus(): AgentEventBus {
  if (!eventBusInstance) {
    eventBusInstance = new AgentEventBus();
  }
  return eventBusInstance;
}
