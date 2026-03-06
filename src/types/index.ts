import { UserState } from './user';
import { MarketState } from './market';
import { MempoolState } from './mempool';
import { MiningState } from './mining';

export interface RootState {
  user: UserState;
  market: MarketState;
  mempool: MempoolState;
  mining: MiningState;
}

// Ordinals marketplace types (Magic Eden removed — deprecated)

// UniSat API types
export * from './unisat'; 