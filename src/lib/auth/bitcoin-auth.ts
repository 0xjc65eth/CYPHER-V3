import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET is required and must be at least 32 characters');
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
  if (!address || typeof address !== 'string') return false;

  // P2PKH: starts with 1, Base58Check, 25-34 chars
  const p2pkh = /^1[a-km-zA-HJ-NP-Z1-9]{25,33}$/;
  // P2SH: starts with 3, Base58Check, 25-34 chars
  const p2sh = /^3[a-km-zA-HJ-NP-Z1-9]{25,33}$/;
  // Bech32 (P2WPKH/P2WSH): bc1q for mainnet, tb1q for testnet, 42 or 62 chars
  const bech32 = /^(bc1q|tb1q)[a-z0-9]{38,58}$/;
  // Bech32m (Taproot P2TR): bc1p for mainnet, tb1p for testnet, exactly 62 chars
  const taproot = /^(bc1p|tb1p)[a-z0-9]{58}$/;

  return p2pkh.test(address) || p2sh.test(address) || bech32.test(address) || taproot.test(address);
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