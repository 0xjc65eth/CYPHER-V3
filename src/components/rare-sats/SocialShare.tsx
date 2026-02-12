'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/primitives/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/primitives/Card'
import type { ScanResult } from '@/services/rare-sats/RareSatsService'
import { rareSatsService } from '@/services/rare-sats/RareSatsService'

interface SocialShareProps {
  scanResult: ScanResult
  walletAddress: string
}

export default function SocialShare({ scanResult, walletAddress }: SocialShareProps) {
  const [copied, setCopied] = useState(false)

  const generateTweet = () => {
    const { topFinds, rareSats, totalValue } = scanResult
    const rarest = topFinds[0]
    
    let tweet = `🔍 Just scanned my #Bitcoin wallet with @CYPHER_ORDI!\n\n`
    
    if (rarest) {
      tweet += `🎯 Found a ${rareSatsService.getRarityEmoji(rarest.rarity)} ${rarest.rarity.toUpperCase()} sat!\n`
      tweet += `📊 Sat #${rareSatsService.formatSatNumber(rarest.satNumber)}\n`
      tweet += `💎 Est. Value: $${rarest.estimatedPriceUSD?.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n\n`
    }
    
    tweet += `📈 Total rare sats: ${rareSats.length}\n`
    tweet += `💰 Portfolio value: $${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n\n`
    tweet += `Scan your wallet: cypher-ordi.com/rare-sats\n#Ordinals #RareSats #BitcoinNFTs`
    
    return tweet
  }

  const shareToTwitter = () => {
    const tweet = generateTweet()
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`
    window.open(twitterUrl, '_blank', 'width=550,height=420')
  }

  const copyToClipboard = () => {
    const tweet = generateTweet()
    navigator.clipboard.writeText(tweet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateImage = () => {
    // TODO: Generate shareable image with HTML Canvas
    alert('Image generation coming soon!')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📱 Share Your Discoveries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Preview */}
          <div className="p-4 bg-[#0a0a0f] border border-[#2a2a3e] rounded">
            <div className="text-xs text-gray-500 mb-2">Preview:</div>
            <pre className="text-xs text-white whitespace-pre-wrap font-mono">
              {generateTweet()}
            </pre>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="primary"
              onClick={shareToTwitter}
              fullWidth
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share on 𝕏
            </Button>

            <Button
              variant="secondary"
              onClick={copyToClipboard}
              fullWidth
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                  Copy Text
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={generateImage}
              fullWidth
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              Generate Image
            </Button>
          </div>

          {/* Tips */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              <div className="text-xs text-blue-400">
                <strong>Tip:</strong> Sharing your discoveries can help grow the Rare Sats community and potentially increase the value of your finds!
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
