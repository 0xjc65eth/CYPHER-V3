/**
 * API Service Registry - CYPHER V3
 * Central registry that imports and exports all API services for unified access.
 *
 * Usage:
 *   import { magicEdenService, unisatService } from '@/services/apiRegistry';
 */

// Magic Eden - Core Ordinals service (collections, tokens, blocks, rare sats)
export { magicEdenService, MagicEdenService } from './magicEdenService';

// Magic Eden - Runes-specific service (runes info, listings, sweeping, market sell, swaps)
export { magicEdenRunesService, MagicEdenRunesService } from './magicEdenRunesService';

// UniSat - Core Bitcoin service (addresses, UTXOs, blocks, transactions, BRC-20)
export { unisatService, UniSatService } from './unisatService';

// UniSat - Runes + Marketplace service (runes indexer, marketplace operations)
export { unisatRunesService, UniSatRunesService } from './unisatRunesService';
