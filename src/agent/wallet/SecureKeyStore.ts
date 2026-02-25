/**
 * CYPHER AI Trading Agent - Secure Key Store
 * Encrypts private keys at rest using AES-256-GCM
 * Keys are never exposed in logs or API responses
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export interface EncryptedKey {
  encrypted: string; // hex
  iv: string; // hex
  authTag: string; // hex
}

export class SecureKeyStore {
  private encryptionKey: Buffer;

  constructor(encryptionKeyHex?: string) {
    // Derive encryption key from env or generate one
    const keySource = encryptionKeyHex || process.env.AGENT_ENCRYPTION_KEY;

    if (keySource && keySource.length >= 64) {
      this.encryptionKey = Buffer.from(keySource.slice(0, 64), 'hex');
    } else {
      // SECURITY: AGENT_ENCRYPTION_KEY MUST be set in production.
      // Derive from a stable seed so keys survive restarts.
      // Falls back to NEXTAUTH_SECRET - NEVER use a hardcoded string.
      const seed = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXTAUTH_SECRET;
      if (!seed) {
        console.error(
          'CRITICAL SECURITY: No encryption key source available! ' +
          'Set AGENT_ENCRYPTION_KEY or NEXTAUTH_SECRET in environment. ' +
          'Generating ephemeral key - encrypted data will NOT survive restarts.'
        );
        this.encryptionKey = crypto.randomBytes(KEY_LENGTH);
      } else {
        this.encryptionKey = crypto.createHash('sha256').update(seed).digest();
      }
    }
  }

  /**
   * Encrypt a private key for storage
   */
  encrypt(plaintext: string): EncryptedKey {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt a stored key
   */
  decrypt(encryptedKey: EncryptedKey): string {
    const iv = Buffer.from(encryptedKey.iv, 'hex');
    const authTag = Buffer.from(encryptedKey.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedKey.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a random private key for EVM session wallet
   */
  generateEVMKey(): string {
    return '0x' + crypto.randomBytes(KEY_LENGTH).toString('hex');
  }

  /**
   * Generate a random keypair bytes for Solana session wallet
   * Returns base58-encoded secret key (64 bytes)
   */
  generateSolanaKey(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Generate a secure random string for API-based auth (Alpaca, Hyperliquid)
   */
  generateApiSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Singleton
let keyStoreInstance: SecureKeyStore | null = null;

export function getSecureKeyStore(): SecureKeyStore {
  if (!keyStoreInstance) {
    keyStoreInstance = new SecureKeyStore();
  }
  return keyStoreInstance;
}
