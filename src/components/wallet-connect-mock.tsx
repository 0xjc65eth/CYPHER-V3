'use client'

import { useState } from 'react'
import { RiWallet3Line, RiCloseLine, RiLoader4Line } from 'react-icons/ri'

export function WalletConnectMock() {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [address, setAddress] = useState('')
  const [showModal, setShowModal] = useState(false)

  // Função para simular conexão de carteira
  const handleConnect = async (walletType: string) => {
    try {
      setConnecting(true)
      
      // Simular atraso de conexão
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Gerar endereço aleatório
      const mockAddress = `bc1${Math.random().toString(36).substring(2, 10)}...${Math.random().toString(36).substring(2, 6)}`
      
      setAddress(mockAddress)
      setConnected(true)
      setConnecting(false)
      setShowModal(false)
      
      
      // Emitir evento de conexão
      if (typeof window !== 'undefined') {
        const walletConnectedEvent = new CustomEvent('walletConnected', {
          detail: {
            address: mockAddress,
            connected: true,
            isPremium: true
          }
        })
        window.dispatchEvent(walletConnectedEvent)
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      setConnecting(false)
    }
  }

  // Função para simular desconexão de carteira
  const handleDisconnect = () => {
    setConnected(false)
    setAddress('')
    
    // Emitir evento de desconexão
    if (typeof window !== 'undefined') {
      const walletDisconnectedEvent = new CustomEvent('walletDisconnected')
      window.dispatchEvent(walletDisconnectedEvent)
    }
  }

  return (
    <div className="relative z-50">
      {connected ? (
        <div className="flex items-center">
          <button
            onClick={handleDisconnect}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] text-white rounded-md shadow-lg hover:from-[#7C4DEF] hover:to-[#5253E8] transition-all"
          >
            <span className="truncate max-w-[150px] font-medium">{address}</span>
            <RiCloseLine className="ml-2 w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] text-white rounded-md shadow-lg hover:from-[#7C4DEF] hover:to-[#5253E8] transition-all"
            disabled={connecting}
          >
            {connecting ? (
              <>
                <RiLoader4Line className="animate-spin mr-2 w-5 h-5" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <RiWallet3Line className="mr-2 w-5 h-5" />
                <span>Connect Wallet</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Modal de seleção de carteira */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-[#121212] border border-[#3D3D3D] rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Connect Wallet</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 mt-4">
              <button
                onClick={() => handleConnect('unisat')}
                className="w-full flex items-center p-4 bg-[#2D2D2D] hover:bg-[#3D3D3D] rounded-md transition-all"
              >
                <span className="text-white font-medium">UniSat</span>
              </button>

              <button
                onClick={() => handleConnect('xverse')}
                className="w-full flex items-center p-4 bg-[#2D2D2D] hover:bg-[#3D3D3D] rounded-md transition-all"
              >
                <span className="text-white font-medium">Xverse</span>
              </button>

              <button
                onClick={() => handleConnect('magic-eden')}
                className="w-full flex items-center p-4 bg-[#2D2D2D] hover:bg-[#3D3D3D] rounded-md transition-all"
              >
                <span className="text-white font-medium">Magic Eden</span>
              </button>

              <button
                onClick={() => handleConnect('oyl')}
                className="w-full flex items-center p-4 bg-[#2D2D2D] hover:bg-[#3D3D3D] rounded-md transition-all"
              >
                <span className="text-white font-medium">OYL</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
