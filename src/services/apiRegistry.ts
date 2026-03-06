/**
 * API Service Registry - CYPHER V3
 * Central registry that imports and exports all API services for unified access.
 *
 * Usage:
 *   import { ordinalsMarketService, xverseAPI, bitcoinEcosystemService } from '@/services/apiRegistry';
 */

// Ordinals marketplace service (OKX primary → Hiro fallback)
export { ordinalsMarketService, OrdinalsMarketService } from './ordinalsMarketService';

// Runes marketplace service (Hiro primary → Gamma fallback)
export { runesMarketService, RunesMarketService } from './runesMarketService';

// UniSat - Core Bitcoin service (addresses, UTXOs, blocks, transactions, BRC-20)
export { unisatService, UniSatService } from './unisatService';

// UniSat - Runes + Marketplace service (runes indexer, marketplace operations)
export { unisatRunesService, UniSatRunesService } from './unisatRunesService';

// Xverse - Primary data source (Ordinals, Runes, BRC-20, Bitcoin price/fees)
export { xverseAPI } from '@/lib/api/xverse';

// Hiro - Ordinals/Runes/BRC-20 indexer
export { hiroAPI } from '@/lib/api/hiro';

// Bitcoin Ecosystem - Aggregated ecosystem stats
export { bitcoinEcosystemService } from './BitcoinEcosystemService';

// Ordinals API - Collection stats and processing
export { ordinalsAPI } from './ordinalsApi';
