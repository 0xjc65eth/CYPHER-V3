import { useEffect } from 'react'

/**
 * Hook to handle ESC key press
 * @param callback Function to call when ESC is pressed
 * @param active Whether the hook should be active (default: true)
 */
export function useEscapeKey(callback: () => void, active: boolean = true) {
  useEffect(() => {
    if (!active) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [callback, active])
}
