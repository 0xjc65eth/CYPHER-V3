'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Zap, 
  ArrowUpDown, 
  TrendingUp, 
  ExternalLink,
  Calculator,
  DollarSign,
  Info
} from 'lucide-react'
import { FeeInfoDisplay } from '@/components/quicktrade/FeeInfoDisplay'
import { generateSwapDeeplink, validateMinimumAmount, calculateFeeAmount, FEE_PERCENTAGE } from '@/config/feeRecipients'

// Tokens suportados com preços atualizados
const SUPPORTED_TOKENS = {
  ethereum: [
    { symbol: 'ETH', name: 'Ethereum', price: 2850, decimals: 18, minAmount: 0.003 },
    { symbol: 'USDC', name: 'USD Coin', price: 1, decimals: 6, minAmount: 10 },
    { symbol: 'USDT', name: 'Tether USD', price: 1, decimals: 6, minAmount: 10 },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', price: 110000, decimals: 8, minAmount: 0.00009 }
  ],
  bitcoin: [
    { symbol: 'BTC', name: 'Bitcoin', price: 110000, decimals: 8, minAmount: 0.00009 },
    { symbol: 'ORDI', name: 'Ordinals', price: 45, decimals: 18, minAmount: 0.22 }
  ],
  solana: [
    { symbol: 'SOL', name: 'Solana', price: 95, decimals: 9, minAmount: 0.1 },
    { symbol: 'USDC', name: 'USD Coin', price: 1, decimals: 6, minAmount: 10 }
  ],
  bsc: [
    { symbol: 'BNB', name: 'BNB', price: 320, decimals: 18, minAmount: 0.03 },
    { symbol: 'USDT', name: 'Tether USD', price: 1, decimals: 18, minAmount: 10 },
    { symbol: 'CAKE', name: 'PancakeSwap', price: 2.1, decimals: 18, minAmount: 5 }
  ],
  avalanche: [
    { symbol: 'AVAX', name: 'Avalanche', price: 25, decimals: 18, minAmount: 0.4 },
    { symbol: 'USDC', name: 'USD Coin', price: 1, decimals: 6, minAmount: 10 },
    { symbol: 'JOE', name: 'TraderJoe', price: 0.35, decimals: 18, minAmount: 30 }
  ]
}

const NETWORK_LABELS = {
  ethereum: 'Ethereum',
  bitcoin: 'Bitcoin', 
  solana: 'Solana',
  bsc: 'BSC',
  avalanche: 'Avalanche'
}

