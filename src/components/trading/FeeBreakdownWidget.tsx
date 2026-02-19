/**
 * 💰 FEE BREAKDOWN WIDGET
 * Displays comprehensive fee breakdown with 0.35% redirection fee
 * Transparent fee disclosure for trading interfaces
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  Info,
  TrendingUp,
  Calculator,
  ExternalLink,
  AlertCircle,
  DollarSign,
  Percent,
  Clock,
  Shield
} from 'lucide-react'

interface FeeBreakdownData {
  cypherRedirectionFee: {
    amount: string
    amountUSD: number
    percentage: number
    recipient: string
    description: string
  }
  protocolFees: {
    amount: string
    amountUSD: number
    percentage: number
    dex: string
    description: string
  }
  gasFees: {
    amount: string
    amountUSD: number
    gasPrice: string
    gasLimit: string
    description: string
  }
  totalFeesUSD: number
  totalFeePercentage: number
  estimatedSavings?: number
  executionTime?: number
  priceImpact?: number
}

interface FeeBreakdownWidgetProps {
  tradeAmount: number
  tokenIn: string
  tokenOut: string
  network: string
  onFeeCalculated?: (fees: FeeBreakdownData) => void
  compact?: boolean
  showComparison?: boolean
  className?: string
}

export const FeeBreakdownWidget: React.FC<FeeBreakdownWidgetProps> = ({
  tradeAmount,
  tokenIn,
  tokenOut,
  network,
  onFeeCalculated,
  compact = false,
  showComparison = true,
  className = ''
}) => {
  const [feeData, setFeeData] = useState<FeeBreakdownData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [historicalFees, setHistoricalFees] = useState<number[]>([])

  // Calculate fees when trade parameters change
  useEffect(() => {
    if (tradeAmount > 0 && tokenIn && tokenOut) {
      calculateFees()
    }
  }, [tradeAmount, tokenIn, tokenOut, network])

  const calculateFees = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/fees/calculate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenIn,
          tokenOut,
          amountIn: tradeAmount.toString(),
          network,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to calculate fees')
      }

      const data = await response.json()
      
      // Format the fee data
      const formattedFees: FeeBreakdownData = {
        cypherRedirectionFee: {
          amount: data.cypherFee.amount,
          amountUSD: data.cypherFee.amountUSD,
          percentage: 0.35, // Fixed 0.35% rate
          recipient: data.cypherFee.recipient,
          description: 'CYPHER redirection fee - supports platform development and Hyperliquid integration'
        },
        protocolFees: {
          amount: data.dexFees[0]?.amount || '0',
          amountUSD: data.dexFees[0]?.amountUSD || 0,
          percentage: data.dexFees[0]?.percentage || 0,
          dex: data.dexFees[0]?.dex || 'DEX',
          description: 'Protocol fees paid to the decentralized exchange'
        },
        gasFees: {
          amount: data.gasFees.gasCostUSD.toString(),
          amountUSD: data.gasFees.gasCostUSD,
          gasPrice: data.gasFees.gasPrice,
          gasLimit: data.gasFees.estimatedGas,
          description: 'Network gas fees for transaction execution'
        },
        totalFeesUSD: data.totalFeeUSD,
        totalFeePercentage: data.totalFeePercentage,
        estimatedSavings: Math.random() * 20, // Mock savings
        executionTime: 2500 + Math.random() * 1000, // Mock execution time
        priceImpact: Math.random() * 2 // Mock price impact
      }

      setFeeData(formattedFees)
      onFeeCalculated?.(formattedFees)
      
      // Update historical fees for comparison
      setHistoricalFees(prev => [...prev.slice(-9), formattedFees.totalFeesUSD])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate fees')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(3)}%`
  }

  const getFeeEfficiencyColor = (percentage: number) => {
    if (percentage < 0.5) return 'text-green-500'
    if (percentage < 1.0) return 'text-yellow-500'
    return 'text-red-500'
  }

  const renderCompactView = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">Total Fees</span>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">
            {formatCurrency(feeData?.totalFeesUSD || 0)}
          </div>
          <div className={`text-xs ${getFeeEfficiencyColor(feeData?.totalFeePercentage || 0)}`}>
            {formatPercentage(feeData?.totalFeePercentage || 0)}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>CYPHER Fee: {formatCurrency(feeData?.cypherRedirectionFee.amountUSD || 0)}</span>
        <Badge variant="outline" className="text-xs">
          0.35%
        </Badge>
      </div>
    </div>
  )

  const renderFullView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold">Fee Breakdown</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {network.toUpperCase()}
          </Badge>
          {feeData?.estimatedSavings && (
            <Badge variant="default" className="text-xs bg-green-600">
              Save ${feeData.estimatedSavings.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>

      {/* CYPHER Redirection Fee */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-orange-800">CYPHER Redirection Fee</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-orange-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    {feeData?.cypherRedirectionFee.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="text-right">
            <div className="font-semibold text-orange-800">
              {formatCurrency(feeData?.cypherRedirectionFee.amountUSD || 0)}
            </div>
            <div className="text-xs text-orange-600">
              {formatPercentage(feeData?.cypherRedirectionFee.percentage || 0)}
            </div>
          </div>
        </div>
        <div className="text-xs text-orange-700">
          Recipient: {feeData?.cypherRedirectionFee.recipient.slice(0, 8)}...
        </div>
      </div>

      {/* Protocol Fees */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800">Protocol Fees</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-blue-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    {feeData?.protocolFees.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="text-right">
            <div className="font-semibold text-blue-800">
              {formatCurrency(feeData?.protocolFees.amountUSD || 0)}
            </div>
            <div className="text-xs text-blue-600">
              {formatPercentage(feeData?.protocolFees.percentage || 0)}
            </div>
          </div>
        </div>
        <div className="text-xs text-blue-700">
          DEX: {feeData?.protocolFees.dex}
        </div>
      </div>

      {/* Gas Fees */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-gray-800">Gas Fees</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-gray-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    {feeData?.gasFees.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-800">
              {formatCurrency(feeData?.gasFees.amountUSD || 0)}
            </div>
            <div className="text-xs text-gray-600">
              {feeData?.gasFees.gasPrice} gwei
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-700">
          Gas Limit: {feeData?.gasFees.gasLimit}
        </div>
      </div>

      <Separator />

      {/* Total */}
      <div className="bg-gray-900 text-white rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <span className="font-semibold">Total Fees</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">
              {formatCurrency(feeData?.totalFeesUSD || 0)}
            </div>
            <div className="text-sm opacity-75">
              {formatPercentage(feeData?.totalFeePercentage || 0)} of trade
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center">
            <div className="text-sm text-gray-500">Est. Execution</div>
            <div className="font-semibold">
              {feeData?.executionTime ? `${(feeData.executionTime / 1000).toFixed(1)}s` : 'N/A'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">Price Impact</div>
            <div className="font-semibold">
              {feeData?.priceImpact ? `${feeData.priceImpact.toFixed(2)}%` : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Historical Comparison */}
      {showComparison && historicalFees.length > 1 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Fee Comparison</span>
          </div>
          <div className="text-xs text-green-700">
            Average fees (last 10 trades): {formatCurrency(
              historicalFees.reduce((a, b) => a + b, 0) / historicalFees.length
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="flex-1"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('/fees/transparency', '_blank')}
          className="flex-1"
        >
          <Shield className="h-4 w-4 mr-1" />
          Fee Policy
        </Button>
      </div>
    </div>
  )

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={calculateFees}
            className="mt-2 w-full"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!feeData) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-center text-gray-500">
            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Enter trade details to see fees</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {compact ? renderCompactView() : renderFullView()}
      </CardContent>
    </Card>
  )
}

export default FeeBreakdownWidget