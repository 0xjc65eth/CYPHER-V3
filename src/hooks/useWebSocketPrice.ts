import { useState, useEffect, useCallback, useRef } from 'react'
import { wsManager } from '@/lib/websocket/websocket-manager'

interface PriceData {
  symbol: string
  price: number
  change24h: number
  volume24h: number
  high24h: number
  low24h: number
  timestamp: number
}

interface UseWebSocketPriceOptions {
  symbols: string[]
  exchanges?: string[]
  autoConnect?: boolean
}

export function useWebSocketPrice({
  symbols,
  exchanges = ['binance', 'okx', 'bybit'],
  autoConnect = true
}: UseWebSocketPriceOptions) {
  const [prices, setPrices] = useState<Map<string, Map<string, PriceData>>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<Map<string, boolean>>(new Map())
  
  // Refs para evitar race conditions
  const abortControllerRef = useRef<AbortController | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    if (!autoConnect) return
    
    // Limpar estado anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    // Criar novo AbortController
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    // Set up event listeners com verificação de montagem
    const handlePrice = ({ exchange, data }: { exchange: string; data: PriceData }) => {
      if (!isMountedRef.current || signal.aborted) return
      
      setPrices(prev => {
        const newPrices = new Map(prev)
        if (!newPrices.has(data.symbol)) {
          newPrices.set(data.symbol, new Map())
        }
        newPrices.get(data.symbol)!.set(exchange, data)
        return newPrices
      })
    }

    const handleConnected = (exchange: string) => {
      if (!isMountedRef.current || signal.aborted) return
      
      setConnectionStatus(prev => {
        const newStatus = new Map(prev)
        newStatus.set(exchange, true)
        return newStatus
      })
      
      // Subscribe to symbols for this exchange
      symbols.forEach(symbol => {
        if (!signal.aborted) {
          wsManager.subscribeToSymbol(exchange, symbol)
        }
      })
    }

    const handleDisconnected = (exchange: string) => {
      if (!isMountedRef.current || signal.aborted) return
      
      setConnectionStatus(prev => {
        const newStatus = new Map(prev)
        newStatus.set(exchange, false)
        return newStatus
      })
    }

    // Add listeners
    wsManager.on('price', handlePrice)
    wsManager.on('connected', handleConnected)
    wsManager.on('disconnected', handleDisconnected)

    // Check overall connection status com debouncing
    const checkConnection = () => {
      if (!isMountedRef.current || signal.aborted) return
      
      // Usar requestAnimationFrame para otimizar performance
      requestAnimationFrame(() => {
        if (!isMountedRef.current || signal.aborted) return
        
        setConnectionStatus(currentStatus => {
          const statuses = Array.from(currentStatus.values())
          const connected = statuses.some(status => status)
          
          setIsConnected(prevConnected => {
            if (prevConnected !== connected) {
              return connected
            }
            return prevConnected
          })
          
          return currentStatus
        })
      })
    }

    // Interval com AbortController
    intervalRef.current = setInterval(() => {
      if (!signal.aborted) {
        checkConnection()
      }
    }, 2000) // Reduzido para 2 segundos para melhor performance

    return () => {
      // Marcar como desmontado
      isMountedRef.current = false
      
      // Abortar operações pendentes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Limpar interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      // Remove listeners
      wsManager.off('price', handlePrice)
      wsManager.off('connected', handleConnected)
      wsManager.off('disconnected', handleDisconnected)
      
      // Unsubscribe from symbols
      symbols.forEach(symbol => {
        exchanges.forEach(exchange => {
          try {
            wsManager.unsubscribeFromSymbol(exchange, symbol)
          } catch (error) {
          }
        })
      })
    }
  }, [symbols, exchanges, autoConnect])
  
  // Effect para limpar na desmontagem do componente
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const getPriceForSymbol = useCallback((symbol: string): Map<string, PriceData> | undefined => {
    return prices.get(symbol)
  }, [prices])

  const getBestPrice = useCallback((symbol: string, side: 'buy' | 'sell'): { exchange: string; price: number } | null => {
    const symbolPrices = prices.get(symbol)
    if (!symbolPrices || symbolPrices.size === 0) return null

    let bestExchange = ''
    let bestPrice = side === 'buy' ? Infinity : 0

    symbolPrices.forEach((data, exchange) => {
      if (side === 'buy' && data.price < bestPrice) {
        bestPrice = data.price
        bestExchange = exchange
      } else if (side === 'sell' && data.price > bestPrice) {
        bestPrice = data.price
        bestExchange = exchange
      }
    })

    return { exchange: bestExchange, price: bestPrice }
  }, [prices])

  const getSpread = useCallback((symbol: string): number => {
    const buy = getBestPrice(symbol, 'buy')
    const sell = getBestPrice(symbol, 'sell')
    
    if (!buy || !sell) return 0
    
    return ((sell.price - buy.price) / buy.price) * 100
  }, [getBestPrice])

  return {
    prices,
    isConnected,
    connectionStatus,
    getPriceForSymbol,
    getBestPrice,
    getSpread
  }
}