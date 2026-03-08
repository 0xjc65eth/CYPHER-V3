/**
 * CYPHER AI Trading Agent - Rug Pull Detector
 * Pre-trade safety checks for memecoin tokens
 */

import { PumpFunToken } from '../connectors/PumpFunConnector';

export interface RugPullCheckResult {
  safe: boolean;
  riskScore: number; // 0 = safe, 100 = certain rug
  flags: string[];
  recommendation: 'safe' | 'caution' | 'avoid';
}

export class RugPullDetector {
  /**
   * Run all safety checks on a token before buying
   */
  async checkToken(token: PumpFunToken): Promise<RugPullCheckResult> {
    const flags: string[] = [];
    let riskScore = 0;

    // 1. Liquidity check
    if (token.liquiditySol < 2) {
      flags.push('Extremely low liquidity (< 2 SOL)');
      riskScore += 40;
    } else if (token.liquiditySol < 5) {
      flags.push('Low liquidity (< 5 SOL)');
      riskScore += 20;
    }

    // 2. Holder count
    if (token.holders < 10) {
      flags.push('Very few holders (< 10)');
      riskScore += 30;
    } else if (token.holders < 50) {
      flags.push('Few holders (< 50)');
      riskScore += 15;
    }

    // 3. Mint authority
    if (token.mintAuthority === 'active') {
      flags.push('Mint authority NOT renounced - can mint unlimited tokens');
      riskScore += 25;
    } else if (token.mintAuthority === 'unknown') {
      flags.push('Mint authority status unknown');
      riskScore += 10;
    }

    // 4. Token age (very new = higher risk)
    const ageMs = Date.now() - token.createdAt;
    if (ageMs < 60_000) { // < 1 min
      flags.push('Token < 1 minute old');
      riskScore += 15;
    } else if (ageMs < 300_000) { // < 5 min
      flags.push('Token < 5 minutes old');
      riskScore += 5;
    }

    // 5. Bonding curve progress
    if (token.bondingCurveProgress > 90) {
      flags.push('Bonding curve near completion - price may be inflated');
      riskScore += 10;
    }

    // 6. Market cap sanity check
    if (token.marketCapSol > 100 && token.holders < 20) {
      flags.push('High market cap with few holders - suspicious');
      riskScore += 20;
    }

    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    // Determine recommendation
    let recommendation: 'safe' | 'caution' | 'avoid';
    if (riskScore >= 50) {
      recommendation = 'avoid';
    } else if (riskScore >= 25) {
      recommendation = 'caution';
    } else {
      recommendation = 'safe';
    }

    return {
      safe: riskScore < 50,
      riskScore,
      flags,
      recommendation,
    };
  }

  /**
   * Quick check - returns true if token passes minimum safety
   */
  async quickCheck(token: PumpFunToken): Promise<boolean> {
    // Hard fails - never trade these
    if (token.liquiditySol < 2) return false;
    if (token.holders < 10) return false;
    if (token.mintAuthority === 'active') return false;
    return true;
  }
}
