// Hiro API Usage Examples

import { hiroAPI } from './index'

// Example 1: Basic Runes Operations
export async function runesExample() {
  try {
    const runes = await hiroAPI.runes.getEtchings({ limit: 10 })

    if (runes.results.length > 0) {
      const runeId = runes.results[0].rune_id
      await hiroAPI.runes.getEtching(runeId)
      await hiroAPI.runes.getHolders(runeId, { limit: 5 })
      await hiroAPI.runes.getActivity(runeId, {
        operation: 'mint',
        limit: 10
      })
    }

    await hiroAPI.runes.getTrendingRunes('24h', 5)

  } catch (error) {
    console.error('Runes example error:', error)
  }
}

// Example 2: Ordinals Operations
export async function ordinalsExample() {
  try {
    await hiroAPI.ordinals.getLatestInscriptions(10)
    await hiroAPI.ordinals.getInscriptionsByContentType('image/png', {
      limit: 10
    })
    await hiroAPI.ordinals.getRecursiveInscriptions({ limit: 5 })
    await hiroAPI.ordinals.searchInscriptions('bitcoin')

  } catch (error) {
    console.error('Ordinals example error:', error)
  }
}

// Example 3: BRC-20 Operations
export async function brc20Example() {
  try {
    await hiroAPI.brc20.getTopByHolders(10)
    await hiroAPI.brc20.getToken('ordi')
    await hiroAPI.brc20.getHolders('ordi', { limit: 10 })
    await hiroAPI.brc20.getMintProgress('ordi')
    await hiroAPI.brc20.getHolderDistribution('ordi')

  } catch (error) {
    console.error('BRC-20 example error:', error)
  }
}

// Example 4: Portfolio Management
export async function portfolioExample() {
  try {
    const address = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' // Example address

    await hiroAPI.getPortfolio(address)
    await hiroAPI.runes.getBalances(address)
    await hiroAPI.brc20.getBalances(address)
    await hiroAPI.ordinals.getInscriptionsByAddress(address)

  } catch (error) {
    console.error('Portfolio example error:', error)
  }
}

// Example 5: Real-time WebSocket
export async function websocketExample() {
  try {
    await hiroAPI.connectWebSocket()

    hiroAPI.ws.on('inscription', (_message) => {
      // no-op: handle new inscriptions
    })

    hiroAPI.ws.subscribeToRunes({
      operation: 'mint'
    })

    hiroAPI.ws.on('rune', (_message) => {
      // no-op: handle rune activity
    })

    hiroAPI.ws.subscribeToBRC20({
      ticker: 'ordi'
    })

    hiroAPI.ws.on('brc20', (_message) => {
      // no-op: handle BRC-20 activity
    })

    hiroAPI.ws.subscribeToBlocks()

    hiroAPI.ws.on('block', (_message) => {
      // no-op: handle new blocks
    })

    hiroAPI.ws.on('connected', () => {
      // no-op: connection established
    })

    hiroAPI.ws.on('disconnected', () => {
      // no-op: connection lost
    })

    hiroAPI.ws.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

  } catch (error) {
    console.error('WebSocket example error:', error)
  }
}

// Example 6: Advanced Filtering and Search
export async function advancedSearchExample() {
  try {
    await hiroAPI.search('punk', 20)
    await hiroAPI.getTrending('24h', 10)
    await hiroAPI.runes.getEtchings({
      min_supply: '1000000000',
      sort_by: 'minted',
      order: 'desc',
      limit: 10
    })
    await hiroAPI.ordinals.getInscriptionsBySatRarity('mythic', {
      limit: 10
    })
    await hiroAPI.ordinals.getCursedInscriptions({ limit: 10 })

  } catch (error) {
    console.error('Advanced search example error:', error)
  }
}

// Example 7: Cache Management
export async function cacheExample() {
  try {
    await hiroAPI.runes.getEtchings({ limit: 10 })
    await hiroAPI.ordinals.getLatestInscriptions(10)
    await hiroAPI.brc20.getTopByHolders(10)

    hiroAPI.runes.clearCache()
    hiroAPI.clearAllCaches()

  } catch (error) {
    console.error('Cache example error:', error)
  }
}

// Example 8: Error Handling
export async function errorHandlingExample() {
  try {
    await hiroAPI.runes.getEtching('non-existent-id')
  } catch (error: any) {
    if (error.error === 'NOT_FOUND') {
      // Expected: rune not found
    } else if (error.error === 'RATE_LIMITED') {
      // Rate limited: wait before retrying
    } else if (error.error === 'UNAUTHORIZED') {
      // Invalid API key
    } else {
      console.error('Unexpected error:', error)
    }
  }
}

// Example 9: Batch Operations
export async function batchOperationsExample() {
  try {
    const runeIds = ['rune1', 'rune2', 'rune3'] // Replace with actual IDs
    await hiroAPI.runes.getMultipleEtchings(runeIds)

    const inscriptionIds = ['inscription1', 'inscription2'] // Replace with actual IDs
    await hiroAPI.ordinals.getMultipleInscriptions(inscriptionIds)

    const tickers = ['ordi', 'sats', 'rats'] // Example tickers
    await hiroAPI.brc20.getMultipleTokens(tickers)

  } catch (error) {
    console.error('Batch operations example error:', error)
  }
}

// Example 10: Health Check
export async function healthCheckExample() {
  try {
    await hiroAPI.healthCheck()

  } catch (error) {
    console.error('Health check error:', error)
  }
}

// Run all examples
export async function runAllExamples() {
  await runesExample()
  await ordinalsExample()
  await brc20Example()
  await portfolioExample()
  await websocketExample()
  await advancedSearchExample()
  await cacheExample()
  await errorHandlingExample()
  await batchOperationsExample()
  await healthCheckExample()
}

// Export for testing
if (require.main === module) {
  runAllExamples().catch(console.error)
}