export function QuickTradeWidget() {
  const [selectedNetwork, setSelectedNetwork] = useState<keyof typeof SUPPORTED_TOKENS>('ethereum')
  const [fromToken, setFromToken] = useState('ETH')
  const [toToken, setToToken] = useState('USDC')
  const [usdAmount, setUsdAmount] = useState('50')
  const [calculatedAmount, setCalculatedAmount] = useState('0')
  const [isValidAmount, setIsValidAmount] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')

  // Tokens disponíveis para a rede selecionada
  const availableTokens = SUPPORTED_TOKENS[selectedNetwork]
  const fromTokenData = availableTokens.find(t => t.symbol === fromToken)
  const toTokenData = availableTokens.find(t => t.symbol === toToken)

  // Calcular quantidade baseada no valor USD
  useEffect(() => {
    if (fromTokenData && usdAmount && parseFloat(usdAmount) > 0) {
      const usdValue = parseFloat(usdAmount)
      const tokenAmount = usdValue / fromTokenData.price
      
      // Validar valor mínimo
      const validation = validateMinimumAmount(tokenAmount, fromToken, fromTokenData.price)
      setIsValidAmount(validation.isValid)
      setValidationMessage(validation.message || '')
      
      // Calcular quantidade fracionada correta
      if (validation.isValid) {
        // Ajustar para precisão do token
        const precision = Math.pow(10, fromTokenData.decimals)
        const adjustedAmount = Math.floor(tokenAmount * precision) / precision
        setCalculatedAmount(adjustedAmount.toFixed(Math.min(fromTokenData.decimals, 8)))
      } else {
        // Se não válido, mostrar quantidade mínima necessária
        const minUsdValue = fromTokenData.minAmount * fromTokenData.price
        const suggestedAmount = Math.ceil(Math.max(10, minUsdValue))
        setCalculatedAmount(`Min: $${suggestedAmount}`)
      }
    } else {
      setCalculatedAmount('0')
      setIsValidAmount(false)
    }
  }, [usdAmount, fromToken, selectedNetwork, fromTokenData])

  // Handler para trocar tokens
  const swapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
  }

  // Handler para mudança de rede
  const handleNetworkChange = (network: keyof typeof SUPPORTED_TOKENS) => {
    setSelectedNetwork(network)
    const tokens = SUPPORTED_TOKENS[network]
    setFromToken(tokens[0].symbol)
    setToToken(tokens[1].symbol)
  }

  // Handler para executar trade
  const handleTrade = () => {
    if (!isValidAmount || !fromTokenData) return

    const chainType = selectedNetwork === 'solana' ? 'solana' : 
                     selectedNetwork === 'bitcoin' ? 'bitcoin' : 'ethereum'
    
    try {
      // Escolher plataforma baseada na rede
      let platform = 'uniswap'
      let targetUrl = ''
      
      if (selectedNetwork === 'solana') {
        platform = 'jupiter'
        // Link direto para Jupiter Exchange
        targetUrl = `https://jup.ag/swap/${fromToken}-${toToken}`
      } else if (selectedNetwork === 'bitcoin') {
        platform = 'runesdex'
        // Link direto para RunesDEX
        targetUrl = 'https://runesdex.com'
      } else if (selectedNetwork === 'ethereum') {
        // Link direto para Uniswap
        targetUrl = `https://app.uniswap.org/#/swap?inputCurrency=${fromToken}&outputCurrency=${toToken}&exactAmount=${calculatedAmount}`
      } else if ((selectedNetwork as string) === 'arbitrum') {
        // Link direto para Uniswap no Arbitrum
        targetUrl = `https://app.uniswap.org/#/swap?chain=arbitrum&inputCurrency=${fromToken}&outputCurrency=${toToken}&exactAmount=${calculatedAmount}`
      } else if ((selectedNetwork as string) === 'optimism') {
        // Link direto para Uniswap no Optimism
        targetUrl = `https://app.uniswap.org/#/swap?chain=optimism&inputCurrency=${fromToken}&outputCurrency=${toToken}&exactAmount=${calculatedAmount}`
      } else if ((selectedNetwork as string) === 'polygon') {
        // Link direto para Uniswap no Polygon
        targetUrl = `https://app.uniswap.org/#/swap?chain=polygon&inputCurrency=${fromToken}&outputCurrency=${toToken}&exactAmount=${calculatedAmount}`
      } else if ((selectedNetwork as string) === 'base') {
        // Link direto para Uniswap no Base
        targetUrl = `https://app.uniswap.org/#/swap?chain=base&inputCurrency=${fromToken}&outputCurrency=${toToken}&exactAmount=${calculatedAmount}`
      } else if (selectedNetwork === 'bsc') {
        // Link direto para PancakeSwap
        targetUrl = `https://pancakeswap.finance/swap?inputCurrency=${fromToken}&outputCurrency=${toToken}&exactAmount=${calculatedAmount}`
      } else if (selectedNetwork === 'avalanche') {
        // Link direto para TraderJoe
        targetUrl = `https://traderjoexyz.com/avalanche/trade?inputCurrency=${fromToken}&outputCurrency=${toToken}&exactAmount=${calculatedAmount}`
      } else {
        // Fallback genérico
        targetUrl = 'https://app.uniswap.org'
      }
      
      // Tentar gerar deep link personalizado como backup
      const deepLink = generateSwapDeeplink({
        fromToken,
        toToken,
        fromChain: chainType,
        amount: calculatedAmount,
      })

      console.log('🔗 Trading options:', {
        platform,
        directUrl: targetUrl,
        deepLink,
        network: selectedNetwork,
        tokens: { from: fromToken, to: toToken },
        amount: calculatedAmount
      })
      
      // Preferir URL direto, depois deep link, depois fallback
      let finalUrl = targetUrl
      if (!targetUrl && deepLink && deepLink !== '#' && deepLink.startsWith('http')) {
        finalUrl = deepLink
      }
      
      if (finalUrl && finalUrl.startsWith('http')) {
        console.log('✅ Opening trading URL:', finalUrl)
        window.open(finalUrl, '_blank', 'noopener,noreferrer')
      } else {
        // Fallback para página QuickTrade completa
        console.log('⚠️ Using fallback - opening QuickTrade page')
        window.open('/quicktrade', '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      console.error('❌ Error generating trade link:', error)
      // Fallback final
      console.log('⚠️ Error fallback - opening QuickTrade page')
      window.open('/quicktrade', '_blank', 'noopener,noreferrer')
    }
  }

  const estimatedOutput = fromTokenData && toTokenData ? 
    (parseFloat(calculatedAmount) * fromTokenData.price / toTokenData.price) * 0.997 : 0

  return (
    <Card className="bg-gray-900 border-gray-700">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Quick Trade</h3>
              <p className="text-xs text-gray-400">
                Taxa transparente de {(FEE_PERCENTAGE * 100).toFixed(2)}%
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('/quicktrade', '_blank')}
            className="text-gray-400 hover:text-white"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        {/* Seletor de Rede */}
        <div className="mb-4">
          <div className="flex gap-1 mb-2">
            {(Object.keys(NETWORK_LABELS) as Array<keyof typeof NETWORK_LABELS>).map((network) => (
              <Button
                key={network}
                variant={selectedNetwork === network ? "default" : "outline"}
                size="sm"
                onClick={() => handleNetworkChange(network)}
                className="flex-1 text-xs h-8"
              >
                {NETWORK_LABELS[network]}
              </Button>
            ))}
          </div>
        </div>

        {/* Interface de Trade */}
        <div className="space-y-3">
          {/* Valor USD */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Valor USD</span>
              <div className="flex gap-1">
                {['10', '50', '100'].map(amount => (
                  <Button
                    key={amount}
                    variant="ghost"
                    size="sm"
                    onClick={() => setUsdAmount(amount)}
                    className="text-xs h-6 px-2"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={usdAmount}
                onChange={(e) => setUsdAmount(e.target.value)}
                placeholder="10.00"
                className="flex-1 bg-transparent text-lg font-bold text-white outline-none"
                min="10"
                step="0.01"
              />
            </div>
            {!isValidAmount && validationMessage && (
              <p className="text-xs text-red-400 mt-1">{validationMessage}</p>
            )}
          </div>

          {/* From Token */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Você Paga</span>
              <span className="text-xs text-green-500">
                ${fromTokenData?.price.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white flex-1">
                {calculatedAmount} {fromToken}
              </span>
              <select
                value={fromToken}
                onChange={(e) => setFromToken(e.target.value)}
                className="bg-gray-700 rounded px-2 py-1 text-xs text-white border border-gray-600"
              >
                {availableTokens.map(token => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={swapTokens}
              className="rounded-full p-2 border-gray-600 hover:bg-gray-700"
            >
              <ArrowUpDown className="w-3 h-3" />
            </Button>
          </div>

          {/* To Token */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Você Recebe (est.)</span>
              <span className="text-xs text-green-500">
                ${toTokenData?.price.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-green-400 flex-1">
                ≈ {estimatedOutput.toFixed(4)} {toToken}
              </span>
              <select
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
                className="bg-gray-700 rounded px-2 py-1 text-xs text-white border border-gray-600"
              >
                {availableTokens.filter(t => t.symbol !== fromToken).map(token => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fee Info */}
          {isValidAmount && parseFloat(usdAmount) > 0 && (
            <div className="text-xs">
              <FeeInfoDisplay 
                amount={parseFloat(calculatedAmount) || 0}
                token={fromToken}
                chainType={selectedNetwork === 'solana' ? 'solana' : 
                          selectedNetwork === 'bitcoin' ? 'bitcoin' : 'ethereum'}
              />
            </div>
          )}

          {/* Execute Button */}
          <Button
            onClick={handleTrade}
            disabled={!isValidAmount || !fromTokenData}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50"
            size="sm"
          >
            {isValidAmount ? (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Executar Trade
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Valor Mínimo: $10
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}