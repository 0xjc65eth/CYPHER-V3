// Real-time gas estimation system for QuickTrade with network condition monitoring
import { quickTradeCache } from '../cache/advancedQuickTradeCache';
import { quickTradeErrorHandler } from '../errorHandling/quickTradeErrorHandler';

interface NetworkGasData {
  chainId: string | number;
  blockNumber: number;
  baseFee: string;
  priorityFee: string;
  gasPrice: string;
  networkCongestion: number; // 0-100 scale
  blockUtilization: number; // 0-100 scale
  averageBlockTime: number; // milliseconds
  timestamp: number;
}

interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  totalCostWei: string;
  totalCostUSD: number;
  confidence: number;
  speed: 'slow' | 'standard' | 'fast' | 'instant';
  estimatedConfirmationTime: number; // seconds
}

interface DEXGasProfile {
  dex: string;
  baseGas: number;
  gasPerHop: number;
  gasMultiplier: number;
  optimizations: string[];
}

interface SmartGasStrategy {
  name: string;
  description: string;
  gasMultiplier: number;
  priorityFeeMultiplier: number;
  conditions: (networkData: NetworkGasData) => boolean;
}

class RealTimeGasEstimator {
  private networkDataCache = new Map<string, NetworkGasData>();
  private gasProfileCache = new Map<string, DEXGasProfile>();
  private priceCache = new Map<string, { priceUSD: number; timestamp: number }>();
  
  // Network gas data sources
  private gasSources = {
    ethereum: [
      'https://api.etherscan.io/api',
      'https://eth-mainnet.alchemyapi.io/v2/',
      'https://api.blocknative.com/gasprices/blockprices'
    ],
    polygon: [
      'https://api.polygonscan.com/api',
      'https://polygon-mainnet.alchemyapi.io/v2/'
    ],
    arbitrum: [
      'https://api.arbiscan.io/api'
    ],
    optimism: [
      'https://api-optimistic.etherscan.io/api'
    ],
    base: [
      'https://api.basescan.org/api'
    ],
    avalanche: [
      'https://api.snowtrace.io/api'
    ],
    bsc: [
      'https://api.bscscan.com/api'
    ]
  };

  // DEX gas profiles
  private dexGasProfiles: Record<string, DEXGasProfile> = {
    uniswap_v2: {
      dex: 'uniswap_v2',
      baseGas: 120000,
      gasPerHop: 60000,
      gasMultiplier: 1.0,
      optimizations: ['multicall', 'batch_transfers']
    },
    uniswap_v3: {
      dex: 'uniswap_v3',
      baseGas: 150000,
      gasPerHop: 70000,
      gasMultiplier: 1.1,
      optimizations: ['concentrated_liquidity', 'multicall']
    },
    sushiswap: {
      dex: 'sushiswap',
      baseGas: 130000,
      gasPerHop: 65000,
      gasMultiplier: 0.95,
      optimizations: ['bentobox', 'multicall']
    },
    curve: {
      dex: 'curve',
      baseGas: 200000,
      gasPerHop: 80000,
      gasMultiplier: 1.2,
      optimizations: ['stable_math', 'meta_pools']
    },
    balancer: {
      dex: 'balancer',
      baseGas: 180000,
      gasPerHop: 75000,
      gasMultiplier: 1.15,
      optimizations: ['weighted_math', 'batch_swaps']
    },
    oneinch: {
      dex: '1inch',
      baseGas: 160000,
      gasPerHop: 40000,
      gasMultiplier: 0.9,
      optimizations: ['pathfinding', 'gas_optimization', 'chi_gas_token']
    },
    jupiter: {
      dex: 'jupiter',
      baseGas: 5000,
      gasPerHop: 2000,
      gasMultiplier: 1.0,
      optimizations: ['compute_optimization', 'lookup_tables']
    }
  };

  // Smart gas strategies
  private gasStrategies: SmartGasStrategy[] = [
    {
      name: 'congestion_aware',
      description: 'Adjusts gas based on network congestion',
      gasMultiplier: 1.0,
      priorityFeeMultiplier: 1.0,
      conditions: (data) => data.networkCongestion > 70
    },
    {
      name: 'eip1559_optimized',
      description: 'Uses EIP-1559 for optimal pricing',
      gasMultiplier: 0.95,
      priorityFeeMultiplier: 1.1,
      conditions: (data) => data.baseFee !== '0'
    },
    {
      name: 'low_congestion',
      description: 'Reduced gas for low congestion periods',
      gasMultiplier: 0.9,
      priorityFeeMultiplier: 0.8,
      conditions: (data) => data.networkCongestion < 30
    },
    {
      name: 'fast_confirmation',
      description: 'Higher gas for fast confirmation',
      gasMultiplier: 1.2,
      priorityFeeMultiplier: 1.5,
      conditions: (data) => data.blockUtilization > 90
    }
  ];

