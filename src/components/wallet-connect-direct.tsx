'use client'

import { useState, useEffect } from 'react'
import { RiWallet3Line, RiCloseLine, RiLoader4Line } from 'react-icons/ri'

export function WalletConnectDirect() {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [address, setAddress] = useState('')
  const [showModal, setShowModal] = useState(false)

  // Verificar se a carteira UniSat esta disponivel
  const isUnisatAvailable = () => {
    return typeof window !== 'undefined' && window.unisat !== undefined
  }

  // Conectar a carteira UniSat
  const connectUnisat = async () => {
    if (!isUnisatAvailable()) {
      alert('UniSat wallet is not installed. Please install it from https://unisat.io')
      return
    }

    try {
      setConnecting(true)

      // Solicitar conexao
      const accounts = await window.unisat.requestAccounts()

      if (accounts && accounts.length > 0) {
        setAddress(accounts[0])
        setConnected(true)

        // Emitir evento de conexao
        const walletConnectedEvent = new CustomEvent('walletConnected', {
          detail: {
            address: accounts[0],
            connected: true,
            isPremium: true
          }
        })
        window.dispatchEvent(walletConnectedEvent)

      }
    } catch (error) {
      console.error('Error connecting to UniSat wallet:', error)
      alert('Failed to connect to UniSat wallet. Please try again.')
    } finally {
      setConnecting(false)
      setShowModal(false)
    }
  }

  // Desconectar da carteira
  const handleDisconnect = () => {
    setConnected(false)
    setAddress('')

    // Emitir evento de desconexao
    const walletDisconnectedEvent = new CustomEvent('walletDisconnected')
    window.dispatchEvent(walletDisconnectedEvent)

  }

  // Simular conexao para fins de demonstracao
  const simulateConnection = () => {
    setConnecting(true)

    setTimeout(() => {
      const mockAddress = `bc1${Math.random().toString(36).substring(2, 10)}...${Math.random().toString(36).substring(2, 6)}`
      setAddress(mockAddress)
      setConnected(true)
      setConnecting(false)
      setShowModal(false)

      // Emitir evento de conexao
      const walletConnectedEvent = new CustomEvent('walletConnected', {
        detail: {
          address: mockAddress,
          connected: true,
          isPremium: true
        }
      })
      window.dispatchEvent(walletConnectedEvent)

    }, 1500)
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

      {/* Modal de selecao de carteira */}
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
                onClick={isUnisatAvailable() ? connectUnisat : simulateConnection}
                className="w-full flex items-center p-4 bg-[#2D2D2D] hover:bg-[#3D3D3D] rounded-md transition-all"
              >
                <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center mr-3 border border-[#3D3D3D]">
                  <span className="text-white font-bold text-sm">U</span>
                </div>
                <span className="text-white font-medium">UniSat {isUnisatAvailable() ? '' : '(Simulated)'}</span>
              </button>

              <button
                onClick={simulateConnection}
                className="w-full flex items-center p-4 bg-[#2D2D2D] hover:bg-[#3D3D3D] rounded-md transition-all"
              >
                <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center mr-3 border border-[#3D3D3D]">
                  <span className="text-white font-bold text-sm">X</span>
                </div>
                <span className="text-white font-medium">Xverse (Simulated)</span>
              </button>

              <button
                onClick={simulateConnection}
                className="w-full flex items-center p-4 bg-[#2D2D2D] hover:bg-[#3D3D3D] rounded-md transition-all"
              >
                <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center mr-3 border border-[#3D3D3D]">
                  <span className="text-white font-bold text-sm">ME</span>
                </div>
                <span className="text-white font-medium">Magic Eden (Simulated)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
