/**
 * Security validations for fee system
 * Ensures data integrity and prevents malicious inputs
 */

import { FeeCalculationRequest, FeeAddresses } from '@/types/fees';

// Address validation patterns
const ADDRESS_PATTERNS = {
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  bitcoin: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
} as const;

// Network validation
const SUPPORTED_NETWORKS = [
  'ethereum',
  'arbitrum', 
  'optimism',
  'polygon',
  'base',
  'avalanche',
  'bsc',
  'bitcoin',
  'solana'
] as const;

// Token address validation
const KNOWN_TOKEN_ADDRESSES = {
  ethereum: {
    'USDC': '0xA0b86a33E6417b3e49EeFD20D0c31B2b7f07D2F1',
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  arbitrum: {
    'USDC': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    'WETH': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  },
  solana: {
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'SOL': 'So11111111111111111111111111111111111111112',
  }
} as const;

// Maximum values to prevent overflow attacks
const MAX_VALUES = {
  amount: 1e18, // Maximum amount
  percentage: 100, // Maximum percentage
  gasLimit: 10000000, // Maximum gas limit
  blockNumber: 1e10, // Reasonable block number limit
} as const;

// Minimum values to prevent dust attacks
const MIN_VALUES = {
  amount: 1e-18, // Minimum amount (1 wei equivalent)
  percentage: 0, // Minimum percentage
  gasLimit: 21000, // Minimum gas limit
} as const;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SecurityValidationOptions {
  strictMode?: boolean;
  allowTestnetAddresses?: boolean;
  maxAmountUSD?: number;
  requireKnownTokens?: boolean;
}

/**
 * Validate address format for specific network
 */
export function validateAddress(
  address: string, 
  network: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if network is supported
  if (!SUPPORTED_NETWORKS.includes(network as any)) {
    errors.push(`Unsupported network: ${network}`);
  }

  // Check address format
  const pattern = ADDRESS_PATTERNS[network as keyof typeof ADDRESS_PATTERNS];
  if (pattern && !pattern.test(address)) {
    errors.push(`Invalid ${network} address format`);
  }

  // Check for zero address
  if (network === 'ethereum' && address === '0x0000000000000000000000000000000000000000') {
    errors.push('Zero address not allowed');
  }

  // Check address length
  if (address.length < 10 || address.length > 100) {
    errors.push('Address length out of reasonable bounds');
  }

  // Warning for non-checksummed Ethereum addresses
  if (network === 'ethereum' && address !== address.toLowerCase() && address !== address.toUpperCase()) {
    const hasUppercase = /[A-F]/.test(address);
    const hasLowercase = /[a-f]/.test(address);
    if (hasUppercase && hasLowercase) {
      // This might be a checksummed address, verify it
      warnings.push('Address appears to be checksummed - verify checksum validity');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate fee calculation request
 */
export function validateFeeCalculationRequest(
  request: FeeCalculationRequest,
  options: SecurityValidationOptions = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!request.tokenIn) errors.push('tokenIn is required');
  if (!request.tokenOut) errors.push('tokenOut is required');
  if (!request.amountIn) errors.push('amountIn is required');
  if (!request.network) errors.push('network is required');

  // Validate network
  if (request.network && !SUPPORTED_NETWORKS.includes(request.network as any)) {
    errors.push(`Unsupported network: ${request.network}`);
  }

  // Validate amount
  if (request.amountIn) {
    const amount = parseFloat(request.amountIn);
    
    if (isNaN(amount)) {
      errors.push('amountIn must be a valid number');
    } else {
      if (amount < MIN_VALUES.amount) {
        errors.push(`Amount too small: minimum is ${MIN_VALUES.amount}`);
      }
      if (amount > MAX_VALUES.amount) {
        errors.push(`Amount too large: maximum is ${MAX_VALUES.amount}`);
      }
      if (amount < 0) {
        errors.push('Amount cannot be negative');
      }
    }
  }

  // Validate token addresses if provided
  if (request.tokenIn && typeof request.tokenIn === 'string') {
    const tokenInValidation = validateAddress(request.tokenIn, request.network || 'ethereum');
    if (!tokenInValidation.isValid) {
      errors.push(`Invalid tokenIn address: ${tokenInValidation.errors.join(', ')}`);
    }
  }

  if (request.tokenOut && typeof request.tokenOut === 'string') {
    const tokenOutValidation = validateAddress(request.tokenOut, request.network || 'ethereum');
    if (!tokenOutValidation.isValid) {
      errors.push(`Invalid tokenOut address: ${tokenOutValidation.errors.join(', ')}`);
    }
  }

  // Check for same token swap
  if (request.tokenIn === request.tokenOut) {
    errors.push('Cannot swap token to itself');
  }

  // Validate slippage if provided
  if (request.slippage !== undefined) {
    const slippage = parseFloat(request.slippage.toString());
    if (isNaN(slippage) || slippage < 0 || slippage > 50) {
      errors.push('Slippage must be between 0 and 50 percent');
    }
    if (slippage > 10) {
      warnings.push('High slippage tolerance detected - proceed with caution');
    }
  }

  // Validate deadline if provided
  if (request.deadline !== undefined) {
    const deadline = parseInt(request.deadline.toString());
    const now = Math.floor(Date.now() / 1000);
    if (deadline < now) {
      errors.push('Deadline cannot be in the past');
    }
    if (deadline > now + 3600) {
      warnings.push('Deadline is more than 1 hour in the future');
    }
  }

  // Strict mode validations
  if (options.strictMode) {
    // Require known tokens
    if (options.requireKnownTokens && request.network) {
      const knownTokens = KNOWN_TOKEN_ADDRESSES[request.network as keyof typeof KNOWN_TOKEN_ADDRESSES];
      if (knownTokens) {
        const knownAddresses: string[] = Object.values(knownTokens);
        if (request.tokenIn && !knownAddresses.includes(request.tokenIn)) {
          warnings.push('tokenIn is not a known token address');
        }
        if (request.tokenOut && !knownAddresses.includes(request.tokenOut)) {
          warnings.push('tokenOut is not a known token address');
        }
      }
    }

    // Check maximum USD amount
    if (options.maxAmountUSD && request.amountIn) {
      const amount = parseFloat(request.amountIn);
      if (amount > options.maxAmountUSD) {
        errors.push(`Amount exceeds maximum allowed: $${options.maxAmountUSD}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate fee addresses configuration
 */
export function validateFeeAddresses(
  addresses: FeeAddresses,
  options: SecurityValidationOptions = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate each address
  Object.entries(addresses).forEach(([network, address]) => {
    if (!address) {
      errors.push(`Missing address for network: ${network}`);
      return;
    }

    const validation = validateAddress(address, network);
    if (!validation.isValid) {
      errors.push(`Invalid address for ${network}: ${validation.errors.join(', ')}`);
    }
    warnings.push(...validation.warnings.map(w => `${network}: ${w}`));
  });

  // Check for duplicate addresses (potential configuration error)
  const addressValues = Object.values(addresses);
  const uniqueAddresses = new Set(addressValues);
  if (addressValues.length !== uniqueAddresses.size) {
    warnings.push('Duplicate addresses detected - verify configuration');
  }

  // Ensure critical networks have addresses
  const criticalNetworks = ['ethereum', 'bitcoin', 'solana'];
  criticalNetworks.forEach(network => {
    if (!addresses[network as keyof FeeAddresses]) {
      warnings.push(`Missing address for critical network: ${network}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize input values to prevent injection attacks
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potential script tags and dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .trim();
  }
  
  if (typeof input === 'number') {
    // Ensure number is finite and within reasonable bounds
    if (!isFinite(input)) return 0;
    return Math.max(MIN_VALUES.amount, Math.min(MAX_VALUES.amount, input));
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    Object.entries(input).forEach(([key, value]) => {
      sanitized[key] = sanitizeInput(value);
    });
    return sanitized;
  }
  
  return input;
}

/**
 * Rate limiting validation
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    const userRequests = this.requests.get(identifier)!;
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

/**
 * Comprehensive security validation
 */
export function performSecurityValidation(
  request: FeeCalculationRequest,
  userIP?: string,
  options: SecurityValidationOptions = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic request validation
  const requestValidation = validateFeeCalculationRequest(request, options);
  errors.push(...requestValidation.errors);
  warnings.push(...requestValidation.warnings);

  // Rate limiting (if IP provided)
  if (userIP) {
    const rateLimiter = new RateLimiter();
    if (!rateLimiter.isAllowed(userIP)) {
      errors.push('Rate limit exceeded - too many requests');
    }
  }

  // Additional security checks
  const sanitizedRequest = sanitizeInput(request);
  if (JSON.stringify(sanitizedRequest) !== JSON.stringify(request)) {
    warnings.push('Input was sanitized - potential security issue detected');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export default {
  validateAddress,
  validateFeeCalculationRequest,
  validateFeeAddresses,
  sanitizeInput,
  performSecurityValidation,
  RateLimiter
};