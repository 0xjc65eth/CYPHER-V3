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

// Magic Eden API types
export * from './magiceden';

// UniSat API types
export * from './unisat'; 