'use client'

import React from 'react'

// Mock do LaserEyes para quando o pacote não está disponível
export const LaserEyesProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

export const useLaserEyes = () => {
  return {
    isConnected: false,
    connected: false,
    isInitializing: false,
    connect: async () => { 
      return false; 
    },
    disconnect: async () => { 
    },
    address: '',
    publicKey: '',
    balance: 0,
    network: 'mainnet',
    library: null,
    provider: null,
    accounts: [],
    hasProvider: false,
    signMessage: async () => '',
    sendBitcoin: async () => ({ txid: '' }),
    payInvoice: async () => ({ preimage: '' }),
  }
}

export const LASEREYES_WALLET_IDS = {
  unisat: 'unisat',
  xverse: 'xverse',
  leather: 'leather',
  'magic-eden': 'magic-eden',
  okx: 'okx',
}

export const XVERSE = 'xverse'
export const UNISAT = 'unisat'
export const LEATHER = 'leather'
export const MAGIC_EDEN = 'magic-eden'
export const OKX = 'okx'

// Export tudo que o LaserEyes real exportaria
export default {
  LaserEyesProvider,
  useLaserEyes,
  LASEREYES_WALLET_IDS,
  XVERSE,
  UNISAT,
  LEATHER,
  MAGIC_EDEN,
  OKX,
}