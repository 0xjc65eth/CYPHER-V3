/**
 * CYPHER V3 — Phishing Domain Monitor
 *
 * Continuously scans for phishing clones of cypherordifuture.xyz.
 * Detects similar domains, UI clones, and wallet-draining scripts.
 *
 * Part of the HACKER YIELDS Security Division.
 */

// ============================================================================
// Types
// ============================================================================

export interface PhishingScanResult {
  scannedAt: number;
  threats: PhishingThreat[];
  totalChecked: number;
  score: number; // 0 = no threats, 100 = active attack
}

export interface PhishingThreat {
  type: 'typosquat' | 'homograph' | 'subdomain' | 'tld_swap' | 'clone' | 'drainer_script';
  domain: string;
  severity: 'info' | 'warning' | 'danger' | 'critical';
  confidence: number; // 0-100
  description: string;
  detectedAt: number;
  reported: boolean;
}

export interface DomainSimilarity {
  domain: string;
  similarity: number;      // 0-1 Levenshtein distance ratio
  technique: string;
  suspiciousScore: number;
}

// ============================================================================
// Domain Similarity Engine
// ============================================================================

const LEGITIMATE_DOMAIN = 'cypherordifuture.xyz';
const LEGITIMATE_VARIATIONS = new Set([
  'cypherordifuture.xyz',
  'www.cypherordifuture.xyz',
]);

export class PhishingMonitor {
  private threats: PhishingThreat[] = [];

  /**
   * Generate a list of potential typosquat/homograph domains
   * that attackers might register to phish users.
   */
  generateSuspiciousDomains(): DomainSimilarity[] {
    const suspicious: DomainSimilarity[] = [];
    const base = 'cypherordifuture';
    const tlds = ['xyz', 'com', 'io', 'net', 'org', 'app', 'dev', 'co', 'me', 'site', 'online', 'tech'];

    // 1. Typosquatting (character swaps, drops, doubles)
    for (let i = 0; i < base.length - 1; i++) {
      // Character swap
      const swapped = base.slice(0, i) + base[i + 1] + base[i] + base.slice(i + 2);
      for (const tld of tlds) {
        suspicious.push({
          domain: `${swapped}.${tld}`,
          similarity: this.levenshtein(base, swapped),
          technique: 'character_swap',
          suspiciousScore: 85,
        });
      }

      // Character drop
      const dropped = base.slice(0, i) + base.slice(i + 1);
      for (const tld of tlds) {
        suspicious.push({
          domain: `${dropped}.${tld}`,
          similarity: this.levenshtein(base, dropped),
          technique: 'character_drop',
          suspiciousScore: 80,
        });
      }
    }

    // 2. Homograph attacks (lookalike characters)
    const homographs: Record<string, string[]> = {
      'o': ['0', 'ο'], // zero, greek omicron
      'i': ['1', 'l', 'í'],
      'e': ['3', 'é', 'ε'],
      'a': ['á', 'à', 'ä'],
      'u': ['ú', 'ü', 'μ'],
      'r': ['г'],
      'c': ['ç', 'с'], // latin c, cyrillic es
      'p': ['р'],       // cyrillic er
      'y': ['ý', 'у'],  // cyrillic u
    };

    for (let i = 0; i < base.length; i++) {
      const char = base[i];
      if (homographs[char]) {
        for (const replacement of homographs[char]) {
          const modified = base.slice(0, i) + replacement + base.slice(i + 1);
          suspicious.push({
            domain: `${modified}.xyz`,
            similarity: 0.95,
            technique: 'homograph',
            suspiciousScore: 90,
          });
        }
      }
    }

    // 3. TLD swaps
    for (const tld of tlds) {
      if (tld !== 'xyz') {
        suspicious.push({
          domain: `${base}.${tld}`,
          similarity: 0.9,
          technique: 'tld_swap',
          suspiciousScore: 70,
        });
      }
    }

    // 4. Subdomain tricks
    const subdomainTricks = [
      `${base}.xyz.fake-domain.com`,
      `secure-${base}.xyz`,
      `${base}-wallet.xyz`,
      `${base}-connect.xyz`,
      `${base}-mint.xyz`,
      `${base}-claim.xyz`,
      `${base}-airdrop.xyz`,
      `app-${base}.xyz`,
      `dapp-${base}.xyz`,
    ];

    for (const domain of subdomainTricks) {
      suspicious.push({
        domain,
        similarity: 0.7,
        technique: 'subdomain_trick',
        suspiciousScore: 75,
      });
    }

    // 5. Word separation tricks
    const separationTricks = [
      'cypher-ordifuture.xyz',
      'cypher-ordi-future.xyz',
      'cypherordi-future.xyz',
      'cypherfuture.xyz',
      'cypherordi.xyz',
      'ordifuture.xyz',
    ];

    for (const domain of separationTricks) {
      suspicious.push({
        domain,
        similarity: this.levenshtein(LEGITIMATE_DOMAIN, domain),
        technique: 'word_separation',
        suspiciousScore: 65,
      });
    }

    return suspicious;
  }

