/**
 * CYPHER AI Trading Agent - Data Engine
 * Central data layer for all market data streams.
 */

export { MarketDataService, getMarketDataService } from './MarketDataService';
export type { MarketTick, NormalizedOrderBook, FundingSnapshot, LiquidationEvent, MarketDataConfig } from './MarketDataService';

export { OrderbookAggregator, getOrderbookAggregator } from './OrderbookAggregator';
export type { OrderBookLevel, DepthMetrics, LiquidityWall, OrderBookSnapshot } from './OrderbookAggregator';

export { FundingRateTracker, getFundingRateTracker } from './FundingRateTracker';
export type { FundingHistory, FundingArbitrageOpportunity, FundingTrackerConfig } from './FundingRateTracker';

export { LiquidationTracker, getLiquidationTracker } from './LiquidationTracker';
export type { LiquidationCluster, LiquidationHeatmap, CascadeAlert, LiquidationTrackerConfig } from './LiquidationTracker';

export { CandleStore, getCandleStore } from './CandleStore';
export type { TimeFrame, CandleStoreConfig } from './CandleStore';
