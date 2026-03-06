'use client'

import { useState, useCallback } from 'react'

type PlanId = 'pro' | 'elite'

interface BillingState {
  loading: boolean
  error: string | null
}

export function useBilling() {
  const [state, setState] = useState<BillingState>({ loading: false, error: null })

  const subscribe = useCallback(async (planId: PlanId) => {
    setState({ loading: true, error: null })
    try {
      const res = await fetch('/api/billing/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar invoice')
      window.location.href = data.checkoutLink
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setState({ loading: false, error: message })
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return { subscribe, clearError, loading: state.loading, error: state.error }
}
