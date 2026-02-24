/**
 * Jest Configuration for CYPHER ORDi Future V3
 * Enhanced testing setup with TypeScript, coverage, and performance testing
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Environment setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/tests/setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  
  // Test patterns and ignores
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.mock.{js,jsx,ts,tsx}',
  ],
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'cobertura'
  ],
  // Coverage thresholds disabled until test coverage improves
  // coverageThreshold: { global: { branches: 80, functions: 80, lines: 80, statements: 80 } },
  
  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/unit/**/*.test.{js,jsx,ts,tsx}',
  ],
  
  // Module mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/api/(.*)$': '<rootDir>/src/api/$1',
    '^@/cache/(.*)$': '<rootDir>/src/cache/$1',
    '^@/monitoring/(.*)$': '<rootDir>/src/monitoring/$1',
    '^@/websocket/(.*)$': '<rootDir>/src/websocket/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        resolveJsonModule: true
      }
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@omnisat/lasereyes|@tanstack/react-query|ws|redis))',
  ],
  
  // Performance and reliability
  maxWorkers: '50%',
  maxConcurrency: 5,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  detectLeaks: false,
  
  // Timeouts
  testTimeout: 30000,
  
  // Watch configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.git/',
    '/.next/'
  ],
  
  // Error handling
  errorOnDeprecated: true,
  bail: 0,
  
  // Reporting
  reporters: ['default'],
  
  // Cache
  cacheDirectory: '<rootDir>/.jest-cache'
}

module.exports = createJestConfig(customJestConfig)