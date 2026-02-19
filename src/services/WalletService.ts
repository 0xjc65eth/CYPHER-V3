'use client'

import { BitcoinNetworkType, AddressPurpose, request } from 'sats-connect'

// Types
export interface WalletAddress {
  address: string
  publicKey: string
  purpose: 'payment' | 'ordinals'
}

export interface WalletBalance {
  confirmed: number // satoshis
  unconfirmed: number // satoshis
  total: number // satoshis
}

export interface UTXO {
  txid: string
  vout: number
  value: number // satoshis
  scriptPubKey: string
  address: string
}

export interface Transaction {
  txid: string
  confirmations: number
  timestamp: number
  value: number // satoshis
  fee: number
  type: 'send' | 'receive'
  status: 'confirmed' | 'pending'
}

export interface WalletInfo {
  connected: boolean
  walletType: 'xverse' | 'unisat' | null
  paymentAddress: WalletAddress | null
  ordinalsAddress: WalletAddress | null
  balance: WalletBalance | null
  signature: string | null
  verified: boolean
}

export type WalletType = 'xverse' | 'unisat'

const CONNECTION_TIMEOUT_MS = 30_000

class WalletService {
  private walletInfo: WalletInfo = {
    connected: false,
    walletType: null,
    paymentAddress: null,
    ordinalsAddress: null,
    balance: null,
    signature: null,
    verified: false,
  }

  private listeners: ((info: WalletInfo) => void)[] = []

