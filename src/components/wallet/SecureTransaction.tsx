'use client'

import React, { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useTransactionAuth } from '@/hooks/useTransactionAuth'
import TransactionApproval from './TransactionApproval'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  Shield, Send, FileSignature, ArrowRightLeft,
  Bitcoin, CheckCircle, AlertCircle, Loader2,
  Lock, Key, Info, Zap
} from 'lucide-react'
import { SecurityUtils } from '@/lib/auth/transaction-validator'
import type { TransactionToSign } from '@/lib/auth/transaction-validator'

export default function SecureTransaction() {
  const wallet = useWallet()
  const { toast } = useToast()
  const [showApproval, setShowApproval] = useState(false)
  const [currentTransaction, setCurrentTransaction] = useState<TransactionToSign | null>(null)
  
  // Form states
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [inscriptionData, setInscriptionData] = useState('')
  const [swapData, setSwapData] = useState({ from: 'BTC', to: 'ORDI', amount: '' })

  const {
    createTransaction,
    signAndValidate,
    isLoading,
    error
  } = useTransactionAuth({
    onSuccess: (authToken) => {
      toast({
        title: 'Transaction Authorized',
        description: 'Your transaction has been securely authorized',
      })
      // Here you would proceed with the actual transaction
    }
  })

  // Handle transfer transaction
  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter recipient address and amount',
        variant: 'destructive'
      })
      return
    }

    if (!SecurityUtils.isValidBitcoinAddress(transferTo)) {
      toast({
        title: 'Invalid Address',
        description: 'Please enter a valid Bitcoin address',
        variant: 'destructive'
      })
      return
    }

    const amountSats = Math.floor(parseFloat(transferAmount) * 100000000)
    if (amountSats <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive'
      })
      return
    }

    const transaction = await createTransaction('transfer', {
      to: transferTo,
      amount: amountSats,
      message: `Transfer ${transferAmount} BTC to ${transferTo.slice(0, 8)}...`
    })

    if (transaction) {
      setCurrentTransaction(transaction)
      setShowApproval(true)
    }
  }

  // Handle inscription transaction
  const handleInscription = async () => {
    if (!inscriptionData) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter inscription data',
        variant: 'destructive'
      })
      return
    }

    const transaction = await createTransaction('inscription', {
      transactionData: { content: inscriptionData },
      message: 'Create new inscription'
    })

    if (transaction) {
      setCurrentTransaction(transaction)
      setShowApproval(true)
    }
  }

  // Handle swap transaction
  const handleSwap = async () => {
    if (!swapData.amount) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter swap amount',
        variant: 'destructive'
      })
      return
    }

    const transaction = await createTransaction('swap', {
      transactionData: swapData,
      message: `Swap ${swapData.amount} ${swapData.from} to ${swapData.to}`
    })

    if (transaction) {
      setCurrentTransaction(transaction)
      setShowApproval(true)
    }
  }

  // Handle approval
  const handleApprove = async (signature: string) => {
    if (!currentTransaction) return

    const authToken = await signAndValidate(currentTransaction)
    if (authToken) {
      setShowApproval(false)
      setCurrentTransaction(null)
      // Reset forms
      setTransferTo('')
      setTransferAmount('')
      setInscriptionData('')
      setSwapData({ from: 'BTC', to: 'ORDI', amount: '' })
    }
  }

  if (!wallet.isConnected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Lock className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
          <p className="text-gray-400 text-center mb-4">
            Connect your wallet to access secure transactions
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            Secure Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="w-4 h-4" />
            <AlertDescription>
              All transactions require wallet signature for security. 
              Your private keys never leave your wallet.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="transfer" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transfer">Transfer</TabsTrigger>
              <TabsTrigger value="inscription">Inscription</TabsTrigger>
              <TabsTrigger value="swap">Swap</TabsTrigger>
            </TabsList>

            <TabsContent value="transfer" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transfer-to">Recipient Address</Label>
                  <Input
                    id="transfer-to"
                    placeholder="bc1q..."
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-amount">Amount (BTC)</Label>
                  <div className="relative">
                    <Bitcoin className="absolute left-3 top-3 w-4 h-4 text-orange-500" />
                    <Input
                      id="transfer-amount"
                      type="number"
                      placeholder="0.00000000"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="pl-10"
                      step="0.00000001"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleTransfer} 
                  disabled={isLoading}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Bitcoin
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="inscription" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inscription-data">Inscription Content</Label>
                  <textarea
                    id="inscription-data"
                    className="w-full min-h-[100px] px-3 py-2 bg-gray-900 rounded-md border border-gray-700 focus:border-orange-500 focus:outline-none"
                    placeholder="Enter your inscription data..."
                    value={inscriptionData}
                    onChange={(e) => setInscriptionData(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleInscription} 
                  disabled={isLoading}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSignature className="w-4 h-4" />
                  )}
                  Create Inscription
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="swap" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <select
                      className="w-full px-3 py-2 bg-gray-900 rounded-md border border-gray-700 focus:border-orange-500 focus:outline-none"
                      value={swapData.from}
                      onChange={(e) => setSwapData({ ...swapData, from: e.target.value })}
                    >
                      <option value="BTC">BTC</option>
                      <option value="ORDI">ORDI</option>
                      <option value="SATS">SATS</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <select
                      className="w-full px-3 py-2 bg-gray-900 rounded-md border border-gray-700 focus:border-orange-500 focus:outline-none"
                      value={swapData.to}
                      onChange={(e) => setSwapData({ ...swapData, to: e.target.value })}
                    >
                      <option value="ORDI">ORDI</option>
                      <option value="BTC">BTC</option>
                      <option value="SATS">SATS</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swap-amount">Amount</Label>
                  <Input
                    id="swap-amount"
                    type="number"
                    placeholder="0.00"
                    value={swapData.amount}
                    onChange={(e) => setSwapData({ ...swapData, amount: e.target.value })}
                  />
                </div>
                <Button 
                  onClick={handleSwap} 
                  disabled={isLoading}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4" />
                  )}
                  Swap Tokens
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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