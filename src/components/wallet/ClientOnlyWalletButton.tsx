'use client'

import dynamic from 'next/dynamic'

// Importa o WalletButton dinamicamente, apenas no lado do cliente
const WalletButton = dynamic(
  () => import('./WalletButton'),
  {
    ssr: false, // CRUCIAL: Desabilita SSR para este componente
    loading: () => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-orange-500/20 rounded-lg animate-pulse"></div>
        <div className="w-20 h-6 bg-orange-500/20 rounded animate-pulse"></div>
      </div>
    ),
  }
)

export function ClientOnlyWalletButton() {
  return <WalletButton />
}