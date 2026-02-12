/**
 * Rare Sats Service
 * Detects rare satoshis based on the Ordinal Theory
 * 
 * Rarity levels:
 * - Common: Any sat that is not the first sat of its block
 * - Uncommon: The first sat of each block
 * - Rare: The first sat of each difficulty adjustment period (2016 blocks)
 * - Epic: The first sat of each halving epoch (210,000 blocks)
 * - Legendary: The first sat of each cycle (6 halvings, 1,260,000 blocks)
 * - Mythic: The first sat of the genesis block
 */

export type RarityLevel = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'

export interface RareSat {
  satNumber: number
  blockHeight: number
  rarity: RarityLevel
  name: string
  value: number // Value in sats
  estimatedPriceUSD?: number
}

export interface UTXO {
  txid: string
  vout: number
  value: number // satoshis
  height?: number
  address: string
}

export interface ScanResult {
  totalSats: number
  totalValue: number
  rareSats: RareSat[]
  breakdown: Record<RarityLevel, number>
  topFinds: RareSat[]
}

// Constants based on Bitcoin protocol
const BLOCK_REWARD_INITIAL = 50 * 1e8 // 50 BTC in sats
const HALVING_INTERVAL = 210_000 // blocks
const DIFFICULTY_ADJUSTMENT = 2_016 // blocks
const CYCLE_LENGTH = 6 * HALVING_INTERVAL // 1,260,000 blocks

class RareSatsService {
  // Calculate which sat number a UTXO contains
  private calculateSatRange(blockHeight: number, position: number): [number, number] {
    let totalSats = 0
    let currentReward = BLOCK_REWARD_INITIAL
    
    for (let h = 0; h < blockHeight; h++) {
      // Check if halving occurred
      if (h > 0 && h % HALVING_INTERVAL === 0) {
        currentReward = Math.floor(currentReward / 2)
      }
      totalSats += currentReward
    }
    
    // Calculate current block reward
    const halvings = Math.floor(blockHeight / HALVING_INTERVAL)
    currentReward = Math.floor(BLOCK_REWARD_INITIAL / Math.pow(2, halvings))
    
    const startSat = totalSats + position
    const endSat = totalSats + currentReward - 1
    
    return [startSat, endSat]
  }
  
  // Determine rarity of a sat
  private getRarity(satNumber: number): RarityLevel {
    // Mythic: First sat ever (genesis block)
    if (satNumber === 0) {
      return 'mythic'
    }
    
    // Calculate block height for this sat
    let currentSats = 0
    let blockHeight = 0
    let currentReward = BLOCK_REWARD_INITIAL
    
    while (currentSats + currentReward <= satNumber) {
      currentSats += currentReward
      blockHeight++
      
      // Check halving
      if (blockHeight % HALVING_INTERVAL === 0) {
        currentReward = Math.floor(currentReward / 2)
      }
    }
    
    const positionInBlock = satNumber - currentSats
    
    // First sat of block
    if (positionInBlock === 0) {
      // Legendary: First sat of cycle
      if (blockHeight % CYCLE_LENGTH === 0) {
        return 'legendary'
      }
      
      // Epic: First sat of halving epoch
      if (blockHeight % HALVING_INTERVAL === 0) {
        return 'epic'
      }
      
      // Rare: First sat of difficulty adjustment
      if (blockHeight % DIFFICULTY_ADJUSTMENT === 0) {
        return 'rare'
      }
      
      // Uncommon: First sat of any block
      return 'uncommon'
    }
    
    return 'common'
  }
  
  // Generate human-readable name for sat
  private generateSatName(satNumber: number): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'
    let name = ''
    let n = satNumber
    
    while (n >= 0) {
      name = alphabet[n % 26] + name
      n = Math.floor(n / 26) - 1
      if (n < 0) break
    }
    
    return name || 'a'
  }
  
  // Estimate USD price based on rarity
  private estimatePrice(rarity: RarityLevel, btcPrice: number = 50000): number {
    const premiumMultipliers: Record<RarityLevel, number> = {
      common: 0, // No premium
      uncommon: 5, // 5x premium
      rare: 50, // 50x premium
      epic: 500, // 500x premium
      legendary: 5000, // 5000x premium
      mythic: 1000000, // 1M x premium (priceless)
    }
    
    const satValueUSD = btcPrice / 1e8
    return satValueUSD * premiumMultipliers[rarity]
  }
  
  // Scan UTXOs for rare sats
  async scanUTXOs(utxos: UTXO[], btcPrice: number = 50000): Promise<ScanResult> {
    const rareSats: RareSat[] = []
    const breakdown: Record<RarityLevel, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      mythic: 0,
    }
    
    let totalSats = 0
    let totalValue = 0
    
    for (const utxo of utxos) {
      totalSats += utxo.value
      
      // If we don't have block height, skip rarity check
      if (!utxo.height) continue
      
      // Sample the UTXO - check first few sats and last few sats
      // In production, you'd want to check ALL sats, but that's computationally expensive
      const samplesToCheck = [
        0, // First sat
        Math.floor(utxo.value / 4),
        Math.floor(utxo.value / 2),
        Math.floor(utxo.value * 3 / 4),
        utxo.value - 1, // Last sat
      ]
      
      for (const position of samplesToCheck) {
        if (position >= utxo.value) continue
        
        const [startSat] = this.calculateSatRange(utxo.height, position)
        const rarity = this.getRarity(startSat)
        
        breakdown[rarity]++
        
        // Only collect non-common sats
        if (rarity !== 'common') {
          const rareSat: RareSat = {
            satNumber: startSat,
            blockHeight: utxo.height,
            rarity,
            name: this.generateSatName(startSat),
            value: 1, // Each sat is 1 satoshi
            estimatedPriceUSD: this.estimatePrice(rarity, btcPrice),
          }
          
          rareSats.push(rareSat)
          totalValue += rareSat.estimatedPriceUSD || 0
        }
      }
    }
    
    // Sort by rarity (rarest first) and value
    const rarityOrder: Record<RarityLevel, number> = {
      mythic: 6,
      legendary: 5,
      epic: 4,
      rare: 3,
      uncommon: 2,
      common: 1,
    }
    
    rareSats.sort((a, b) => {
      const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity]
      if (rarityDiff !== 0) return rarityDiff
      return (b.estimatedPriceUSD || 0) - (a.estimatedPriceUSD || 0)
    })
    
    // Get top 10 finds
    const topFinds = rareSats.slice(0, 10)
    
    return {
      totalSats,
      totalValue,
      rareSats,
      breakdown,
      topFinds,
    }
  }
  
  // Get rarity color for UI
  getRarityColor(rarity: RarityLevel): string {
    const colors: Record<RarityLevel, string> = {
      common: '#6B7280',     // Gray
      uncommon: '#10B981',   // Green
      rare: '#3B82F6',       // Blue
      epic: '#8B5CF6',       // Purple
      legendary: '#F59E0B',  // Orange/Gold
      mythic: '#EF4444',     // Red
    }
    return colors[rarity]
  }
  
  // Get rarity emoji for UI
  getRarityEmoji(rarity: RarityLevel): string {
    const emojis: Record<RarityLevel, string> = {
      common: '⚪',
      uncommon: '🟢',
      rare: '🔵',
      epic: '🟣',
      legendary: '🟠',
      mythic: '🔴',
    }
    return emojis[rarity]
  }
  
  // Format sat number for display
  formatSatNumber(satNumber: number): string {
    return satNumber.toLocaleString()
  }
}

export const rareSatsService = new RareSatsService()
export default rareSatsService
