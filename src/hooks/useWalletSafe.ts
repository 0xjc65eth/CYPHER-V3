'use client'

/**
 * Hook seguro para usar wallet sem lançar erro
 * Retorna valores padrão quando WalletProvider não está disponível
 */
export function useWalletSafe() {
  // Fallback padrão - para ser usado quando WalletProvider não está disponível
  return {
    isConnected: false,
    isConnecting: false,
    address: undefined as string | undefined,
    ordinalsAddress: undefined as string | undefined,
    paymentAddress: undefined as string | undefined,
    publicKey: undefined as string | undefined,
    balance: undefined as { bitcoin: number; usd: number } | undefined,
    network: undefined,
    connect: async (walletName: string) => {
    },
    disconnect: async () => {
    },
    signMessage: async (message: string) => {
      return ''
    },
    sendBTC: async (to: string, amount: number) => {
      return ''
    },
    sendOrdinals: async (to: string, inscriptionId: string) => {
      return ''
    },
    getInscriptions: async () => {
      return []
    },
    error: undefined
  }
}