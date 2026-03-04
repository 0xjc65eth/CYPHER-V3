'use client'

import { useState, useEffect } from 'react'
import { InformationCircleIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { FEE_PERCENTAGE, WALLET_ADDRESSES, formatAddress, FEE_CONFIG } from '@/config/feeRecipients'
import { cypherFeeManager, NetworkType, Transaction } from '@/lib/feeManager'
import { Badge } from '@/components/ui/badge'

interface FeeInfoDisplayProps {
  amount?: number
  usdValue?: number
  token?: string
  chainType?: 'bitcoin' | 'ethereum' | 'solana' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism' | 'base' | 'avalanche'
  userAddress?: string
  onFeeCalculated?: (calculatedFee: any) => void
}

export function FeeInfoDisplay({ 
  amount = 0, 
  usdValue = 0, 
  token = 'BTC', 
  chainType = 'bitcoin',
  userAddress = '',
  onFeeCalculated
}: FeeInfoDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [calculatedFee, setCalculatedFee] = useState<any>(null)
  const [isValidTransaction, setIsValidTransaction] = useState(true)
  const [validationMessage, setValidationMessage] = useState('')
  
  // Calcular taxa usando o novo sistema
  useEffect(() => {
    if (amount > 0 && usdValue > 0) {
      const transaction: Transaction = {
        id: `temp_${Date.now()}`,
        network: chainType as NetworkType,
        amount,
        tokenSymbol: token,
        usdValue,
        userAddress,
        timestamp: new Date()
      }

      const fee = cypherFeeManager.calculateFee(transaction)
      const validation = cypherFeeManager.validateTransaction(transaction)
      
      setCalculatedFee(fee)
      setIsValidTransaction(validation.isValid)
      setValidationMessage(validation.reason || '')
      
      // Notificar componente pai
      if (onFeeCalculated) {
        onFeeCalculated(fee)
      }
    }
  }, [amount, usdValue, token, chainType, userAddress, onFeeCalculated])
  
  const feeAmount = calculatedFee ? calculatedFee.feeAmount : amount * FEE_PERCENTAGE
  const feePercentage = FEE_CONFIG.serviceFeePercentage
  
  const feeAddress = calculatedFee ? calculatedFee.recipientAddress : cypherFeeManager.getFeeRecipientAddress(chainType as NetworkType)
  
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
      {/* Header com status de validação */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Taxa Cypher</span>
          {!isValidTransaction && (
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
          )}
          {isValidTransaction && calculatedFee && (
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
          )}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <InformationCircleIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isValidTransaction ? "default" : "destructive"}>
            {feePercentage}%
          </Badge>
        </div>
      </div>
      
      {/* Validação de transação */}
      {!isValidTransaction && validationMessage && (
        <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400">
          <ExclamationTriangleIcon className="w-3 h-3 inline mr-1" />
          {validationMessage}
        </div>
      )}
      
      {/* Valores da taxa */}
      {amount > 0 && calculatedFee && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Taxa em {token}:</span>
            <span className="font-mono text-orange-400">
              {feeAmount.toFixed(8)} {token}
            </span>
          </div>
          {calculatedFee.feeAmountUSD > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Taxa em USD:</span>
              <span className="font-mono text-green-400">
                ${calculatedFee.feeAmountUSD.toFixed(4)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Rede:</span>
            <Badge variant="outline" className="text-xs">
              {chainType.toUpperCase()}
            </Badge>
          </div>
        </div>
      )}
      
      {/* Detalhes expandidos */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
          <div className="text-xs text-gray-400">
            <p className="mb-3">
              A CYPHER ORDI cobra uma taxa transparente de <strong>{feePercentage}%</strong> em todas as transações 
              para manter e melhorar a plataforma. Esta taxa é automaticamente distribuída por rede.
            </p>
            
            {/* Informações da rede */}
            <div className="space-y-2">
              <div>
                <p className="font-semibold text-gray-300 mb-1">Rede de coleta:</p>
                <Badge variant="outline" className="mb-2">
                  {chainType.charAt(0).toUpperCase() + chainType.slice(1)}
                </Badge>
              </div>
              
              <div>
                <p className="font-semibold text-gray-300 mb-1">Endereço de coleta:</p>
                <p className="font-mono text-orange-400 break-all text-xs">
                  {feeAddress}
                </p>
                <p className="text-gray-500 mt-1">
                  {formatAddress(feeAddress, chainType as any)}
                </p>
              </div>
              
              {/* Valor mínimo */}
              <div>
                <p className="font-semibold text-gray-300 mb-1">Transação mínima:</p>
                <p className="text-green-400">${FEE_CONFIG.minimumTransactionUSD}</p>
              </div>
              
              {/* Sistema de distribuição */}
              <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                <p className="font-semibold text-blue-400 mb-1">🌐 Sistema de Distribuição</p>
                <p className="text-xs text-blue-300">
                  As taxas são automaticamente distribuídas para os endereços oficiais 
                  baseado na rede utilizada. Toda coleta é rastreada e auditável.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}