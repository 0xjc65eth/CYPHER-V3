/**
 * Test Setup for CYPHER ORDi Future V3
 * Global test configuration and mocks
 */

// jest-extended removed (not in devDependencies)

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.ADMIN_JWT_SECRET = 'test_admin_jwt_secret';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Mock global fetch
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${Date.now()}-${Math.random()}`,
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  }
});

// Mock performance for Node.js environment
Object.defineProperty(global, 'performance', {
  value: {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => [])
  }
});

// Custom matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
      pass
    };
  },
  
  toBeValidTimestamp(received: number) {
    const pass = typeof received === 'number' && 
                  received > 0 && 
                  received <= Date.now() + 1000; // Allow 1 second future
    
    return {
      message: () =>
        pass
          ? `Expected ${received} not to be a valid timestamp`
          : `Expected ${received} to be a valid timestamp`,
      pass
    };
  },
  
  toHaveValidMetricStructure(received: any) {
    const hasRequiredFields = received &&
                              typeof received === 'object' &&
                              typeof received.timestamp === 'number' &&
                              typeof received.value !== 'undefined';
    
    return {
      message: () =>
        hasRequiredFields
          ? `Expected metric to not have valid structure`
          : `Expected metric to have valid structure with timestamp and value`,
      pass: hasRequiredFields
    };
  }
});

// Global test timeout
jest.setTimeout(30000);

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};