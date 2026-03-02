/**
 * Typed Redux-compatible hooks for Zustand store
 * These provide Redux-like API for backward compatibility
 */
import { useStore } from './zustand'
import type { RootState } from './zustand'

/**
 * Redux-compatible useSelector hook for Zustand
 * Usage: const value = useAppSelector(state => state.some.value)
 */
export const useAppSelector = <T>(selector: (state: RootState) => T): T => {
  return useStore(selector)
}

/**
 * Redux-compatible useDispatch hook for Zustand
 * In Zustand, action creators return thunk-like functions that execute store methods
 * This dispatch function executes those thunks
 * Usage: const dispatch = useAppDispatch()
 *        dispatch(actionCreator(payload))
 */
export const useAppDispatch = () => {
  // Return a dispatch function that executes the action thunks
  return <T>(action: T): void => {
    if (typeof action === 'function') {
      // Execute the thunk function
      ;(action as () => void)()
    }
  }
}

/**
 * Type for the dispatch function
 */
export type AppDispatch = ReturnType<typeof useAppDispatch>
