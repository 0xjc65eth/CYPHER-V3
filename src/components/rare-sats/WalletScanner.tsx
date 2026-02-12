'use client'

import { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { walletService } from '@/services/WalletService'
import { rareSatsService, type ScanResult, type RareSat } from '@/services/rare-sats/RareSatsService'
import { Button } from '@/components/ui/primitives/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/primitives/Card'
import { Badge } from '@/components/ui/primitives/Badge'

export default function WalletScanner() {
  const { walletInfo } = useWallet()
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleScan = async () => {
    if (!walletInfo.connected || !walletInfo.paymentAddress) {
      setError('Please connect your wallet first')
      return
    }

    setScanning(true)
    setError(null)
    setScanResult(null)

    try {
      // Fetch UTXOs from wallet
      const utxos = await walletService.getUTXOs()
      
      if (utxos.length === 0) {
        setError('No UTXOs found in wallet')
        setScanning(false)
        return
      }

      // Fetch current BTC price (mock for now)
      const btcPrice = 50000 // TODO: Fetch real price

      // Scan for rare sats
      const result = await rareSatsService.scanUTXOs(
        utxos.map(utxo => ({
          ...utxo,
          height: 800000, // Mock block height - in production, fetch from API
        })),
        btcPrice
      )

      setScanResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  if (!walletInfo.connected) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#f59e0b]/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Connect Wallet to Scan</h3>
          <p className="text-sm text-gray-400">
            Discover rare satoshis hidden in your Bitcoin wallet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Scan Button */}
      {!scanResult && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#f59e0b] to-[#ef4444] rounded-full flex items-center justify-center animate-pulse">
              <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">Scan Your Wallet</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Discover hidden rare satoshis in your Bitcoin wallet. Find uncommon, rare, epic, legendary, and even mythic sats!
            </p>
            
            <Button 
              variant="primary" 
              size="lg"
              loading={scanning}
              onClick={handleScan}
            >
              {scanning ? 'Scanning UTXOs...' : 'Start Scan'}
            </Button>

            {error && (
              <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scan Results */}
      {scanResult && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 mb-1">Total Scanned</div>
                <div className="text-2xl font-mono font-bold text-white">
                  {rareSatsService.formatSatNumber(scanResult.totalSats)}
                </div>
                <div className="text-xs text-gray-400 mt-1">satoshis</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 mb-1">Rare Sats Found</div>
                <div className="text-2xl font-mono font-bold text-[#f59e0b]">
                  {scanResult.rareSats.length}
                </div>
                <div className="text-xs text-gray-400 mt-1">discoveries</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 mb-1">Estimated Value</div>
                <div className="text-2xl font-mono font-bold text-green-400">
                  ${scanResult.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-gray-400 mt-1">USD</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 mb-1">Rarest Find</div>
                <div className="text-2xl font-bold capitalize" style={{ color: rareSatsService.getRarityColor(scanResult.topFinds[0]?.rarity || 'common') }}>
                  {scanResult.topFinds[0]?.rarity || 'None'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {rareSatsService.getRarityEmoji(scanResult.topFinds[0]?.rarity || 'common')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rarity Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Rarity Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {(['uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const).map((rarity) => {
                  const count = scanResult.breakdown[rarity] || 0
                  if (count === 0) return null
                  
                  return (
                    <div
                      key={rarity}
                      className="p-3 bg-[#0a0a0f] border rounded"
                      style={{ borderColor: `${rareSatsService.getRarityColor(rarity)}40` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{rareSatsService.getRarityEmoji(rarity)}</span>
                        <span className="text-xs font-semibold uppercase" style={{ color: rareSatsService.getRarityColor(rarity) }}>
                          {rarity}
                        </span>
                      </div>
                      <div className="text-2xl font-mono font-bold text-white">{count}</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Finds */}
          {scanResult.topFinds.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>🏆 Top Discoveries</CardTitle>
                  <Button size="sm" variant="secondary" onClick={() => setScanResult(null)}>
                    New Scan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scanResult.topFinds.map((sat, index) => (
                    <div
                      key={sat.satNumber}
                      className="p-4 bg-[#0a0a0f] border rounded hover:border-[#f59e0b]/50 transition-colors"
                      style={{ borderColor: `${rareSatsService.getRarityColor(sat.rarity)}40` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Rank and Info */}
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-8 h-8 bg-[#1a1a2e] rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-[#f59e0b]">#{index + 1}</span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{rareSatsService.getRarityEmoji(sat.rarity)}</span>
                              <Badge 
                                variant={
                                  sat.rarity === 'mythic' ? 'danger' :
                                  sat.rarity === 'legendary' ? 'warning' :
                                  sat.rarity === 'epic' ? 'new' :
                                  sat.rarity === 'rare' ? 'info' :
                                  'success'
                                }
                              >
                                {sat.rarity.toUpperCase()}
                              </Badge>
                            </div>
                            
                            <div className="mb-1">
                              <span className="text-xs text-gray-500">Sat Number: </span>
                              <code className="text-sm font-mono text-white">
                                {rareSatsService.formatSatNumber(sat.satNumber)}
                              </code>
                            </div>
                            
                            <div className="mb-1">
                              <span className="text-xs text-gray-500">Name: </span>
                              <code className="text-sm font-mono text-white">{sat.name}</code>
                            </div>
                            
                            <div>
                              <span className="text-xs text-gray-500">Block: </span>
                              <code className="text-sm font-mono text-white">
                                {sat.blockHeight.toLocaleString()}
                              </code>
                            </div>
                          </div>
                        </div>

                        {/* Right: Value */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-mono font-bold text-green-400">
                            ${sat.estimatedPriceUSD?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-xs text-gray-500">Est. Value</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
