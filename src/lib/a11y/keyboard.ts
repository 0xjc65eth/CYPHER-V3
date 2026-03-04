/**
 * Keyboard navigation utilities
 * WCAG 2.1 compliant keyboard interaction patterns
 */

export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  TAB: 'Tab',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const

// Check if key is activation key (Enter or Space)
export function isActivationKey(key: string): boolean {
  return key === KEYS.ENTER || key === KEYS.SPACE
}

// Check if key is arrow key
export function isArrowKey(key: string): boolean {
  return [
    KEYS.ARROW_UP,
    KEYS.ARROW_DOWN,
    KEYS.ARROW_LEFT,
    KEYS.ARROW_RIGHT,
  ].includes(key as typeof KEYS.ARROW_UP)
}

// Navigate through a list with arrow keys
export function navigateList(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  options: {
    loop?: boolean
    horizontal?: boolean
  } = {}
): number {
  const { loop = true, horizontal = false } = options
  const maxIndex = items.length - 1
  
  let newIndex = currentIndex
  
  const nextKey = horizontal ? KEYS.ARROW_RIGHT : KEYS.ARROW_DOWN
  const prevKey = horizontal ? KEYS.ARROW_LEFT : KEYS.ARROW_UP
  
  if (event.key === nextKey) {
    newIndex = currentIndex < maxIndex ? currentIndex + 1 : loop ? 0 : currentIndex
    event.preventDefault()
  } else if (event.key === prevKey) {
    newIndex = currentIndex > 0 ? currentIndex - 1 : loop ? maxIndex : currentIndex
    event.preventDefault()
  } else if (event.key === KEYS.HOME) {
    newIndex = 0
    event.preventDefault()
  } else if (event.key === KEYS.END) {
    newIndex = maxIndex
    event.preventDefault()
  }
  
  if (newIndex !== currentIndex) {
    items[newIndex]?.focus()
  }
  
  return newIndex
}

// Handle roving tabindex pattern
export class RovingTabIndex {
  private items: HTMLElement[]
  private currentIndex: number
  
  constructor(items: HTMLElement[], initialIndex: number = 0) {
    this.items = items
    this.currentIndex = initialIndex
    this.updateTabIndexes()
  }
  
  updateTabIndexes() {
    this.items.forEach((item, index) => {
      item.setAttribute('tabindex', index === this.currentIndex ? '0' : '-1')
    })
  }
  
  focus(index: number) {
    if (index >= 0 && index < this.items.length) {
      this.currentIndex = index
      this.updateTabIndexes()
      this.items[index]?.focus()
    }
  }
  
  next(loop: boolean = true) {
    const nextIndex = this.currentIndex < this.items.length - 1
      ? this.currentIndex + 1
      : loop ? 0 : this.currentIndex
    
    this.focus(nextIndex)
  }
  
  previous(loop: boolean = true) {
    const prevIndex = this.currentIndex > 0
      ? this.currentIndex - 1
      : loop ? this.items.length - 1 : this.currentIndex
    
    this.focus(prevIndex)
  }
  
  first() {
    this.focus(0)
  }
  
  last() {
    this.focus(this.items.length - 1)
  }
}
