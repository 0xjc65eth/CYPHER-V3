/**
 * Magic Eden API Types - CYPHER V3
 *
 * Re-exports all Magic Eden types from service files.
 * These types are preserved for backward compatibility during the
 * OKX NFT / UniSat migration (Magic Eden is deprecated for Ordinals/Runes).
 */

// Re-export from Magic Eden services
export type {
  MagicEdenCollectionDetail,
  MagicEdenCollectionStats,
  MagicEdenToken,
  MagicEdenTokensResponse,
  MagicEdenBlockActivity,
  MagicEdenBlockActivitiesResponse,
  MagicEdenRareSatListing,
  MagicEdenRareSatListingsResponse,
  MagicEdenRareSatUtxo,
  MagicEdenRareSatUtxosResponse,
  MagicEdenBatchListingPSBTRequest,
  MagicEdenBatchListingPSBTResponse,
  MagicEdenBatchListingSubmitRequest,
  MagicEdenBatchListingSubmitResponse,
  MagicEdenTokensParams,
  MagicEdenBlockActivitiesParams,
  MagicEdenRareSatListingsParams,
  MagicEdenServiceError,
} from '../services/magicEdenService';

export type {
  RuneMarketInfo,
  RuneOrdersParams,
  RuneOrder,
  RuneOrdersResponse,
  RuneUtxosParams,
  RuneUtxo,
  RuneUtxosResponse,
  RuneActivitiesParams,
  RuneActivity,
  RuneActivitiesResponse,
  RuneWalletActivitiesParams,
  RuneWalletActivitiesResponse,
  RuneWalletBalancesParams,
  RuneWalletBalance,
  RuneCollectionStatsParams,
  RuneCollectionStat,
  RuneCollectionStatsResponse,
  CreateOrderPsbtRequest,
  CreateOrderPsbtResponse,
  SubmitOrderRequest,
  SubmitOrderResponse,
  CancelOrderPsbtRequest,
  CancelOrderPsbtResponse,
  CancelOrderRequest,
  CancelOrderResponse,
  SweepingPsbtRequest,
  SweepingPsbtResponse,
  SubmitSweepingRequest,
  SubmitSweepingResponse,
  MarketSellPsbtRequest,
  MarketSellPsbtResponse,
  SubmitMarketSellRequest,
  SubmitMarketSellResponse,
  RuneSwapQuoteParams,
  RuneSwapQuoteResponse,
  SwapPsbtRequest,
  SwapPsbtResponse,
  SubmitSwapRequest,
  SubmitSwapResponse,
  MagicEdenApiError,
} from '../services/magicEdenRunesService';

// Re-export from magicEdenApi
export type {
  MagicEdenCollection,
  MagicEdenStatsResponse,
} from '../services/magicEdenApi';
