'use client'

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { ethers } from 'ethers'

// Multi-chain wallet connection types
export interface WalletInfo {
  address: string
  chainType: 'evm' | 'solana' | 'bitcoin'
  chainId?: number
  balance?: string
  isConnected: boolean
  walletType: string
}

export interface MultiWalletState {
  evm: WalletInfo | null
  solana: WalletInfo | null
  bitcoin: WalletInfo | null
  isAnyConnected: boolean
  supportedChains: number[]
}

export class MultichainWalletManager {
  private evmProvider: any = null
  private solanaConnection: Connection
  
  constructor() {
    this.solanaConnection = new Connection(clusterApiUrl('mainnet-beta'))
  }

  // EVM Wallet Connection (MetaMask, etc.)
  async connectEVM(): Promise<WalletInfo | null> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed')
      }

      const provider = new ethers.BrowserProvider(window.ethereum as any)
      const accounts = await provider.send('eth_requestAccounts', [])
      
      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()
      const balance = await provider.getBalance(address)

      this.evmProvider = provider

      return {
        address,
        chainType: 'evm',
        chainId: Number(network.chainId),
        balance: ethers.formatEther(balance),
        isConnected: true,
        walletType: 'metamask'
      }
    } catch (error) {
      console.error('EVM wallet connection failed:', error)
      return null
    }
  }

  // Solana Wallet Connection (Phantom, etc.)
  async connectSolana(): Promise<WalletInfo | null> {
    try {
      const { solana } = window as any
      
      if (!solana || !solana.isPhantom) {
        throw new Error('Phantom wallet not found')
      }

      const response = await solana.connect()
      const publicKey = response.publicKey.toString()
      
      // Get balance
      const balance = await this.solanaConnection.getBalance(
        new PublicKey(publicKey)
      )

      return {
        address: publicKey,
        chainType: 'solana',
        balance: (balance / 1e9).toString(), // Convert lamports to SOL
        isConnected: true,
        walletType: 'phantom'
      }
    } catch (error) {
      console.error('Solana wallet connection failed:', error)
      return null
    }
  }

  // Bitcoin Wallet Connection (Unisat, Xverse, etc.)
  async connectBitcoin(): Promise<WalletInfo | null> {
    try {
      const { unisat } = window as any
      
      if (!unisat) {
        throw new Error('Unisat wallet not found')
      }

      const accounts = await unisat.requestAccounts()
      
      if (accounts.length === 0) {
        throw new Error('No Bitcoin accounts found')
      }

      const address = accounts[0]
      const balance = await unisat.getBalance()

      return {
        address,
        chainType: 'bitcoin',
        balance: (balance.confirmed / 1e8).toString(), // Convert satoshis to BTC
        isConnected: true,
        walletType: 'unisat'
      }
    } catch (error) {
      console.error('Bitcoin wallet connection failed:', error)
      return null
    }
  }

  // Switch EVM network
  async switchNetwork(chainId: number): Promise<boolean> {
    try {
      if (!this.evmProvider) {
        throw new Error('EVM wallet not connected')
      }

      await (window.ethereum as any)?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })

      return true
    } catch (error: any) {
      // Chain not added to wallet
      if (error.code === 4902) {
        return await this.addNetwork(chainId)
      }
      return false
    }
  }

  // Add network to wallet
  private async addNetwork(chainId: number): Promise<boolean> {
    const networks: Record<number, any> = {
      42161: {
        chainId: '0xa4b1',
        chainName: 'Arbitrum One',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://arb1.arbitrum.io/rpc'],
        blockExplorerUrls: ['https://arbiscan.io/'],
      },
      10: {
        chainId: '0xa',
        chainName: 'Optimism',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://mainnet.optimism.io'],
        blockExplorerUrls: ['https://optimistic.etherscan.io'],
      }
    }

    const networkConfig = networks[chainId]
    if (!networkConfig) return false

    try {
      await (window.ethereum as any)?.request({
        method: 'wallet_addEthereumChain',
        params: [networkConfig],
      })
      return true
    } catch (error) {
      return false
    }
  }

  // Disconnect all wallets
  async disconnectAll(): Promise<void> {
    try {
      // Disconnect EVM
      if (this.evmProvider) {
        this.evmProvider = null
      }

      // Disconnect Solana
      const { solana } = window as any
      if (solana && solana.isConnected) {
        await solana.disconnect()
      }

      // Bitcoin wallets typically don't have a disconnect method
      // They rely on the user manually disconnecting
    } catch (error) {
      console.error('Error disconnecting wallets:', error)
    }
  }

  // Get wallet for specific chain
  getWalletForChain(chainType: 'evm' | 'solana' | 'bitcoin'): WalletInfo | null {
    // This would be implemented with state management
    // For now, return null as placeholder
    return null
  }

  // Validate address format
  isValidAddress(address: string, chainType: 'evm' | 'solana' | 'bitcoin'): boolean {
    try {
      switch (chainType) {
        case 'evm':
          return ethers.isAddress(address)
        case 'solana':
          try {
            new PublicKey(address)
            return true
          } catch {
            return false
          }
        case 'bitcoin':
          // Basic Bitcoin address validation
          return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address)
        default:
          return false
      }
    } catch {
      return false
    }
  }

  // Get fee recipient for chain
  getFeeRecipient(chainType: 'evm' | 'solana' | 'bitcoin'): string {
    switch (chainType) {
      case 'evm':
        return '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3'
      case 'solana':
        return '4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH'
      case 'bitcoin':
        return '358ecZEHxZQJGj6fvoy7bdTSvw64WWgGFb'
      default:
        throw new Error('Unsupported chain type')
    }
  }

  // Calculate network fee
  async estimateNetworkFee(
    chainType: 'evm' | 'solana' | 'bitcoin',
    chainId?: number
  ): Promise<string> {
    try {
      switch (chainType) {
        case 'evm':
          if (!this.evmProvider) throw new Error('EVM wallet not connected')
          const gasPrice = await this.evmProvider.getGasPrice()
          const gasLimit = 21000 // Standard transfer
          const fee = gasPrice * BigInt(gasLimit)
          return ethers.formatEther(fee)
        
        case 'solana':
          // Solana fees are typically 0.000005 SOL
          return '0.000005'
        
        case 'bitcoin':
          // Bitcoin fees vary, estimate based on current network conditions
          return '0.0001' // Placeholder
        
        default:
          return '0'
      }
    } catch (error) {
      console.error('Fee estimation failed:', error)
      return '0'
    }
  }
}

// Singleton instance
export const multichainWallet = new MultichainWalletManager()

// Wallet detection utilities
export const detectAvailableWallets = () => {
  const available = {
    evm: !!window.ethereum,
    solana: !!(window as any).solana,
    bitcoin: !!(window as any).unisat || !!(window as any).xverse
  }

  return available
}

// Check if specific wallet is installed
export const isWalletInstalled = (walletType: string): boolean => {
  const walletChecks: Record<string, () => boolean> = {
    metamask: () => !!window.ethereum,
    phantom: () => !!(window as any).solana?.isPhantom,
    unisat: () => !!(window as any).unisat,
    xverse: () => !!(window as any).xverse,
    oyl: () => !!(window as any).OneKeyBitcoin
  }

  return walletChecks[walletType]?.() || false
}

// Get wallet download links
export const getWalletDownloadLink = (walletType: string): string => {
  const downloadLinks: Record<string, string> = {
    metamask: 'https://metamask.io/download/',
    phantom: 'https://phantom.app/',
    unisat: 'https://unisat.io/',
    xverse: 'https://www.xverse.app/',
    oyl: 'https://onekey.so/'
  }

  return downloadLinks[walletType] || ''
}

export default MultichainWalletManager