  private withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${CONNECTION_TIMEOUT_MS / 1000}s. Please try again.`)), CONNECTION_TIMEOUT_MS)
      ),
    ])
  }

  // Subscribe to wallet changes
  subscribe(callback: (info: WalletInfo) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener({ ...this.walletInfo }))
  }

  // Check if wallet is available
  async isWalletAvailable(walletType: WalletType): Promise<boolean> {
    if (typeof window === 'undefined') return false

    if (walletType === 'xverse') {
      // Check for any sats-connect compatible wallet (Xverse, Magic Eden, etc.)
      return !!(window as any).XverseProviders || !!(window as any).BitcoinProvider
    }

    if (walletType === 'unisat') {
      return !!(window as any).unisat
    }

    return false
  }

  // Connect to Xverse wallet using sats-connect v3 request() API
  async connectXverse(): Promise<WalletInfo> {
    try {
      const response = await this.withTimeout(
        request('getAddresses', {
          purposes: [AddressPurpose.Payment, AddressPurpose.Ordinals],
          message: 'Connect to CYPHER V3',
        }),
        'Xverse wallet connection'
      )

      if (response.status === 'error') {
        throw new Error(response.error?.message || 'Xverse connection failed')
      }

      const addresses = response.result.addresses
      const paymentAddr = addresses.find((addr: any) => addr.purpose === AddressPurpose.Payment)
      const ordinalsAddr = addresses.find((addr: any) => addr.purpose === AddressPurpose.Ordinals)

      this.walletInfo = {
        connected: true,
        walletType: 'xverse',
        paymentAddress: paymentAddr ? {
          address: paymentAddr.address,
          publicKey: paymentAddr.publicKey,
          purpose: 'payment'
        } : null,
        ordinalsAddress: ordinalsAddr ? {
          address: ordinalsAddr.address,
          publicKey: ordinalsAddr.publicKey,
          purpose: 'ordinals'
        } : null,
        balance: null,
        signature: null,
        verified: false,
      }

      this.notify()

      // Fetch balance after connection
      if (this.walletInfo.paymentAddress) {
        await this.updateBalance()
      }

      // Auto-verify ownership via signMessage
      await this.verifyOwnership()

      return this.walletInfo
    } catch (error: any) {
      // User cancelled via wallet UI
      if (error?.code === 4001 || error?.message?.includes('cancel')) {
        throw new Error('User cancelled wallet connection')
      }
      console.error('Failed to connect Xverse wallet:', error)
      throw error
    }
  }

  // Connect to UniSat wallet
  async connectUnisat(): Promise<WalletInfo> {
    try {
      if (typeof window === 'undefined' || !(window as any).unisat) {
        throw new Error('UniSat wallet not found')
      }

      const unisat = (window as any).unisat

      // Request connection
      const accounts = await this.withTimeout(unisat.requestAccounts(), 'UniSat wallet connection')
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const address = accounts[0]
      const publicKey = await unisat.getPublicKey()

      this.walletInfo = {
        connected: true,
        walletType: 'unisat',
        paymentAddress: {
          address,
          publicKey,
          purpose: 'payment'
        },
        ordinalsAddress: {
          address,
          publicKey,
          purpose: 'ordinals'
        },
        balance: null,
        signature: null,
        verified: false,
      }

      this.notify()

      // Fetch balance after connection
      await this.updateBalance()

      // Auto-verify ownership via signMessage
      await this.verifyOwnership()

      return this.walletInfo
    } catch (error) {
      console.error('Failed to connect UniSat wallet:', error)
      throw error
    }
  }

  // Connect to wallet (auto-detect or specific type)
  async connect(walletType?: WalletType): Promise<WalletInfo> {
    if (!walletType) {
      // Try Xverse first, then UniSat
      const xverseAvailable = await this.isWalletAvailable('xverse')
      if (xverseAvailable) {
        return this.connectXverse()
      }

      const unisatAvailable = await this.isWalletAvailable('unisat')
      if (unisatAvailable) {
        return this.connectUnisat()
      }

      throw new Error('No Bitcoin wallet found. Please install Xverse or UniSat.')
    }

    if (walletType === 'xverse') {
      return this.connectXverse()
    }

    if (walletType === 'unisat') {
      return this.connectUnisat()
    }

    throw new Error('Invalid wallet type')
  }

  // Sign a message with the connected wallet
  async signMessage(message: string): Promise<string> {
    if (!this.walletInfo.connected || !this.walletInfo.paymentAddress) {
      throw new Error('Wallet not connected')
    }

    if (this.walletInfo.walletType === 'xverse') {
      const response = await request('signMessage', {
        address: this.walletInfo.paymentAddress.address,
        message,
      })

      if (response.status === 'success') {
        return (response.result as any).signature as string
      }
      throw new Error('Xverse signMessage failed')
    }

    if (this.walletInfo.walletType === 'unisat') {
      const unisat = (window as any).unisat
      return await unisat.signMessage(message)
    }

    throw new Error('Wallet type not supported for message signing')
  }

  // Auto-verify ownership after connection
  private async verifyOwnership(): Promise<void> {
    if (!this.walletInfo.paymentAddress) return

    const message = `CYPHER V3 Ownership Verification\nAddress: ${this.walletInfo.paymentAddress.address}\nTimestamp: ${new Date().toISOString()}`

    try {
      const signature = await this.signMessage(message)
      this.walletInfo.signature = signature
      this.walletInfo.verified = true
      this.notify()
    } catch (err) {
      // User rejected signing — keep connected but unverified
      this.walletInfo.signature = null
      this.walletInfo.verified = false
      this.notify()
    }
  }

  // Disconnect wallet
  disconnect() {
    this.walletInfo = {
      connected: false,
      walletType: null,
      paymentAddress: null,
      ordinalsAddress: null,
      balance: null,
      signature: null,
      verified: false,
    }
    this.notify()
  }

  // Get wallet info
  getWalletInfo(): WalletInfo {
    return { ...this.walletInfo }
  }

  // Update balance from blockchain
  async updateBalance(): Promise<WalletBalance | null> {
    if (!this.walletInfo.connected || !this.walletInfo.paymentAddress) {
      return null
    }

    try {
      const address = this.walletInfo.paymentAddress.address

      // Fetch balance from Mempool API
      const response = await fetch(`https://mempool.space/api/address/${address}`)
      if (!response.ok) {
        throw new Error('Failed to fetch balance')
      }

      const data = await response.json()
      const balance: WalletBalance = {
        confirmed: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
        unconfirmed: data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum,
        total: (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) +
               (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum)
      }

      this.walletInfo.balance = balance
      this.notify()

