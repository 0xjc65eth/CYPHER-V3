'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  ArrowUpDown, 
  TrendingUp, 
  Shield, 
  Target,
  Calculator,
  Network,
  Info,
  Sparkles,
  Activity,
  DollarSign,
  Globe
} from 'lucide-react';
import { QuickTradeWalletConnect } from '@/components/quicktrade/QuickTradeWalletConnect';
import { QuickTradeSwapLogic } from '@/components/quicktrade/QuickTradeSwapLogic';
import { useBitcoinWallet } from '@/contexts/BitcoinWalletContext';
import { FEE_CONFIG, calculateServiceFee } from '@/config/feeRecipients';
import { FeeInfoDisplay } from '@/components/quicktrade/FeeInfoDisplay';

// Tokens suportados por rede
const SUPPORTED_TOKENS = {
  ethereum: [
    { symbol: 'ETH', name: 'Ethereum', address: 'native', price: 2850, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', price: 1, decimals: 6 },
    { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', price: 1, decimals: 6 },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a760698606B8eE2121c351', price: 110000, decimals: 8 },
    { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', price: 7.5, decimals: 18 }
  ],
  arbitrum: [
    { symbol: 'ETH', name: 'Ethereum', address: 'native', price: 2850, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0xFF970A61A04b1496CfD6E66A7F2e0428A7B', price: 1, decimals: 6 },
    { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1e0d023ec7E279e0F5E57e8E79', price: 1.2, decimals: 18 },
    { symbol: 'GMX', name: 'GMX', address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', price: 45, decimals: 18 }
  ],
  optimism: [
    { symbol: 'ETH', name: 'Ethereum', address: 'native', price: 2850, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0x7F5c764cBc14f9e7F2C5D3371B5c7005e9266DA72', price: 1, decimals: 6 },
    { symbol: 'OP', name: 'Optimism', address: '0x4200000000000000000000000000000000000042', price: 2.3, decimals: 18 }
  ],
  polygon: [
    { symbol: 'MATIC', name: 'Polygon', address: 'native', price: 0.8, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', price: 1, decimals: 6 },
    { symbol: 'WETH', name: 'Wrapped ETH', address: '0x7ceB23fD6bC0AdD59E62ac25578270cFf1b9f619', price: 2850, decimals: 18 }
  ],
  base: [
    { symbol: 'ETH', name: 'Ethereum', address: 'native', price: 2850, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', price: 1, decimals: 6 },
    { symbol: 'AERO', name: 'Aerodrome', address: '0x940181a94A35A4169056f0a7F41A0', price: 0.85, decimals: 18 }
  ],
  avalanche: [
    { symbol: 'AVAX', name: 'Avalanche', address: 'native', price: 25, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0xB97EF9Ef8734C71904C8002488e682b522', price: 1, decimals: 6 },
    { symbol: 'JOE', name: 'TraderJoe', address: '0x6e84a6216eA6daCC71B8E3Cdeb8b4Fbf4B', price: 0.35, decimals: 18 }
  ],
  bsc: [
    { symbol: 'BNB', name: 'BNB', address: 'native', price: 320, decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0x8AC76a51cc950d9846D10dF9Df5F2F5', price: 1, decimals: 18 },
    { symbol: 'CAKE', name: 'PancakeSwap', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e8', price: 2.1, decimals: 18 }
  ],
  solana: [
    { symbol: 'SOL', name: 'Solana', address: 'native', price: 95, decimals: 9 },
    { symbol: 'USDC', name: 'USD Coin', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', price: 1, decimals: 6 },
    { symbol: 'RAY', name: 'Raydium', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', price: 2.1, decimals: 6 }
  ]
};

const NETWORK_LABELS = {
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  polygon: 'Polygon',
  base: 'Base',
  avalanche: 'Avalanche',
  bsc: 'BSC',
  solana: 'Solana'
};

const NETWORK_COLORS = {
  ethereum: 'border-blue-500 bg-blue-500/10',
  arbitrum: 'border-blue-400 bg-blue-400/10',
  optimism: 'border-red-500 bg-red-500/10',
  polygon: 'border-purple-600 bg-purple-600/10',
  base: 'border-blue-600 bg-blue-600/10',
  avalanche: 'border-red-600 bg-red-600/10',
  bsc: 'border-yellow-500 bg-yellow-500/10',
  solana: 'border-purple-500 bg-purple-500/10'
};

export default function QuickTradePage() {
  // Estados principais
  const [selectedNetwork, setSelectedNetwork] = useState<keyof typeof SUPPORTED_TOKENS>('ethereum');
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [connectedAddress, setConnectedAddress] = useState('');
  
  // Estados da UI
  const [currentTab, setCurrentTab] = useState('trade');
  const [feeCalculation, setFeeCalculation] = useState<any>(null);

  // Context
  const wallet = useBitcoinWallet();

  // Tokens disponíveis para a rede selecionada
  const availableTokens = SUPPORTED_TOKENS[selectedNetwork];

  // Calcular taxa em tempo real
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      const tokenPrice = availableTokens.find(t => t.symbol === fromToken)?.price || 0;
      const usdValue = parseFloat(amount) * tokenPrice;
      const calculation = calculateServiceFee(usdValue);
      setFeeCalculation({ ...calculation, usdValue });
    } else {
      setFeeCalculation(null);
    }
  }, [amount, fromToken, selectedNetwork, availableTokens]);

  // Handler para conexão de carteira
  const handleWalletConnect = (address: string, walletType: string) => {
    setConnectedAddress(address);
  };

  // Handler para trocar tokens
  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  // Handler para mudar rede
  const handleNetworkChange = (network: keyof typeof SUPPORTED_TOKENS) => {
    setSelectedNetwork(network);
    // Reset tokens quando mudar de rede
    const tokens = SUPPORTED_TOKENS[network];
    setFromToken(tokens[0].symbol);
    setToToken(tokens[1].symbol);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-6">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">CYPHER Quick Trade</h1>
              <p className="text-gray-400">Melhor execução cross-DEX com taxa transparente de {FEE_CONFIG.serviceFeePercentage}%</p>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 p-4">
              <div className="flex items-center justify-center gap-2">
                <Network className="w-5 h-5 text-blue-500" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">8</div>
                  <div className="text-sm text-gray-400">Redes</div>
                </div>
              </div>
            </Card>
            
            <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 p-4">
              <div className="flex items-center justify-center gap-2">
                <Globe className="w-5 h-5 text-green-500" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">25+</div>
                  <div className="text-sm text-gray-400">DEXs</div>
                </div>
              </div>
            </Card>
            
            <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 p-4">
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-500" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{FEE_CONFIG.serviceFeePercentage}%</div>
                  <div className="text-sm text-gray-400">Taxa</div>
                </div>
              </div>
            </Card>
            
            <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 p-4">
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">100%</div>
                  <div className="text-sm text-gray-400">Seguro</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Main Interface */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
            <TabsTrigger value="trade" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trade
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Trade Tab */}
          <TabsContent value="trade">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Swap Interface */}
              <Card className="bg-gray-900 border-gray-700 p-6">
                <div className="space-y-6">
                  {/* Network Selector */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Select Network</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(NETWORK_LABELS) as Array<keyof typeof NETWORK_LABELS>).map((network) => (
                        <Button
                          key={network}
                          variant={selectedNetwork === network ? 'default' : 'outline'}
                          onClick={() => handleNetworkChange(network)}
                          className={`text-xs p-2 h-auto ${selectedNetwork === network ? NETWORK_COLORS[network] : 'border-gray-600'}`}
                        >
                          <div className="text-center">
                            <Network className="w-3 h-3 mx-auto mb-1" />
                            <div>{NETWORK_LABELS[network]}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Token Selection */}
                  <div className="space-y-4">
                    {/* From Token */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">You Pay</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.0"
                          className="flex-1 bg-transparent text-2xl font-bold text-white outline-none"
                        />
                        <select
                          value={fromToken}
                          onChange={(e) => setFromToken(e.target.value)}
                          className="bg-gray-700 rounded px-3 py-2 text-white border border-gray-600"
                        >
                          {availableTokens.map(token => (
                            <option key={token.symbol} value={token.symbol}>
                              {token.symbol}
                            </option>
                          ))}
                        </select>
                      </div>
                      {feeCalculation && (
                        <div className="text-sm text-gray-400 mt-2">
                          ≈ ${feeCalculation.usdValue.toFixed(2)} USD
                        </div>
                      )}
                    </div>

                    {/* Swap Button */}
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={swapTokens}
                        className="rounded-full p-2 border-gray-600 hover:bg-gray-700"
                      >
                        <ArrowUpDown className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* To Token */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">You Receive</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 text-2xl font-bold text-gray-500">
                          {amount ? (parseFloat(amount) * 0.998).toFixed(4) : '0.0'}
                        </div>
                        <select
                          value={toToken}
                          onChange={(e) => setToToken(e.target.value)}
                          className="bg-gray-700 rounded px-3 py-2 text-white border border-gray-600"
                        >
                          {availableTokens.filter(t => t.symbol !== fromToken).map(token => (
                            <option key={token.symbol} value={token.symbol}>
                              {token.symbol}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Fee Info Display */}
                  <FeeInfoDisplay 
                    amount={parseFloat(amount) || 0}
                    token={fromToken}
                    chainType={selectedNetwork === 'solana' ? 'solana' : selectedNetwork === 'bitcoin' ? 'bitcoin' : 'ethereum'}
                  />

                  {/* Wallet Connection */}
                  <QuickTradeWalletConnect
                    onWalletConnect={handleWalletConnect}
                    selectedNetwork={selectedNetwork}
                  />
                </div>
              </Card>

              {/* Swap Logic */}
              <QuickTradeSwapLogic
                fromToken={fromToken}
                toToken={toToken}
                amount={amount}
                network={selectedNetwork}
                userAddress={connectedAddress || wallet.address || ''}
                onSwapComplete={(result) => {
                }}
                onError={(error) => {
                  console.error('❌ Swap error:', error);
                }}
              />
            </div>
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <div className="max-w-2xl mx-auto">
              <Card className="bg-gray-900 border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Wallet Management
                </h2>
                <QuickTradeWalletConnect
                  onWalletConnect={handleWalletConnect}
                  selectedNetwork={selectedNetwork}
                  requiredNetworks={Object.keys(SUPPORTED_TOKENS)}
                />
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-900 border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  Quick Trade Features
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                    <div>
                      <div className="text-white font-medium">Cross-DEX Analysis</div>
                      <div className="text-sm text-gray-400">Compare prices across multiple exchanges automatically</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    <div>
                      <div className="text-white font-medium">Transparent Fees</div>
                      <div className="text-sm text-gray-400">Fixed {FEE_CONFIG.serviceFeePercentage}% fee with no hidden costs</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                    <div>
                      <div className="text-white font-medium">Multi-Chain Support</div>
                      <div className="text-sm text-gray-400">Trade on 8 major blockchain networks</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                    <div>
                      <div className="text-white font-medium">Secure Execution</div>
                      <div className="text-sm text-gray-400">Direct redirect to official DEX interfaces</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-gray-900 border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  How It Works
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                    <div>
                      <div className="text-white font-medium">Connect Wallet</div>
                      <div className="text-sm text-gray-400">Link your Bitcoin, Ethereum, or Solana wallet</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                    <div>
                      <div className="text-white font-medium">Analyze Markets</div>
                      <div className="text-sm text-gray-400">We find the best price across all DEXs</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                    <div>
                      <div className="text-white font-medium">Execute Trade</div>
                      <div className="text-sm text-gray-400">Complete your swap on the optimal exchange</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                    <div>
                      <div className="text-white font-medium">Fee Collection</div>
                      <div className="text-sm text-gray-400">Transparent {FEE_CONFIG.serviceFeePercentage}% fee collected automatically</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Card className="bg-gray-900/50 border-gray-700 p-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">CYPHER ORDI FUTURE - Quick Trade</span>
            </div>
            <p className="text-xs text-gray-400">
              Sistema de intermediação inteligente que encontra a melhor execução cross-DEX.<br />
              Taxa de serviço transparente de {FEE_CONFIG.serviceFeePercentage}% sobre o valor da transação. Valor mínimo: ${FEE_CONFIG.minimumTransactionUSD} USD.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}