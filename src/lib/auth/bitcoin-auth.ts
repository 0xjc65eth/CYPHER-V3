import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is not set!');
}

export interface BitcoinAuthUser {
  address: string;
  walletType: string;
}

export interface BitcoinAuthSession {
  user: BitcoinAuthUser;
  token: string;
}

// Verify Bitcoin wallet authentication token
export async function verifyBitcoinAuth(request: NextRequest): Promise<BitcoinAuthUser | null> {
  try {
    // Check for token in Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if token is expired
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      address: decoded.address,
      walletType: decoded.walletType
    };
  } catch (error) {
    console.error('Bitcoin auth verification error:', error);
    return null;
  }
}

// Create authentication session
export function createBitcoinAuthSession(address: string, walletType: string): BitcoinAuthSession {
  const user = { address, walletType };
  
  const token = jwt.sign(
    {
      address,
      walletType,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    },
    JWT_SECRET
  );

  return { user, token };
}

// Validate Bitcoin address format
export function isValidBitcoinAddress(address: string): boolean {
  // Basic validation for different Bitcoin address formats
  const patterns = {
    // P2PKH addresses start with 1
    p2pkh: /^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    // P2SH addresses start with 3
    p2sh: /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    // Bech32 addresses start with bc1 (mainnet) or tb1 (testnet)
    bech32: /^(bc1|tb1)[a-z0-9]{39,59}$/,
    // Taproot addresses
    taproot: /^(bc1p|tb1p)[a-z0-9]{58}$/
  };

  return Object.values(patterns).some(pattern => pattern.test(address));
}

// Get wallet display name
export function getWalletDisplayName(walletType: string): string {
  const walletNames: Record<string, string> = {
    xverse: 'Xverse',
    unisat: 'UniSat',
    oyl: 'OYL',
    magiceden: 'Magic Eden'
  };

  return walletNames[walletType] || walletType;
}

// Format Bitcoin address for display
export function formatBitcoinAddress(address: string, length: number = 8): string {
  if (!address || address.length < length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}