      return balance
    } catch (error) {
      console.error('Failed to update balance:', error)
      return null
    }
  }

  // Get UTXOs for address
  async getUTXOs(address?: string): Promise<UTXO[]> {
    const targetAddress = address || this.walletInfo.paymentAddress?.address

    if (!targetAddress) {
      throw new Error('No address available')
    }

    try {
      const response = await fetch(`https://mempool.space/api/address/${targetAddress}/utxo`)
      if (!response.ok) {
        throw new Error('Failed to fetch UTXOs')
      }

      const utxos = await response.json()
      return utxos.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
        scriptPubKey: utxo.scriptpubkey,
        address: targetAddress
      }))
    } catch (error) {
      console.error('Failed to fetch UTXOs:', error)
      return []
    }
  }

  // Get transaction history
  async getTransactionHistory(address?: string, limit: number = 25): Promise<Transaction[]> {
    const targetAddress = address || this.walletInfo.paymentAddress?.address

    if (!targetAddress) {
      throw new Error('No address available')
    }

    try {
      const response = await fetch(`https://mempool.space/api/address/${targetAddress}/txs`)
      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const txs = await response.json()

      return txs.slice(0, limit).map((tx: any) => {
        // Determine if it's a send or receive
        const isReceive = tx.vout.some((vout: any) =>
          vout.scriptpubkey_address === targetAddress
        )
        const isSend = tx.vin.some((vin: any) =>
          vin.prevout?.scriptpubkey_address === targetAddress
        )

        let value = 0
        if (isReceive && !isSend) {
          // Pure receive
          value = tx.vout
            .filter((vout: any) => vout.scriptpubkey_address === targetAddress)
            .reduce((sum: number, vout: any) => sum + vout.value, 0)
        } else if (isSend) {
          // Send or self-transfer
          const inputSum = tx.vin
            .filter((vin: any) => vin.prevout?.scriptpubkey_address === targetAddress)
            .reduce((sum: number, vin: any) => sum + (vin.prevout?.value || 0), 0)
          const outputSum = tx.vout
            .filter((vout: any) => vout.scriptpubkey_address === targetAddress)
            .reduce((sum: number, vout: any) => sum + vout.value, 0)
          value = outputSum - inputSum
        }

        return {
          txid: tx.txid,
          confirmations: tx.status.confirmed ? tx.status.block_height : 0,
          timestamp: tx.status.block_time || Date.now() / 1000,
          value: Math.abs(value),
          fee: tx.fee,
          type: value >= 0 ? 'receive' : 'send',
          status: tx.status.confirmed ? 'confirmed' : 'pending'
        }
      })
    } catch (error) {
      console.error('Failed to fetch transaction history:', error)
      return []
    }
  }

  // Sign PSBT (Partially Signed Bitcoin Transaction)
  async signPSBT(psbtBase64: string, signInputs: number[]): Promise<string> {
    if (!this.walletInfo.connected) {
      throw new Error('Wallet not connected')
    }

    if (this.walletInfo.walletType === 'xverse') {
      const response = await request('signPsbt', {
        psbt: psbtBase64,
        broadcast: false,
        signInputs: {
          [this.walletInfo.paymentAddress!.address]: signInputs,
        },
      } as any)

      if (response.status === 'success') {
        return (response.result as any).psbt
      }
      throw new Error('User cancelled signing')
    }

    if (this.walletInfo.walletType === 'unisat') {
      const unisat = (window as any).unisat
      const signedPsbt = await unisat.signPsbt(psbtBase64)
      return signedPsbt
    }

    throw new Error('Wallet type not supported for signing')
  }

  // Broadcast transaction
  async broadcastTransaction(txHex: string): Promise<string> {
    try {
      const response = await fetch('https://mempool.space/api/tx', {
        method: 'POST',
        body: txHex
      })

      if (!response.ok) {
        throw new Error('Failed to broadcast transaction')
      }

      const txid = await response.text()
      return txid
    } catch (error) {
      console.error('Failed to broadcast transaction:', error)
      throw error
    }
  }

  // Send Bitcoin
  async sendBitcoin(toAddress: string, amountSats: number): Promise<string> {
    if (!this.walletInfo.connected) {
      throw new Error('Wallet not connected')
    }

    if (this.walletInfo.walletType === 'unisat') {
      const unisat = (window as any).unisat
      const txid = await unisat.sendBitcoin(toAddress, amountSats)
      return txid
    }

    // For Xverse, we need to build PSBT manually
    // This is a simplified version - production should use a proper Bitcoin library
    throw new Error('Send Bitcoin for Xverse not yet implemented. Use PSBT builder.')
  }
}

// Export singleton instance
export const walletService = new WalletService()
export default walletService
