'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { RiCloseLine, RiCheckLine, RiShieldCheckLine, RiGiftLine } from 'react-icons/ri'

interface PremiumThankYouModalProps {
  collection: string
  onClose: () => void
}

export function PremiumThankYouModal({ collection, onClose }: PremiumThankYouModalProps) {
  const [isBrowser, setIsBrowser] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Check if we're in the browser to use the portal
  useEffect(() => {
    setIsBrowser(true)
    setTimeout(() => setIsVisible(true), 100)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for exit animation
  }

  if (!isBrowser) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`bg-gradient-to-br from-[#121212] to-[#1A1A1A] border border-[#8B5CF6]/30 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl shadow-[#8B5CF6]/20 transition-all duration-300 ${
          isVisible ? 'transform scale-100 translate-y-0' : 'transform scale-95 translate-y-4'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] flex items-center justify-center mr-3">
              <RiGiftLine className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">Thank You!</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-300 transition-colors bg-[#2D2D2D] rounded-full w-8 h-8 flex items-center justify-center"
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center mb-4">
          <span className="px-3 py-1.5 bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#8B5CF6] rounded-md text-xs font-bold text-white animate-pulse">
            PREMIUM ACCESS GRANTED
          </span>
        </div>

        <div className="p-4 bg-[#1D1D1D] border border-[#8B5CF6]/20 rounded-lg mb-4">
          <p className="text-[#8B5CF6] font-medium flex items-center mb-2">
            <RiCheckLine className="mr-1 w-5 h-5" />
            Verified {collection} Holder
          </p>
          {collection === 'YIELD HACKER PASS' ? (
            <p className="text-white text-sm">
              Welcome, Yield Hacker! Your YHP NFT grants you exclusive premium access to
              CYPHER's full suite of tools including advanced analytics, AI trading signals,
              and priority access to new features.
            </p>
          ) : (
            <p className="text-white text-sm">
              Thanks for supporting Bitcoin development through your {collection} collection!
              Because you're encouraging development on BTC, new updates will be coming to this tool
              and you'll benefit completely free of charge!
            </p>
          )}
        </div>

        <div className="p-4 bg-[#1D1D1D] border border-[#8B5CF6]/20 rounded-lg mb-4">
          {collection === 'YIELD HACKER PASS' ? (
            <p className="text-white text-sm">
              <span className="font-bold text-orange-400">YHP Benefits:</span> Full premium dashboard access, CYPHER AI analytics, advanced trading tools, real-time alerts, and all future premium features — included with your Yield Hacker Pass membership.
            </p>
          ) : (
            <p className="text-white text-sm">
              <span className="font-bold text-[#8B5CF6]">Your Benefits:</span> You'll receive all future updates and premium features completely free of charge. We're constantly working on new tools and insights to enhance your Bitcoin analytics experience.
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#8B5CF6] text-white rounded-md shadow-lg hover:shadow-xl transition-all duration-300 font-medium"
          >
            <span className="flex items-center">
              <RiShieldCheckLine className="mr-2 w-5 h-5" />
              Continue to Premium Dashboard
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
