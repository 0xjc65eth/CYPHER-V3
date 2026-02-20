import { createHash } from 'crypto'
import * as secp256k1 from '@noble/secp256k1'

export interface TransactionToSign {
  id: string
  type: 'transfer' | 'inscription' | 'trade' | 'swap'
  from: string
  to?: string
  amount?: number
  data?: any
  timestamp: number
  nonce: string
  message?: string
}

export interface SignedTransaction {
  transaction: TransactionToSign
  signature: string
  publicKey: string
  timestamp: number
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  transaction?: TransactionToSign
}

export class TransactionValidator {
  // Generate a unique nonce for each transaction
  static generateNonce(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  // Create a message to be signed
  static createSigningMessage(transaction: TransactionToSign): string {
    const message = {
      id: transaction.id,
      type: transaction.type,
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount,
      timestamp: transaction.timestamp,
      nonce: transaction.nonce
    }
    
    // Create a deterministic string representation
    return JSON.stringify(message, Object.keys(message).sort())
  }

  // Create a human-readable message for user confirmation
  static createHumanReadableMessage(transaction: TransactionToSign): string {
    const date = new Date(transaction.timestamp).toLocaleString()
    let message = `Cypher AI Transaction Authorization\n\n`
    message += `Transaction ID: ${transaction.id}\n`
    message += `Type: ${transaction.type.toUpperCase()}\n`
    message += `From: ${transaction.from}\n`
    
    if (transaction.to) {
      message += `To: ${transaction.to}\n`
    }
    
    if (transaction.amount !== undefined) {
      message += `Amount: ${(transaction.amount / 100000000).toFixed(8)} BTC\n`
    }
    
    message += `Date: ${date}\n`
    message += `Nonce: ${transaction.nonce}\n\n`
    message += `Sign this message to authorize the transaction.`
    
    return message
  }

  // Verify a signed transaction with ECDSA signature verification
  static async verifySignature(
    signedTransaction: SignedTransaction,
    expectedAddress: string
  ): Promise<ValidationResult> {
    try {
      // Check if the transaction hasn't expired (5 minutes)
      const now = Date.now()
      const transactionAge = now - signedTransaction.transaction.timestamp
      if (transactionAge > 5 * 60 * 1000) {
        return {
          isValid: false,
          error: 'Transaction has expired'
        }
      }

      // Verify the from address matches
      if (signedTransaction.transaction.from !== expectedAddress) {
        return {
          isValid: false,
          error: 'Transaction address mismatch'
        }
      }

      // Verify ECDSA signature using @noble/secp256k1
      const message = this.createSigningMessage(signedTransaction.transaction)
      const messageHash = createHash('sha256').update(message).digest()

      let signatureBytes: Uint8Array
      try {
        signatureBytes = Uint8Array.from(Buffer.from(signedTransaction.signature, 'hex'))
      } catch {
        return { isValid: false, error: 'Invalid signature format' }
      }

      let publicKeyBytes: Uint8Array
      try {
        publicKeyBytes = Uint8Array.from(Buffer.from(signedTransaction.publicKey, 'hex'))
      } catch {
        return { isValid: false, error: 'Invalid public key format' }
      }

      const isSignatureValid = secp256k1.verify(signatureBytes, messageHash, publicKeyBytes)
      if (!isSignatureValid) {
        return {
          isValid: false,
          error: 'Invalid signature'
        }
      }

      // Additional validation based on transaction type
      const typeValidation = this.validateTransactionType(signedTransaction.transaction)
      if (!typeValidation.isValid) {
        return typeValidation
      }

      return {
        isValid: true,
        transaction: signedTransaction.transaction
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      }
    }
  }

  // Validate specific transaction types
  private static validateTransactionType(transaction: TransactionToSign): ValidationResult {
    switch (transaction.type) {
      case 'transfer':
        if (!transaction.to || !transaction.amount) {
          return {
            isValid: false,
            error: 'Transfer transactions require recipient and amount'
          }
        }
        if (transaction.amount <= 0) {
          return {
            isValid: false,
            error: 'Transfer amount must be positive'
          }
        }
        break
        
      case 'inscription':
        if (!transaction.data) {
          return {
            isValid: false,
            error: 'Inscription transactions require data'
          }
        }
        break
        
      case 'trade':
      case 'swap':
        if (!transaction.data) {
          return {
            isValid: false,
            error: `${transaction.type} transactions require data`
          }
        }
        break
    }

    return { isValid: true }
  }

  // Create a transaction hash
  static createTransactionHash(transaction: TransactionToSign): string {
    const message = this.createSigningMessage(transaction)
    return createHash('sha256').update(message).digest('hex')
  }

  // Rate limiting check (to prevent spam)
  private static recentTransactions = new Map<string, number[]>()
  
  static checkRateLimit(address: string, limit: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const userTransactions = this.recentTransactions.get(address) || []
    
    // Remove old transactions outside the window
    const recentTx = userTransactions.filter(timestamp => now - timestamp < windowMs)
    
    if (recentTx.length >= limit) {
      return false
    }
    
    // Add new transaction timestamp
    recentTx.push(now)
    this.recentTransactions.set(address, recentTx)
    
    return true
  }
}

// Security utilities
export class SecurityUtils {
  // Generate a secure random challenge
  static generateChallenge(): string {
    const array = new Uint8Array(32)
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array)
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  // Sanitize user input
  static sanitizeInput(input: string): string {
    return input.replace(/[<>]/g, '').trim()
  }

  // Validate Bitcoin address format
  static isValidBitcoinAddress(address: string): boolean {
    // Basic validation - can be extended with proper Bitcoin address validation
    const patterns = [
      /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // Legacy
      /^bc1[a-z0-9]{39,59}$/, // Native SegWit
      /^bc1p[a-z0-9]{58}$/, // Taproot
    ]
    
    return patterns.some(pattern => pattern.test(address))
  }
}