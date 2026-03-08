'use client'

import { useState, useCallback } from 'react'

type PlanId = 'explorer' | 'trader' | 'hacker_yields'

interface BillingState {
  loading: boolean
  error: string | null
}

async function safeParseJson(res: Response): Promise<{ error?: string; checkoutLink?: string }> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(text || `HTTP ${res.status}`)
  }
}

export function useBilling() {
  const [state, setState] = useState<BillingState>({ loading: false, error: null })

  const subscribe = useCallback(async (planId: PlanId, walletAddress?: string) => {
    setState({ loading: true, error: null })
    try {
      if (!walletAddress) {
        throw new Error('Connect your wallet first to subscribe.')
      }
      const res = await fetch('/api/billing/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, walletAddress }),
      })
      const data = await safeParseJson(res)
      if (!res.ok) throw new Error(data.error ?? 'Failed to create invoice')
      if (!data.checkoutLink) throw new Error('No checkout link returned')
      window.location.href = data.checkoutLink
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState({ loading: false, error: message })
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return { subscribe, clearError, loading: state.loading, error: state.error }
}
