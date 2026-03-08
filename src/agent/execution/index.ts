/**
 * CYPHER AI Trading Agent - Execution Engine
 * Professional order execution with smart routing, slippage control,
 * and algorithmic execution (TWAP/VWAP).
 */

export { OrderExecutionService, getOrderExecutionService } from './OrderExecutionService';
export type { ExecutionRequest, ExecutionResult, ExecutionAlgorithm, ExecutionServiceConfig } from './OrderExecutionService';

export { SmartOrderRouter } from './SmartOrderRouter';
export type { Venue, VenueExecutionResult, RoutingDecision, SplitRoutingDecision, RouterConfig } from './SmartOrderRouter';

export { TWAPExecutor } from './TWAPExecutor';
export type { TWAPOrder, TWAPSlice, TWAPStatus, TWAPConfig } from './TWAPExecutor';

export { VWAPExecutor } from './VWAPExecutor';
export type { VWAPOrder, VWAPSlice, VWAPStatus, VolumeProfileBucket, VWAPConfig } from './VWAPExecutor';

export { SlippageController, getSlippageController } from './SlippageController';
export type { SlippageEstimate, FillRecord, SlippageControllerConfig } from './SlippageController';
