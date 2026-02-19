'use client'

import React, { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useTransactionAuth } from '@/hooks/useTransactionAuth'
import TransactionApproval from '@/components/wallet/TransactionApproval'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { 
  Shield, Lock, Zap, CheckCircle, 
  AlertCircle, ArrowRight, Bitcoin 
} from 'lucide-react'
import type { TransactionToSign } from '@/lib/auth/transaction-validator'

export default function SecureTransactionWidget() {
  const wallet = useWallet()
  const { toast } = useToast()
  const [showApproval, setShowApproval] = useState(false)
  const [currentTransaction, setCurrentTransaction] = useState<TransactionToSign | null>(null)
  
  const {
    createTransaction,
    signAndValidate,
    isLoading
  } = useTransactionAuth({
    onSuccess: (authToken) => {
      // Here you would execute the actual transaction
    }
  })

  const handleQuickAction = async (action: string) => {
    if (!wallet.isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Connect your wallet to perform secure transactions',
        variant: 'destructive'
      })
      return
    }

    let transaction: TransactionToSign | null = null

    switch (action) {
      case 'claim-rewards':
        transaction = await createTransaction('transfer', {
          to: wallet.address, // Self-transfer for demo
          amount: 1000000, // 0.01 BTC
          message: 'Claim trading rewards'
        })
        break
        
      case 'approve-trade':
        transaction = await createTransaction('trade', {
          transactionData: {
            pair: 'BTC/ORDI',
            type: 'limit',
            side: 'buy',
            amount: 0.1,
            price: 27.5
          },
          message: 'Approve limit order'
        })
        break
    }

    if (transaction) {
      setCurrentTransaction(transaction)
      setShowApproval(true)
    }
  }

  const handleApprove = async (signature: string) => {
    if (!currentTransaction) return

    const authToken = await signAndValidate(currentTransaction)
    if (authToken) {
      setShowApproval(false)
      setCurrentTransaction(null)
      toast({
        title: 'Transaction Approved',
        description: 'Your transaction has been authorized and is being processed',
      })
    }
  }

  return (
    <>
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-bl-full" />
        
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Secure Actions
            </CardTitle>
            <Badge variant="outline" className="gap-1">
              <Lock className="w-3 h-3" />
              Protected
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {wallet.isConnected ? (
            <>
              <Alert>
                <Zap className="w-4 h-4" />
                <AlertDescription>
                  All actions require wallet signature for maximum security
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleQuickAction('claim-rewards')}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2">
                    <Bitcoin className="w-4 h-4 text-orange-500" />
                    <span>Claim Rewards</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle className="w-3 h-3" />
                    0.01 BTC
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleQuickAction('approve-trade')}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-green-500" />
                    <span>Approve Trade</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle className="w-3 h-3" />
                    Requires Auth
                  </div>
                </Button>
              </div>

              <div className="pt-2 border-t border-gray-800">
                <p className="text-xs text-gray-400 text-center">
                  Your private keys never leave your wallet
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                Connect wallet to access secure actions
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Approval Dialog */}
      <TransactionApproval
        transaction={currentTransaction}
        isOpen={showApproval}
        onClose={() => setShowApproval(false)}
        onApprove={handleApprove}
        onReject={() => {
          setShowApproval(false)
          setCurrentTransaction(null)
        }}
      />
    </>
  )
}