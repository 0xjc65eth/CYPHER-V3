'use client'

import { useWallet } from '@/contexts/WalletContext'

export function TestSafeComponent() {
  const { isConnected, address, connect } = useWallet()

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-white font-semibold mb-2">Wallet Test</h3>
      {isConnected ? (
        <div className="text-green-400">
          Connected: {address?.slice(0, 10)}...
        </div>
      ) : (
        <button
          onClick={() => connect()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Connect
        </button>
      )}
    </div>
  )
}