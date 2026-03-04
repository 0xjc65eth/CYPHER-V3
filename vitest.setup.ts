import '@testing-library/jest-dom'
import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Mock environment variables
beforeAll(() => {
  (process.env as Record<string, string>).NODE_ENV = 'test'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:4444'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Global mocks
beforeAll(() => {
  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock HTMLCanvasElement
  HTMLCanvasElement.prototype.getContext = vi.fn()

  // Mock crypto
  Object.defineProperty(global, 'crypto', {
    value: {
      getRandomValues: vi.fn((arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256)
        }
        return arr
      }),
      randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
    },
  })

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  Object.defineProperty(global, 'localStorage', { value: localStorageMock })

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock })

  // Mock fetch
  global.fetch = vi.fn()

  // Mock WebSocket
  global.WebSocket = Object.assign(vi.fn().mockImplementation((url: string) => ({
    url,
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })), { CONNECTING: 0 as const, OPEN: 1 as const, CLOSING: 2 as const, CLOSED: 3 as const, prototype: WebSocket.prototype }) as any

  // Mock speech recognition
  // @ts-ignore
  global.webkitSpeechRecognition = vi.fn().mockImplementation(() => ({
    continuous: false,
    interimResults: false,
    lang: 'en-US',
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
  }))

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:4444',
      protocol: 'http:',
      host: 'localhost:4444',
      hostname: 'localhost',
      port: '4444',
      pathname: '/',
      search: '',
      hash: '',
      origin: 'http://localhost:4444',
      reload: vi.fn(),
      replace: vi.fn(),
      assign: vi.fn(),
    },
    writable: true,
  })

  // Mock Image constructor
  global.Image = vi.fn().mockImplementation(() => ({
    src: '',
    alt: '',
    onload: null,
    onerror: null,
  }))

  // BigInt serialization fix
  // @ts-ignore
  global.BigInt.prototype.toJSON = function () {
    return this.toString()
  }
})

// Suppress console warnings during tests
const originalWarn = console.warn
const originalError = console.error

beforeAll(() => {
  console.warn = vi.fn((message, ...args) => {
    // Suppress specific warnings
    if (
      typeof message === 'string' &&
      (message.includes('Warning: ReactDOM.render') ||
       message.includes('Warning: componentWillReceiveProps') ||
       message.includes('BigInt serialization') ||
       message.includes('act()'))
    ) {
      return
    }
    originalWarn(message, ...args)
  })

  console.error = vi.fn((message, ...args) => {
    // Suppress specific errors during tests
    if (
      typeof message === 'string' &&
      (message.includes('Warning: validateDOMNesting') ||
       message.includes('Warning: useLayoutEffect'))
    ) {
      return
    }
    originalError(message, ...args)
  })
})

afterAll(() => {
  console.warn = originalWarn
  console.error = originalError
})