  constructor() {
    // Initialize gas profiles cache
    Object.values(this.dexGasProfiles).forEach(profile => {
      this.gasProfileCache.set(profile.dex, profile);
    });

    // Start real-time monitoring
    this.startNetworkMonitoring();
  }

  private startNetworkMonitoring() {
    // Monitor network conditions every 15 seconds
    setInterval(() => {
      this.updateNetworkData();
    }, 15000);

    // Clean old cache data every 5 minutes
    setInterval(() => {
      this.cleanOldData();
    }, 300000);
  }

  private async updateNetworkData() {
    const networks = Object.keys(this.gasSources);
    
    await Promise.allSettled(
      networks.map(network => 
        quickTradeErrorHandler.executeWithRetry(
          () => this.fetchNetworkGasData(network),
          {
            operation: 'network_gas_update',
            chainId: network,
            attempt: 0,
            timestamp: Date.now()
          }
        )
      )
    );
  }

  private async fetchNetworkGasData(network: string): Promise<void> {
    try {
      const cacheKey = `network_gas:${network}`;
      const cached = await quickTradeCache.getGasEstimate(network, 'network_data');
      
      // Use cached data if recent (< 30 seconds)
      if (cached && Date.now() - cached.timestamp < 30000) {
        this.networkDataCache.set(network, cached);
        return;
      }

      const gasData = await this.fetchFreshNetworkData(network);
      
      // Cache the data
      await quickTradeCache.cacheGasEstimate(network, 'network_data', gasData);
      this.networkDataCache.set(network, gasData);
      
    } catch (error) {
      console.error(`❌ Failed to update gas data for ${network}:`, error);
    }
  }

  private async fetchFreshNetworkData(network: string): Promise<NetworkGasData> {
    const sources = this.gasSources[network as keyof typeof this.gasSources] || [];
    
    if (sources.length === 0) {
      return this.getMockNetworkData(network);
    }

    // Try multiple sources for redundancy
    for (const source of sources) {
      try {
        if (source.includes('etherscan') || source.includes('polygonscan') || 
            source.includes('bscscan') || source.includes('arbiscan')) {
          return await this.fetchFromEtherscanAPI(source, network);
        } else if (source.includes('alchemy')) {
          return await this.fetchFromAlchemyAPI(source, network);
        } else if (source.includes('blocknative')) {
          return await this.fetchFromBlocknativeAPI(source, network);
        }
      } catch (error) {
        continue;
      }
    }

    // Fallback to mock data
    return this.getMockNetworkData(network);
  }

  private async fetchFromEtherscanAPI(apiUrl: string, network: string): Promise<NetworkGasData> {
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.POLYGONSCAN_API_KEY || '';
    
    const [gasResponse, blockResponse] = await Promise.all([
      fetch(`${apiUrl}?module=gastracker&action=gasoracle&apikey=${apiKey}`),
      fetch(`${apiUrl}?module=proxy&action=eth_blockNumber&apikey=${apiKey}`)
    ]);

    const gasData = await gasResponse.json();
    const blockData = await blockResponse.json();

    const blockNumber = parseInt(blockData.result, 16);
    
    return {
      chainId: this.getChainId(network),
      blockNumber,
      baseFee: gasData.result?.BaseFee || '0',
      priorityFee: gasData.result?.ProposeGasPrice || gasData.result?.SafeGasPrice || '20',
      gasPrice: gasData.result?.ProposeGasPrice || '20',
      networkCongestion: this.calculateCongestion(gasData),
      blockUtilization: 50, // Mock - would need block data
      averageBlockTime: this.getAverageBlockTime(network),
      timestamp: Date.now()
    };
  }

