'use client'

import React from 'react'

// Test each import individually
let NotificationBellComponent: any = null
let UserMenuComponent: any = null
let BitcoinPriceDisplayComponent: any = null
let DashboardBitcoinWalletComponent: any = null

try {
  const notifications = require('@/components/notifications')
  NotificationBellComponent = notifications.NotificationBell
} catch (e) {
  console.error('❌ Failed to import NotificationBell:', e)
}

try {
  const auth = require('@/components/auth/UserMenu')
  UserMenuComponent = auth.UserMenu
} catch (e) {
  console.error('❌ Failed to import UserMenu:', e)
}

try {
  const bitcoin = require('@/components/bitcoin/BitcoinPriceDisplay')
  BitcoinPriceDisplayComponent = bitcoin.default
} catch (e) {
  console.error('❌ Failed to import BitcoinPriceDisplay:', e)
}

try {
  const wallet = require('@/components/wallet/DashboardBitcoinWallet')
  DashboardBitcoinWalletComponent = wallet.DashboardBitcoinWallet
} catch (e) {
  console.error('❌ Failed to import DashboardBitcoinWallet:', e)
}

export default function DashboardLayoutDebug({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-red-900 p-4 mb-4">
        <h2 className="text-xl font-bold mb-2">Debug Dashboard Layout</h2>
        <div className="space-y-1 text-sm">
          <p>NotificationBell: {NotificationBellComponent ? '✅ Loaded' : '❌ Failed'}</p>
          <p>UserMenu: {UserMenuComponent ? '✅ Loaded' : '❌ Failed'}</p>
          <p>BitcoinPriceDisplay: {BitcoinPriceDisplayComponent ? '✅ Loaded' : '❌ Failed'}</p>
          <p>DashboardBitcoinWallet: {DashboardBitcoinWalletComponent ? '✅ Loaded' : '❌ Failed'}</p>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-bold mb-4">Testing each component individually:</h3>
        
        <div className="space-y-4">
          <div className="border border-gray-700 p-4 rounded">
            <h4 className="font-bold mb-2">BitcoinPriceDisplay:</h4>
            {BitcoinPriceDisplayComponent ? (
              <BitcoinPriceDisplayComponent />
            ) : (
              <p className="text-red-400">Component not loaded</p>
            )}
          </div>
          
          <div className="border border-gray-700 p-4 rounded">
            <h4 className="font-bold mb-2">NotificationBell:</h4>
            {NotificationBellComponent ? (
              <NotificationBellComponent />
            ) : (
              <p className="text-red-400">Component not loaded</p>
            )}
          </div>
          
          <div className="border border-gray-700 p-4 rounded">
            <h4 className="font-bold mb-2">UserMenu:</h4>
            {UserMenuComponent ? (
              <UserMenuComponent />
            ) : (
              <p className="text-red-400">Component not loaded</p>
            )}
          </div>
          
          <div className="border border-gray-700 p-4 rounded">
            <h4 className="font-bold mb-2">DashboardBitcoinWallet:</h4>
            {DashboardBitcoinWalletComponent ? (
              <DashboardBitcoinWalletComponent />
            ) : (
              <p className="text-red-400">Component not loaded</p>
            )}
          </div>
        </div>
        
        <div className="mt-8 border-t border-gray-700 pt-8">
          <h3 className="text-lg font-bold mb-4">Original Content:</h3>
          {children}
        </div>
      </div>
    </div>
  )
}