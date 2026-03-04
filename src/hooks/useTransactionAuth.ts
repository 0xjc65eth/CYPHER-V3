import { useState, useCallback } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useToast } from '@/components/ui/use-toast'
import type { TransactionToSign } from '@/lib/auth/transaction-validator'

interface UseTransactionAuthOptions {
  onSuccess?: (authToken: string) => void
  onError?: (error: Error) => void
}

interface TransactionAuthState {
  isLoading: boolean
  error: string | null
  pendingTransaction: TransactionToSign | null
}

export function useTransactionAuth(options?: UseTransactionAuthOptions) {
  const wallet = useWallet()
  const { toast } = useToast()
  const [state, setState] = useState<TransactionAuthState>({
    isLoading: false,
    error: null,
    pendingTransaction: null
  })

  // Create a new transaction for authorization
  const createTransaction = useCallback(async (
    type: TransactionToSign['type'],
    data: {
      to?: string
      amount?: number
      transactionData?: any
      message?: string
    }
  ): Promise<TransactionToSign | null> => {
    if (!wallet.isConnected || !wallet.address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to continue',
        variant: 'destructive'
      })
      return null
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/auth/validate-transaction/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: {
            type,
            from: wallet.address,
            ...data
          }
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to create transaction')
      }

      const transaction = result.data.transaction
      setState(prev => ({ ...prev, pendingTransaction: transaction }))

      return transaction
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create transaction'
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: 'Transaction Creation Failed',
        description: errorMessage,
        variant: 'destructive'
      })
      options?.onError?.(error as Error)
      return null
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [wallet.isConnected, wallet.address, toast, options])

  // Validate a signed transaction
  const validateTransaction = useCallback(async (
    transactionId: string,
    signature: string
  ): Promise<string | null> => {
    if (!wallet.address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to continue',
        variant: 'destructive'
      })
      return null
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/auth/validate-transaction/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          data: {
            transactionId,
            signature,
            publicKey: wallet.address,
            address: wallet.address
          }
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to validate transaction')
      }

      const authToken = result.data.authToken
      
      toast({
        title: 'Transaction Authorized',
        description: 'Your transaction has been successfully authorized',
      })

      options?.onSuccess?.(authToken)
      setState(prev => ({ ...prev, pendingTransaction: null }))

      return authToken
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate transaction'
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: 'Validation Failed',
        description: errorMessage,
        variant: 'destructive'
      })
      options?.onError?.(error as Error)
      return null
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [wallet.address, wallet.address, toast, options])

  // Check transaction status
  const checkTransactionStatus = useCallback(async (
    transactionId: string
  ): Promise<any | null> => {
    try {
      const response = await fetch('/api/auth/validate-transaction/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          data: { transactionId }
        })
      })

      const result = await response.json()
      return result.success ? result.data : null
    } catch (error) {
      console.error('Failed to check transaction status:', error)
      return null
    }
  }, [])

  // Sign and validate a transaction in one flow
  const signAndValidate = useCallback(async (
    transaction: TransactionToSign
  ): Promise<string | null> => {
    if (!wallet.signMessage) {
      toast({
        title: 'Signing Not Supported',
        description: 'Your wallet does not support message signing',
        variant: 'destructive'
      })
      return null
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Request signature from wallet
      const { humanMessage } = await getSigningMessages(transaction.id)
      const signature = await wallet.signMessage(humanMessage)

      // Validate the signature
      const authToken = await validateTransaction(transaction.id, signature)
      return authToken
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign transaction'
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: 'Signing Failed',
        description: errorMessage,
        variant: 'destructive'
      })
      return null
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [wallet.signMessage, validateTransaction, toast])

  // Helper to get signing messages
  const getSigningMessages = async (transactionId: string) => {
    const status = await checkTransactionStatus(transactionId)
    if (!status || status.status !== 'pending') {
      throw new Error('Transaction not found or expired')
    }

    // In a real implementation, this would fetch from the API
    // For now, we'll recreate the messages
    const { TransactionValidator } = await import('@/lib/auth/transaction-validator')
    const signingMessage = TransactionValidator.createSigningMessage(status.transaction)
    const humanMessage = TransactionValidator.createHumanReadableMessage(status.transaction)

    return { signingMessage, humanMessage }
  }

  // Clear any pending transaction
  const clearPendingTransaction = useCallback(() => {
    setState(prev => ({ ...prev, pendingTransaction: null, error: null }))
  }, [])

  return {
    ...state,
    createTransaction,
    validateTransaction,
    signAndValidate,
    checkTransactionStatus,
    clearPendingTransaction
  }
}