"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TradingLevel {
  type: 'support' | 'resistance' | 'supply' | 'demand' | 'orderblock' | 'fairvalue'
  price: number
  strength: 'weak' | 'medium' | 'strong'
  description: string
}

interface SmcTradingData {
  symbol: string
  currentPrice: number
  dailyChange: number
  levels: TradingLevel[]
}

export default function SmcTradingPanel() {
  const [activeSymbol, setActiveSymbol] = useState('BTCUSD')
  const [position, setPosition] = useState<'long' | 'short' | null>(null)
  const [entryPrice, setEntryPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [riskAmount, setRiskAmount] = useState('')
  const [positionSize, setPositionSize] = useState<number | null>(null)
  const [riskReward, setRiskReward] = useState<number | null>(null)

  // Real-time trading data from CoinMarketCap API
  const [tradingData, setTradingData] = useState<Record<string, SmcTradingData>>({
    'BTCUSD': {
      symbol: 'BTC/USD',
      currentPrice: 97200,
      dailyChange: -0.8,
      levels: [
        {
          type: 'resistance',
          price: 99800,
          strength: 'strong',
          description: 'Previous all-time high, heavy sell orders'
        },
        {
          type: 'resistance',
          price: 98500,
          strength: 'medium',
          description: 'Daily resistance level with multiple rejections'
        },
        {
          type: 'supply',
          price: 97800,
          strength: 'medium',
          description: 'Supply zone with institutional selling pressure'
        },
        {
          type: 'fairvalue',
          price: 97200,
          strength: 'strong',
          description: 'Current fair value based on order flow'
        },
        {
          type: 'demand',
          price: 96400,
          strength: 'medium',
          description: 'Demand zone with accumulation by whales'
        },
        {
          type: 'support',
          price: 95200,
          strength: 'medium',
          description: '50-day moving average support'
        },
        {
          type: 'support',
          price: 92800,
          strength: 'strong',
          description: 'Major support level with high volume node'
        },
        {
          type: 'orderblock',
          price: 91500,
          strength: 'strong',
          description: 'Bullish order block with strong buying pressure'
        }
      ]
    },
    'ORDIORDI': {
      symbol: 'ORDI/ORDI',
      currentPrice: 42.15,
      dailyChange: -2.3,
      levels: [
        {
          type: 'resistance',
          price: 48.50,
          strength: 'strong',
          description: 'Previous all-time high with multiple rejections'
        },
        {
          type: 'resistance',
          price: 45.20,
          strength: 'medium',
          description: 'Daily resistance level with selling pressure'
        },
        {
          type: 'supply',
          price: 43.80,
          strength: 'medium',
          description: 'Supply zone with institutional distribution'
        },
        {
          type: 'fairvalue',
          price: 42.15,
          strength: 'strong',
          description: 'Current fair value based on order flow'
        },
        {
          type: 'demand',
          price: 40.50,
          strength: 'medium',
          description: 'Demand zone with retail accumulation'
        },
        {
          type: 'support',
          price: 38.75,
          strength: 'medium',
          description: '20-day moving average support'
        },
        {
          type: 'support',
          price: 36.20,
          strength: 'strong',
          description: 'Major support level with high volume'
        },
        {
          type: 'orderblock',
          price: 34.80,
          strength: 'strong',
          description: 'Bullish order block from previous rally'
        }
      ]
    }
  })

  // Fetch real-time data from CoinMarketCap API
  useEffect(() => {
    const fetchRealTimeData = async () => {
      try {
        const response = await fetch('/api/coinmarketcap/?symbols=BTC,ETH&timeframe=1h')
        const data = await response.json()
        
        if (data.success && data.data.current) {
          const btcData = data.data.current.BTC
          if (btcData) {
            setTradingData(prev => ({
              ...prev,
              'BTCUSD': {
                ...prev['BTCUSD'],
                currentPrice: Math.round(btcData.price),
                dailyChange: btcData.change24h || prev['BTCUSD'].dailyChange
              }
            }))
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados CMC para SMC Trading:', error)
      }
    }

    // Fetch initial data
    fetchRealTimeData()
    
    // Update every 30 seconds
    const interval = setInterval(fetchRealTimeData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const currentData = tradingData[activeSymbol]

  const calculatePosition = () => {
    if (!entryPrice || !stopLoss || !riskAmount) {
      return
    }

    const entry = parseFloat(entryPrice)
    const stop = parseFloat(stopLoss)
    const risk = parseFloat(riskAmount)

    if (isNaN(entry) || isNaN(stop) || isNaN(risk)) {
      return
    }

    // Calculate position size based on risk
    const riskPerUnit = Math.abs(entry - stop)
    const calculatedPositionSize = risk / riskPerUnit
    setPositionSize(calculatedPositionSize)

    // Calculate risk/reward ratio if take profit is set
    if (takeProfit) {
      const tp = parseFloat(takeProfit)
      if (!isNaN(tp)) {
        const reward = Math.abs(tp - entry)
        const riskRewardRatio = reward / riskPerUnit
        setRiskReward(riskRewardRatio)
      }
    }
  }

  const handlePositionTypeChange = (type: 'long' | 'short') => {
    setPosition(type)
    
    // Set default values based on current price and position type
    const currentPrice = currentData.currentPrice
    
    if (type === 'long') {
      setEntryPrice(currentPrice.toString())
      
      // Find appropriate stop loss level (nearest strong support below entry)
      const stopLevel = currentData.levels
        .filter(level => (level.type === 'support' || level.type === 'demand' || level.type === 'orderblock') && level.price < currentPrice)
        .sort((a, b) => b.price - a.price)[0]
      
      if (stopLevel) {
        setStopLoss(stopLevel.price.toString())
      } else {
        // Default to 5% below entry if no appropriate level found
        setStopLoss((currentPrice * 0.95).toFixed(2))
      }
      
      // Find appropriate take profit level (nearest strong resistance above entry)
      const tpLevel = currentData.levels
        .filter(level => (level.type === 'resistance' || level.type === 'supply') && level.price > currentPrice)
        .sort((a, b) => a.price - b.price)[0]
      
      if (tpLevel) {
        setTakeProfit(tpLevel.price.toString())
      } else {
        // Default to 10% above entry if no appropriate level found
        setTakeProfit((currentPrice * 1.1).toFixed(2))
      }
    } else {
      setEntryPrice(currentPrice.toString())
      
      // Find appropriate stop loss level (nearest strong resistance above entry)
      const stopLevel = currentData.levels
        .filter(level => (level.type === 'resistance' || level.type === 'supply') && level.price > currentPrice)
        .sort((a, b) => a.price - b.price)[0]
      
      if (stopLevel) {
        setStopLoss(stopLevel.price.toString())
      } else {
        // Default to 5% above entry if no appropriate level found
        setStopLoss((currentPrice * 1.05).toFixed(2))
      }
      
      // Find appropriate take profit level (nearest strong support below entry)
      const tpLevel = currentData.levels
        .filter(level => (level.type === 'support' || level.type === 'demand' || level.type === 'orderblock') && level.price < currentPrice)
        .sort((a, b) => b.price - a.price)[0]
      
      if (tpLevel) {
        setTakeProfit(tpLevel.price.toString())
      } else {
        // Default to 10% below entry if no appropriate level found
        setTakeProfit((currentPrice * 0.9).toFixed(2))
      }
    }
    
    // Default risk amount
    setRiskAmount('100')
    
    // Calculate position size and risk/reward
    setTimeout(calculatePosition, 0)
  }

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-900/90 to-gray-800/90 text-white">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold">SMC Trading Panel</CardTitle>
            <CardDescription className="text-gray-200">
              Smart Money Concepts trading with proper risk management
            </CardDescription>
          </div>
          <Select value={activeSymbol} onValueChange={setActiveSymbol}>
            <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Select Symbol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTCUSD">BTC/USD</SelectItem>
              <SelectItem value="ORDIORDI">ORDI/ORDI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">{currentData.symbol}</h3>
              <div className="flex items-center">
                <span className="text-2xl font-bold mr-2">${currentData.currentPrice.toLocaleString()}</span>
                <span className={`text-sm px-2 py-0.5 rounded-full ${
                  currentData.dailyChange >= 0 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {currentData.dailyChange >= 0 ? '+' : ''}{currentData.dailyChange}%
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Button 
                  className={`flex-1 ${position === 'long' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                  onClick={() => handlePositionTypeChange('long')}
                >
                  Long Position
                </Button>
                <Button 
                  className={`flex-1 ${position === 'short' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                  onClick={() => handlePositionTypeChange('short')}
                >
                  Short Position
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entry-price">Entry Price</Label>
                  <Input 
                    id="entry-price" 
                    value={entryPrice} 
                    onChange={(e) => setEntryPrice(e.target.value)} 
                    placeholder="Entry price" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stop-loss">Stop Loss</Label>
                  <Input 
                    id="stop-loss" 
                    value={stopLoss} 
                    onChange={(e) => setStopLoss(e.target.value)} 
                    placeholder="Stop loss price"
                    className={position === 'long' ? 'border-red-200 focus:border-red-300' : position === 'short' ? 'border-green-200 focus:border-green-300' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="take-profit">Take Profit</Label>
                  <Input 
                    id="take-profit" 
                    value={takeProfit} 
                    onChange={(e) => setTakeProfit(e.target.value)} 
                    placeholder="Take profit price"
                    className={position === 'long' ? 'border-green-200 focus:border-green-300' : position === 'short' ? 'border-red-200 focus:border-red-300' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="risk-amount">Risk Amount ($)</Label>
                  <Input 
                    id="risk-amount" 
                    value={riskAmount} 
                    onChange={(e) => setRiskAmount(e.target.value)} 
                    placeholder="Amount to risk" 
                  />
                </div>
              </div>
              
              <Button 
                onClick={calculatePosition}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Calculate Position
              </Button>
              
              {positionSize !== null && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Position Size</p>
                      <p className="text-lg font-bold">{positionSize.toFixed(4)} {activeSymbol.substring(0, 3)}</p>
                    </div>
                    {riskReward !== null && (
                      <div>
                        <p className="text-sm text-gray-500">Risk/Reward Ratio</p>
                        <p className={`text-lg font-bold ${riskReward >= 2 ? 'text-green-600' : riskReward >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                          1:{riskReward.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Key SMC Levels</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {currentData.levels.map((level, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${getLevelColorClass(level.type)} ${
                    (position === 'long' && parseFloat(stopLoss) === level.price) || 
                    (position === 'short' && parseFloat(stopLoss) === level.price)
                      ? 'ring-2 ring-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${getLevelDotColor(level.type)}`}></div>
                      <span className="font-medium capitalize">{level.type}</span>
                    </div>
                    <span className="font-bold">${level.price.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{level.description}</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-500">Strength:</span>
                    <span className={`text-xs ${
                      level.strength === 'strong' 
                        ? 'text-green-600 dark:text-green-400' 
                        : level.strength === 'medium'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {level.strength.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-200 dark:border-gray-700/30">
          <h3 className="font-medium mb-2">SMC Trading Rules</h3>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Always place stop losses at valid structure levels (support/resistance, order blocks)</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Maintain minimum 1:2 risk-to-reward ratio for all trades</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Never risk more than 2% of your portfolio on a single trade</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Look for liquidity grabs and order flow imbalances before entry</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Consider using multiple take-profit levels for partial position exits</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

function getLevelColorClass(type: TradingLevel['type']): string {
  switch (type) {
    case 'resistance':
      return 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/30'
    case 'supply':
      return 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800/30'
    case 'support':
      return 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30'
    case 'demand':
      return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/30'
    case 'orderblock':
      return 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/30'
    case 'fairvalue':
      return 'bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800/30'
    default:
      return 'bg-gray-50 border-gray-200 dark:bg-gray-900/10 dark:border-gray-800/30'
  }
}

function getLevelDotColor(type: TradingLevel['type']): string {
  switch (type) {
    case 'resistance':
      return 'bg-red-500'
    case 'supply':
      return 'bg-orange-500'
    case 'support':
      return 'bg-green-500'
    case 'demand':
      return 'bg-emerald-500'
    case 'orderblock':
      return 'bg-blue-500'
    case 'fairvalue':
      return 'bg-purple-500'
    default:
      return 'bg-gray-500'
  }
}
