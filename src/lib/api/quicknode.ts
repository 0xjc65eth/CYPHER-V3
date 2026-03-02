/**
 * QuickNode Bitcoin RPC Service
 * Interação direta com a blockchain Bitcoin
 */

import { apiClient } from './client';
import { API_CONFIG } from './config';
import { cacheService, cacheKeys, cacheTTL } from '@/lib/cache';
import { devLogger } from '@/lib/logger';

// Tipos para RPC responses
export interface BlockInfo {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash?: string;
  nextblockhash?: string;
}

export interface TransactionInfo {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: any[];
  vout: any[];
  hex: string;
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
}

export interface MempoolInfo {
  loaded: boolean;
  size: number;
  bytes: number;
  usage: number;
  maxmempool: number;
  mempoolminfee: number;
  minrelaytxfee: number;
}

export interface NetworkInfo {
  version: number;
  subversion: string;
  protocolversion: number;
  connections: number;
  networks: any[];
  relayfee: number;
  incrementalfee: number;
  localaddresses: any[];
  warnings: string;
}

class QuickNodeService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = API_CONFIG.quicknode.baseUrl;
  }

  /**
   * Fazer chamada RPC genérica
   */
  private async rpcCall(method: string, params: any[] = []) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'RPC Error');
      }
      
      return data.result;
    } catch (error) {
      devLogger.error(error as Error, `QuickNode RPC call failed: ${method}`);
      throw error;
    }
  }

  /**
   * Obter informações do bloco mais recente
   */
  async getLatestBlock(): Promise<BlockInfo> {
    return cacheService.getOrCompute(
      (cacheKeys as any).quicknode('latest-block'),
      async () => {
        devLogger.log('QUICKNODE', 'Fetching latest block');

        // Primeiro, obter o hash do bloco mais recente
        const blockHash = await this.rpcCall('getbestblockhash');

        // Depois, obter as informações do bloco
        const blockInfo = await this.rpcCall('getblock', [blockHash, 1]);

        return blockInfo;
      },
      (cacheTTL as any).blocks
    );
  }

  /**
   * Obter informações de um bloco específico
   */
  async getBlock(blockHash: string): Promise<BlockInfo> {
    return cacheService.getOrCompute(
      (cacheKeys as any).quicknode(`block-${blockHash}`),
      async () => {
        devLogger.log('QUICKNODE', `Fetching block: ${blockHash}`);
        return await this.rpcCall('getblock', [blockHash, 1]);
      },
      (cacheTTL as any).blocks
    );
  }

  /**
   * Obter informações de uma transação
   */
  async getTransaction(txid: string): Promise<TransactionInfo> {
    return cacheService.getOrCompute(
      (cacheKeys as any).quicknode(`tx-${txid}`),
      async () => {
        devLogger.log('QUICKNODE', `Fetching transaction: ${txid}`);
        return await this.rpcCall('getrawtransaction', [txid, true]);
      },
      (cacheTTL as any).transactions
    );
  }

  /**
   * Obter informações da mempool
   */
  async getMempoolInfo(): Promise<MempoolInfo> {
    return cacheService.getOrCompute(
      (cacheKeys as any).quicknode('mempool-info'),
      async () => {
        devLogger.log('QUICKNODE', 'Fetching mempool info');
        return await this.rpcCall('getmempoolinfo');
      },
      60 // Cache por 1 minuto
    );
  }

  /**
   * Obter informações da rede
   */
  async getNetworkInfo(): Promise<NetworkInfo> {
    return cacheService.getOrCompute(
      (cacheKeys as any).quicknode('network-info'),
      async () => {
        devLogger.log('QUICKNODE', 'Fetching network info');
        return await this.rpcCall('getnetworkinfo');
      },
      (cacheTTL as any).network
    );
  }

  /**
   * Obter altura atual da blockchain
   */
  async getBlockCount(): Promise<number> {
    return cacheService.getOrCompute(
      (cacheKeys as any).quicknode('block-count'),
      async () => {
        devLogger.log('QUICKNODE', 'Fetching block count');
        return await this.rpcCall('getblockcount');
      },
      (cacheTTL as any).blocks
    );
  }

  /**
   * Obter dificuldade atual de mineração
   */
  async getDifficulty(): Promise<number> {
    return cacheService.getOrCompute(
      (cacheKeys as any).quicknode('difficulty'),
      async () => {
        devLogger.log('QUICKNODE', 'Fetching mining difficulty');
        return await this.rpcCall('getdifficulty');
      },
      (cacheTTL as any).mining
    );
  }

  /**
   * Obter hashrate da rede
   */
  async getNetworkHashrate(): Promise<number> {
    return cacheService.getOrCompute(
      (cacheKeys as any).quicknode('network-hashrate'),
      async () => {
        devLogger.log('QUICKNODE', 'Fetching network hashrate');
        return await this.rpcCall('getnetworkhashps');
      },
      (cacheTTL as any).mining
    );
  }

  /**
   * Obter informações de um endereço (UTXO)
   */
  async getAddressInfo(address: string) {
    // QuickNode não suporta nativamente consulta por endereço
    // Precisaríamos usar um indexador adicional
    devLogger.log('QUICKNODE', 'Address lookup requires additional indexing service');
    throw new Error('Address lookup not supported via standard RPC');
  }

  /**
   * Enviar transação raw
   */
  async sendRawTransaction(hexString: string): Promise<string> {
    try {
      devLogger.log('QUICKNODE', 'Broadcasting transaction');
      const txid = await this.rpcCall('sendrawtransaction', [hexString]);
      return txid;
    } catch (error) {
      devLogger.error(error as Error, 'Failed to broadcast transaction');
      throw error;
    }
  }

  /**
   * Estimar taxa de transação
   */
  async estimateFee(blocks: number = 6): Promise<number> {
    return cacheService.getOrCompute(
      (cacheKeys as any).quicknode(`fee-estimate-${blocks}`),
      async () => {
        devLogger.log('QUICKNODE', `Estimating fee for ${blocks} blocks`);
        const result = await this.rpcCall('estimatesmartfee', [blocks]);
        return result.feerate || 0;
      },
      (cacheTTL as any).fees
    );
  }
}

// Cache keys específicos para QuickNode
(cacheKeys as any).quicknode = (key: string) => `quicknode:${key}`;

// Exportar instância singleton
export const quickNodeService = new QuickNodeService();