  /**
   * Check a specific URL for phishing indicators.
   */
  analyzeURL(url: string): PhishingThreat | null {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      // Is it the legitimate domain?
      if (LEGITIMATE_VARIATIONS.has(hostname)) return null;

      // Check similarity to legitimate domain
      const similarity = this.levenshtein(LEGITIMATE_DOMAIN, hostname);

      if (similarity > 0.6) {
        const threat: PhishingThreat = {
          type: this.classifyThreatType(hostname),
          domain: hostname,
          severity: similarity > 0.85 ? 'critical' : similarity > 0.7 ? 'danger' : 'warning',
          confidence: Math.round(similarity * 100),
          description: `Domain "${hostname}" is ${Math.round(similarity * 100)}% similar to "${LEGITIMATE_DOMAIN}"`,
          detectedAt: Date.now(),
          reported: false,
        };

        this.threats.push(threat);
        return threat;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Detect wallet-draining scripts in page content.
   */
  detectDrainerScripts(htmlContent: string): Array<{ code: string; severity: string; message: string; details?: string }> {
    const flags: Array<{ code: string; severity: string; message: string; details?: string }> = [];

    // Common drainer patterns
    const drainerPatterns = [
      { pattern: /eth_sign|personal_sign.*approve/i, name: 'Signature-based approval' },
      { pattern: /setApprovalForAll/i, name: 'NFT approval drain' },
      { pattern: /transferFrom.*0xffffffff/i, name: 'Unlimited transfer' },
      { pattern: /permit\s*\(.*deadline/i, name: 'Permit signature drain' },
      { pattern: /fuckNative|drainWallet|stealFunds/i, name: 'Explicit drainer function' },
      { pattern: /eip-?7702|delegat(e|ion)/i, name: 'EIP-7702 delegation' },
      { pattern: /window\.ethereum\.request.*eth_sendTransaction/i, name: 'Direct wallet interaction' },
      { pattern: /signTypedData.*Permit/i, name: 'EIP-712 permit phishing' },
      { pattern: /seaport|wyvern.*fulfillOrder/i, name: 'NFT marketplace exploit' },
    ];

    for (const { pattern, name } of drainerPatterns) {
      if (pattern.test(htmlContent)) {
        flags.push({
          code: 'DRAINER_SCRIPT',
          severity: 'critical',
          message: `Wallet drainer pattern detected: ${name}`,
          details: `Pattern match in page content`,
        });
      }
    }

    // Obfuscation detection
    const obfuscationPatterns = [
      { pattern: /eval\s*\(\s*atob/i, name: 'Base64-encoded eval' },
      { pattern: /\\x[0-9a-f]{2}/i, name: 'Hex-escaped code' },
      { pattern: /String\.fromCharCode.*join/i, name: 'Character code obfuscation' },
      { pattern: /document\.write\s*\(\s*unescape/i, name: 'Escaped document.write' },
    ];

    for (const { pattern, name } of obfuscationPatterns) {
      if (pattern.test(htmlContent)) {
        flags.push({
          code: 'OBFUSCATED_SCRIPT',
          severity: 'danger',
          message: `Obfuscated code detected: ${name}`,
          details: 'Obfuscated scripts are commonly used to hide malicious wallet interactions',
        });
      }
    }

    return flags;
  }

  /**
   * Get all recorded threats.
   */
  getThreats(): PhishingThreat[] {
    return [...this.threats];
  }

  /**
   * Get monitoring watchlist (domains to check periodically).
   */
  getWatchlist(): string[] {
    return this.generateSuspiciousDomains()
      .sort((a, b) => b.suspiciousScore - a.suspiciousScore)
      .slice(0, 50)
      .map(d => d.domain);
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : 1 - matrix[a.length][b.length] / maxLen;
  }

  private classifyThreatType(domain: string): PhishingThreat['type'] {
    if (domain.includes('-') && domain.includes(LEGITIMATE_DOMAIN.split('.')[0].slice(0, 6))) {
      return 'subdomain';
    }
    const baseDomain = domain.split('.').slice(0, -1).join('.');
    const legitBase = LEGITIMATE_DOMAIN.split('.')[0];
    const similarity = this.levenshtein(baseDomain, legitBase);
    if (similarity > 0.9) return 'typosquat';
    if (similarity > 0.8) return 'homograph';
    return 'tld_swap';
  }
}
