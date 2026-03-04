'use client'

import { useState, useEffect } from 'react'
import { useLaserEyes } from '@/providers/SimpleLaserEyesProvider'
import { RiImageLine, RiWallet3Line, RiLoader4Line } from 'react-icons/ri'

export function YourOrdinalsCard() {
  const { address, connected: isConnected, getOrdinals, connect } = useLaserEyes()
  const [ordinals, setOrdinals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrdinals = async () => {
      if (!isConnected || !address) {
        setOrdinals([])
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const userOrdinals = await getOrdinals(address)
        // Limitar a 5 ordinals para exibição
        setOrdinals(userOrdinals?.slice(0, 5) || [])
      } catch (err) {
        console.error('Error fetching ordinals:', err)
        setError('Failed to fetch your Ordinals')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrdinals()
  }, [isConnected, address, getOrdinals])

  const handleConnect = async () => {
    try {
      await connect('xverse')
    } catch (err) {
      console.error('Error connecting wallet:', err)
      setError('Failed to connect wallet')
    }
  }

  return (
    <div className="dashboard-card bg-[#0F1525] border border-[#3b82f6]/20 rounded-lg overflow-hidden">
      <div className="dashboard-card-header bg-[#111936] border-b border-[#3b82f6]/20 px-4 py-3">
        <h3 className="text-white text-sm font-medium">Your Ordinals</h3>
      </div>
      
      <div className="p-4">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-[#1a2234] rounded-full flex items-center justify-center mb-4">
              <RiImageLine className="w-8 h-8 text-[#3b82f6]" />
            </div>
            <p className="text-[#94a3b8] text-sm mb-4 text-center">
              Connect your wallet to view your Ordinals
            </p>
            <button
              onClick={handleConnect}
              className="flex items-center px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors"
            >
              <RiWallet3Line className="w-4 h-4 mr-2" />
              <span>Connect Wallet</span>
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <RiLoader4Line className="w-8 h-8 text-[#3b82f6] animate-spin mb-4" />
            <p className="text-[#94a3b8] text-sm">Loading your Ordinals...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-[#3b82f6] text-sm hover:underline"
            >
              Try again
            </button>
          </div>
        ) : ordinals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-[#94a3b8] text-sm mb-2">No Ordinals found in your wallet</p>
            <p className="text-[#64748b] text-xs text-center">
              Ordinals will appear here once you have them in your wallet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ordinals.map((ordinal, index) => (
              <div key={index} className="bg-[#1a2234] p-3 rounded-lg border border-[#3b82f6]/20">
                <div className="flex items-start">
                  {ordinal.content && ordinal.content.includes('image') ? (
                    <div className="w-12 h-12 bg-black rounded overflow-hidden mr-3 flex-shrink-0">
                      <img
                        src={`https://ordinals.com/content/${ordinal.id}`}
                        alt="Ordinal"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Ordinal'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-[#111936] rounded overflow-hidden mr-3 flex-shrink-0 flex items-center justify-center">
                      <RiImageLine className="w-6 h-6 text-[#3b82f6]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {ordinal.meta?.name || `Ordinal #${ordinal.num || index}`}
                    </p>
                    <p className="text-[#94a3b8] text-xs truncate">
                      {ordinal.id ? `${ordinal.id.substring(0, 8)}...${ordinal.id.substring(ordinal.id.length - 8)}` : 'Unknown ID'}
                    </p>
                    {ordinal.meta?.collection && (
                      <p className="text-[#3b82f6] text-xs mt-1">
                        {ordinal.meta.collection}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
