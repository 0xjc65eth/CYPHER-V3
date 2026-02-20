/**
 * Store entry point — re-exports from Zustand store.
 * Redux has been removed; all state management uses Zustand.
 */
export { useStore, useStore as store } from './zustand'
export type { RootState } from './zustand'
