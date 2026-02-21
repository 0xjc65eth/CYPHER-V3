'use client'

import { useState, useEffect, useCallback } from 'react'
import { JsonRpcProvider, Contract } from 'ethers'
import { YHP_CONTRACT_ADDRESS, YHP_COLLECTION_NAME } from '@/config/premium-collections'
import { isVIPEthWallet } from '@/config/vip-wallets'

// Minimal ERC721 ABI — only balanceOf
const ERC721_ABI = ['function balanceOf(address owner) view returns (uint256)']

// Public Ethereum RPC (Cloudflare)
const ETH_RPC_URL = 'https://cloudflare-eth.com'

export function useYHPVerification(address: string | null) {
  const [isHolder, setIsHolder] = useState(false)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(false)

  const verify = useCallback(async (addr: string) => {
    setLoading(true)
    try {
      // VIP ETH wallets get instant access — no contract call needed
      if (isVIPEthWallet(addr)) {
        setBalance(1)
        setIsHolder(true)
        window.dispatchEvent(new CustomEvent('walletConnected', {
          detail: {
            address: addr,
            connected: true,
            isPremium: true,
            premiumCollection: 'VIP WALLET',
          }
        }))
        return true
      }

      const provider = new JsonRpcProvider(ETH_RPC_URL)
      const contract = new Contract(YHP_CONTRACT_ADDRESS, ERC721_ABI, provider)
      const bal = await contract.balanceOf(addr)
      const balNum = Number(bal)

      setBalance(balNum)
      setIsHolder(balNum > 0)

      if (balNum > 0) {
        // Dispatch premium event so PremiumContext picks it up
        window.dispatchEvent(new CustomEvent('walletConnected', {
          detail: {
            address: addr,
            connected: true,
            isPremium: true,
            premiumCollection: YHP_COLLECTION_NAME,
          }
        }))
      }

      return balNum > 0
    } catch {
      // Silent fail — contract call may revert if address has no NFT or RPC is unavailable
      setIsHolder(false)
      setBalance(0)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-verify when address changes
  useEffect(() => {
    if (address) {
      verify(address)
    } else {
      setIsHolder(false)
      setBalance(0)
    }
  }, [address, verify])

  return { isHolder, balance, loading, verify }
}