  private async fetchFromAlchemyAPI(apiUrl: string, network: string): Promise<NetworkGasData> {
    const apiKey = process.env.ALCHEMY_API_KEY || '';
    
    const response = await fetch(`${apiUrl}${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1
      })
    });

    const data = await response.json();
    const gasPriceWei = parseInt(data.result, 16);
    const gasPriceGwei = gasPriceWei / 1e9;

    return {
      chainId: this.getChainId(network),
      blockNumber: 0, // Would need separate call
      baseFee: '0',
      priorityFee: gasPriceGwei.toString(),
      gasPrice: gasPriceGwei.toString(),
      networkCongestion: this.estimateCongestionFromGasPrice(gasPriceGwei, network),
      blockUtilization: 50,
      averageBlockTime: this.getAverageBlockTime(network),
      timestamp: Date.now()
    };
  }

  private async fetchFromBlocknativeAPI(apiUrl: string, network: string): Promise<NetworkGasData> {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': process.env.BLOCKNATIVE_API_KEY || ''
      }
    });

    const data = await response.json();
    const currentBlock = data.blockPrices[0];

    return {
      chainId: this.getChainId(network),
      blockNumber: currentBlock.blockNumber,
      baseFee: currentBlock.baseFeePerGas.toString(),
      priorityFee: currentBlock.estimatedPrices[1].maxPriorityFeePerGas.toString(),
      gasPrice: (currentBlock.baseFeePerGas + currentBlock.estimatedPrices[1].maxPriorityFeePerGas).toString(),
      networkCongestion: this.calculateCongestionFromBlocknative(data),
      blockUtilization: currentBlock.gasUsedRatio * 100,
      averageBlockTime: this.getAverageBlockTime(network),
      timestamp: Date.now()
    };
  }

  private getMockNetworkData(network: string): NetworkGasData {
    const baseGasPrices: Record<string, number> = {
      ethereum: 25,
      polygon: 30,
      arbitrum: 0.1,
      optimism: 0.001,
      base: 0.001,
      avalanche: 25,
      bsc: 5
    };

    const gasPrice = baseGasPrices[network] || 20;
    const congestion = 50;

    return {
      chainId: this.getChainId(network),
      blockNumber: Math.floor(Date.now() / 1000),
      baseFee: (gasPrice * 0.8).toString(),
      priorityFee: (gasPrice * 0.2).toString(),
      gasPrice: gasPrice.toString(),
      networkCongestion: congestion,
      blockUtilization: 50,
      averageBlockTime: this.getAverageBlockTime(network),
      timestamp: Date.now()
    };
  }

  // Main gas estimation method
  async estimateGas(
    dexName: string,
    route: string[],
    chainId: string | number,
    speed: 'slow' | 'standard' | 'fast' | 'instant' = 'standard'
  ): Promise<GasEstimate> {
    try {
      const networkData = await this.getNetworkData(chainId.toString());
      const dexProfile = this.getDEXProfile(dexName);
      const nativePrice = await this.getNativeTokenPrice(chainId);

      // Calculate base gas limit
      const gasLimit = this.calculateGasLimit(dexProfile, route.length);
      
      // Apply smart gas strategies
      const strategy = this.selectOptimalStrategy(networkData);
      const adjustedGasLimit = Math.ceil(gasLimit * strategy.gasMultiplier);

      // Calculate gas price based on network conditions and speed
      const gasPrice = this.calculateGasPrice(networkData, speed, strategy);
      
      // Calculate total cost
      const totalCostWei = (BigInt(adjustedGasLimit) * BigInt(Math.floor(parseFloat(gasPrice.gasPrice) * 1e9))).toString();
      const totalCostETH = parseFloat(totalCostWei) / 1e18;
      const totalCostUSD = totalCostETH * nativePrice;

      // Calculate confidence and confirmation time
      const confidence = this.calculateGasConfidence(networkData, strategy);
      const confirmationTime = this.estimateConfirmationTime(networkData, speed);

      const estimate: GasEstimate = {
        gasLimit: adjustedGasLimit.toString(),
        gasPrice: gasPrice.gasPrice,
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
        totalCostWei,
        totalCostUSD,
        confidence,
        speed,
        estimatedConfirmationTime: confirmationTime
      };

      // Cache the estimate
      await this.cacheGasEstimate(dexName, route, chainId, estimate);

      return estimate;
    } catch (error) {
      console.error('❌ Gas estimation failed:', error);
      throw error;
    }
  }

  private async getNetworkData(chainId: string): Promise<NetworkGasData> {
    const networkName = this.getNetworkName(chainId);
    let networkData = this.networkDataCache.get(networkName);

    if (!networkData || Date.now() - networkData.timestamp > 60000) {
      await this.fetchNetworkGasData(networkName);
      networkData = this.networkDataCache.get(networkName);
    }

    return networkData || this.getMockNetworkData(networkName);
  }

  private getDEXProfile(dexName: string): DEXGasProfile {
    const profile = this.gasProfileCache.get(dexName.toLowerCase());
    
    if (!profile) {
      // Return default profile for unknown DEX
      return {
        dex: dexName,
        baseGas: 140000,
        gasPerHop: 60000,
        gasMultiplier: 1.0,
        optimizations: []
      };
    }

    return profile;
  }

  private calculateGasLimit(profile: DEXGasProfile, routeLength: number): number {
    const hopCount = Math.max(1, routeLength - 1);
    return profile.baseGas + (profile.gasPerHop * hopCount);
  }

  private selectOptimalStrategy(networkData: NetworkGasData): SmartGasStrategy {
    // Find the best matching strategy
    const applicableStrategies = this.gasStrategies.filter(strategy => 
      strategy.conditions(networkData)
    );

    if (applicableStrategies.length === 0) {
      return this.gasStrategies[0]; // Default strategy
    }

    // Select strategy based on network conditions
    if (networkData.networkCongestion > 80) {
      return applicableStrategies.find(s => s.name === 'fast_confirmation') || applicableStrategies[0];
    } else if (networkData.networkCongestion < 30) {
      return applicableStrategies.find(s => s.name === 'low_congestion') || applicableStrategies[0];
    } else {
      return applicableStrategies.find(s => s.name === 'eip1559_optimized') || applicableStrategies[0];
    }
  }

  private calculateGasPrice(
    networkData: NetworkGasData,
    speed: string,
    strategy: SmartGasStrategy
  ): { gasPrice: string; maxFeePerGas?: string; maxPriorityFeePerGas?: string } {
    const baseGasPrice = parseFloat(networkData.gasPrice);
    const baseFee = parseFloat(networkData.baseFee);
    const priorityFee = parseFloat(networkData.priorityFee);

    // Speed multipliers
    const speedMultipliers = {
      slow: 0.8,
      standard: 1.0,
      fast: 1.2,
      instant: 1.5
    };

    const speedMultiplier = speedMultipliers[speed as keyof typeof speedMultipliers];
    
    if (baseFee > 0) {
      // EIP-1559 pricing
      const adjustedPriorityFee = priorityFee * strategy.priorityFeeMultiplier * speedMultiplier;
      const maxFeePerGas = (baseFee * 2) + adjustedPriorityFee; // 2x base fee + priority

      return {
        gasPrice: maxFeePerGas.toString(),
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: adjustedPriorityFee.toString()
      };
    } else {
      // Legacy pricing
      const adjustedGasPrice = baseGasPrice * strategy.gasMultiplier * speedMultiplier;
      
      return {
        gasPrice: adjustedGasPrice.toString()
      };
    }
  }

  private calculateGasConfidence(networkData: NetworkGasData, strategy: SmartGasStrategy): number {
    let confidence = 90;

    // Reduce confidence for high congestion
    if (networkData.networkCongestion > 70) {
      confidence -= 15;
    } else if (networkData.networkCongestion < 30) {
      confidence += 5;
    }

    // Adjust for block utilization
    if (networkData.blockUtilization > 90) {
      confidence -= 10;
    }

    // Strategy bonus
    if (strategy.name === 'eip1559_optimized') {
      confidence += 5;
    }

    return Math.max(60, Math.min(99, confidence));
  }

  private estimateConfirmationTime(networkData: NetworkGasData, speed: string): number {
    const baseTime = networkData.averageBlockTime / 1000; // Convert to seconds
    
    const speedMultipliers = {
      slow: 3,      // 3 blocks
      standard: 2,  // 2 blocks
      fast: 1,      // 1 block
      instant: 0.5  // 0.5 blocks
    };

    const blocks = speedMultipliers[speed as keyof typeof speedMultipliers];
    
    // Adjust for congestion
    const congestionMultiplier = 1 + (networkData.networkCongestion / 100);
    
    return Math.ceil(baseTime * blocks * congestionMultiplier);
  }

  private async getNativeTokenPrice(chainId: string | number): Promise<number> {
    const cacheKey = `native_price:${chainId}`;
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute cache
      return cached.priceUSD;
    }

    try {
      // Fetch native token price from CoinGecko or other source
      const price = await this.fetchNativeTokenPrice(chainId);
      this.priceCache.set(cacheKey, { priceUSD: price, timestamp: Date.now() });
      return price;
    } catch (error) {
      console.error('❌ Failed to fetch native token price:', error);
      // Return fallback prices
      const fallbackPrices: Record<string, number> = {
        '1': 2850,    // ETH
        '137': 0.8,   // MATIC
        '42161': 2850, // ARB (ETH)
        '10': 2850,   // OP (ETH)
        '8453': 2850, // BASE (ETH)
        '43114': 25,  // AVAX
        '56': 320     // BNB
      };
      return fallbackPrices[chainId.toString()] || 2850;
    }
  }

  private async fetchNativeTokenPrice(chainId: string | number): Promise<number> {
    const tokenIds: Record<string, string> = {
      '1': 'ethereum',
      '137': 'matic-network',
      '42161': 'ethereum',
      '10': 'ethereum',
      '8453': 'ethereum',
      '43114': 'avalanche-2',
      '56': 'binancecoin'
    };

    const tokenId = tokenIds[chainId.toString()];
    if (!tokenId) return 2850; // Default ETH price

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
    );
    
    const data = await response.json();
    return data[tokenId]?.usd || 2850;
  }

  private async cacheGasEstimate(
    dexName: string,
    route: string[],
    chainId: string | number,
    estimate: GasEstimate
  ): Promise<void> {
    const cacheKey = `gas_estimate:${dexName}:${route.join(':')}:${chainId}`;
    await quickTradeCache.cacheGasEstimate(chainId, cacheKey, estimate);
  }

  // Helper methods
  private getChainId(network: string): string {
    const chainIds: Record<string, string> = {
      ethereum: '1',
      polygon: '137',
      arbitrum: '42161',
      optimism: '10',
      base: '8453',
      avalanche: '43114',
      bsc: '56'
    };
    return chainIds[network] || '1';
  }

  private getNetworkName(chainId: string): string {
    const networks: Record<string, string> = {
      '1': 'ethereum',
      '137': 'polygon',
      '42161': 'arbitrum',
      '10': 'optimism',
      '8453': 'base',
      '43114': 'avalanche',
      '56': 'bsc'
    };
    return networks[chainId] || 'ethereum';
  }

  private getAverageBlockTime(network: string): number {
    const blockTimes: Record<string, number> = {
      ethereum: 12000,    // 12 seconds
      polygon: 2000,      // 2 seconds
      arbitrum: 1000,     // 1 second
      optimism: 2000,     // 2 seconds
      base: 2000,         // 2 seconds
      avalanche: 2000,    // 2 seconds
      bsc: 3000          // 3 seconds
    };
    return blockTimes[network] || 12000;
  }

  private calculateCongestion(gasData: any): number {
    const gasPrice = parseFloat(gasData.result?.ProposeGasPrice || '20');
    // Simple congestion calculation based on gas price
    return Math.min(100, Math.max(0, (gasPrice - 10) / 0.5));
  }

  private estimateCongestionFromGasPrice(gasPrice: number, network: string): number {
    const basePrices: Record<string, number> = {
      ethereum: 15,
      polygon: 20,
      arbitrum: 0.1,
      optimism: 0.001,
      base: 0.001,
      avalanche: 20,
      bsc: 3
    };

    const basePrice = basePrices[network] || 15;
    return Math.min(100, Math.max(0, ((gasPrice - basePrice) / basePrice) * 100));
  }

  private calculateCongestionFromBlocknative(data: any): number {
    const currentBlock = data.blockPrices[0];
    return Math.min(100, currentBlock.gasUsedRatio * 100);
  }

  private cleanOldData() {
    const cutoff = Date.now() - 3600000; // 1 hour
    
    for (const [key, data] of this.networkDataCache) {
      if (data.timestamp < cutoff) {
        this.networkDataCache.delete(key);
      }
    }

    for (const [key, data] of this.priceCache) {
      if (data.timestamp < cutoff) {
        this.priceCache.delete(key);
      }
    }
  }

  // Public API methods
  async batchEstimate(
    requests: Array<{
      dexName: string;
      route: string[];
      chainId: string | number;
      speed?: 'slow' | 'standard' | 'fast' | 'instant';
    }>
  ): Promise<GasEstimate[]> {
    return quickTradeErrorHandler.executeBulkOperation(
      requests.map(req => ({
        operation: () => this.estimateGas(req.dexName, req.route, req.chainId, req.speed),
        context: {
          operation: 'gas_estimation',
          dex: req.dexName,
          chainId: req.chainId
        }
      }))
    ).then(results => 
      results
        .filter(result => result.success)
        .map(result => result.result!)
    );
  }

  getNetworkStatus(chainId: string | number): NetworkGasData | null {
    const networkName = this.getNetworkName(chainId.toString());
    return this.networkDataCache.get(networkName) || null;
  }

  getAllNetworkStatuses(): Record<string, NetworkGasData> {
    const statuses: Record<string, NetworkGasData> = {};
    for (const [network, data] of this.networkDataCache) {
      statuses[network] = data;
    }
    return statuses;
  }

  getGasOptimizationTips(dexName: string): string[] {
    const profile = this.getDEXProfile(dexName);
    return profile.optimizations || [];
  }
}

// Export singleton instance
export const realTimeGasEstimator = new RealTimeGasEstimator();

// Export types
export type { NetworkGasData, GasEstimate, DEXGasProfile, SmartGasStrategy };
export { RealTimeGasEstimator };