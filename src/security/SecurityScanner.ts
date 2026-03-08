/**
 * CYPHER V3 — Security Scanner
 *
 * Autonomous code security analysis engine.
 * Scans for vulnerabilities, exposed secrets, unsafe patterns,
 * and dependency issues.
 *
 * Part of the HACKER YIELDS Security Division.
 */

// ============================================================================
// Types
// ============================================================================

export interface SecurityScanResult {
  scanId: string;
  scannedAt: number;
  duration: number;
  findings: SecurityFinding[];
  summary: ScanSummary;
  score: number; // 0-100, higher = more secure
}

export interface SecurityFinding {
  id: string;
  category: FindingCategory;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  file?: string;
  line?: number;
  recommendation: string;
  cwe?: string; // CWE ID
}

export type FindingCategory =
  | 'secrets_exposure'
  | 'injection'
  | 'auth_bypass'
  | 'insecure_dependency'
  | 'wallet_security'
  | 'xss'
  | 'csrf'
  | 'rate_limiting'
  | 'data_validation'
  | 'cryptographic'
  | 'supply_chain'
  | 'configuration';

export interface ScanSummary {
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  categoryCounts: Record<FindingCategory, number>;
}

// ============================================================================
// Security Pattern Definitions
// ============================================================================

interface SecurityPattern {
  id: string;
  category: FindingCategory;
  severity: SecurityFinding['severity'];
  pattern: RegExp;
  title: string;
  description: string;
  recommendation: string;
  cwe?: string;
  /** File extensions to check (empty = all) */
  fileTypes?: string[];
  /** Patterns that indicate a false positive */
  falsePositivePatterns?: RegExp[];
}

const SECURITY_PATTERNS: SecurityPattern[] = [
  // Secrets Exposure
  {
    id: 'SEC-001',
    category: 'secrets_exposure',
    severity: 'critical',
    pattern: /(?:api[_-]?key|secret[_-]?key|private[_-]?key|password)\s*[:=]\s*['"`][A-Za-z0-9+/=_-]{16,}/i,
    title: 'Hardcoded secret detected',
    description: 'A potential API key, secret key, or password is hardcoded in the source code',
    recommendation: 'Move all secrets to environment variables. Never commit secrets to version control.',
    cwe: 'CWE-798',
    falsePositivePatterns: [/process\.env/, /example/, /test/, /mock/, /placeholder/],
  },
  {
    id: 'SEC-002',
    category: 'secrets_exposure',
    severity: 'high',
    pattern: /NEXT_PUBLIC_.*(?:SECRET|PRIVATE|KEY|PASSWORD|TOKEN)/i,
    title: 'Sensitive data in NEXT_PUBLIC_ variable',
    description: 'NEXT_PUBLIC_ variables are exposed to the browser. Sensitive data should never use this prefix.',
    recommendation: 'Use server-only environment variables for secrets. NEXT_PUBLIC_ is for public data only.',
    cwe: 'CWE-200',
  },

  // Injection
  {
    id: 'SEC-010',
    category: 'injection',
    severity: 'critical',
    pattern: /eval\s*\([^)]*(?:req|input|params|query|body|user)/i,
    title: 'Code injection via eval()',
    description: 'User input is passed to eval(), enabling arbitrary code execution',
    recommendation: 'Never use eval() with user input. Use JSON.parse() for data parsing.',
    cwe: 'CWE-94',
  },
  {
    id: 'SEC-011',
    category: 'injection',
    severity: 'high',
    pattern: /new\s+Function\s*\([^)]*(?:req|input|params|query|body)/i,
    title: 'Code injection via new Function()',
    description: 'User input is passed to Function constructor',
    recommendation: 'Avoid dynamic code generation with user input.',
    cwe: 'CWE-94',
  },

  // XSS
  {
    id: 'SEC-020',
    category: 'xss',
    severity: 'high',
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*(?!DOMPurify)/,
    title: 'Unsanitized dangerouslySetInnerHTML',
    description: 'dangerouslySetInnerHTML used without DOMPurify sanitization',
    recommendation: 'Always sanitize HTML with DOMPurify before using dangerouslySetInnerHTML.',
    cwe: 'CWE-79',
    fileTypes: ['.tsx', '.jsx'],
  },
  {
    id: 'SEC-021',
    category: 'xss',
    severity: 'medium',
    pattern: /innerHTML\s*=\s*(?!.*sanitize|.*purify|.*escape)/i,
    title: 'Direct innerHTML assignment',
    description: 'innerHTML is set directly without sanitization',
    recommendation: 'Use textContent instead, or sanitize with DOMPurify.',
    cwe: 'CWE-79',
  },

  // Wallet Security
  {
    id: 'SEC-030',
    category: 'wallet_security',
    severity: 'critical',
    pattern: /(?:private[_-]?key|mnemonic|seed[_-]?phrase)\s*[:=]\s*['"`]/i,
    title: 'Hardcoded wallet credentials',
    description: 'Private key, mnemonic, or seed phrase found in source code',
    recommendation: 'Never store wallet credentials in source code. Use secure key storage.',
    cwe: 'CWE-798',
    falsePositivePatterns: [/process\.env/, /example/, /test/],
  },
  {
    id: 'SEC-031',
    category: 'wallet_security',
    severity: 'high',
    pattern: /localStorage\s*\.\s*setItem\s*\([^)]*(?:private|key|secret|mnemonic|seed)/i,
    title: 'Sensitive wallet data in localStorage',
    description: 'Wallet credentials stored in browser localStorage (accessible to XSS)',
    recommendation: 'Never store private keys in localStorage. Use session-based secure storage.',
    cwe: 'CWE-922',
  },
  {
    id: 'SEC-032',
    category: 'wallet_security',
    severity: 'high',
    pattern: /console\.\w+\s*\([^)]*(?:private[_-]?key|mnemonic|secret|password)/i,
    title: 'Wallet credentials in console output',
    description: 'Sensitive wallet data may be logged to the console',
    recommendation: 'Remove all logging of sensitive wallet data.',
    cwe: 'CWE-532',
    falsePositivePatterns: [/delete/, /redact/, /sanitize/],
  },

  // Data Validation
  {
    id: 'SEC-040',
    category: 'data_validation',
    severity: 'medium',
    pattern: /export\s+async\s+function\s+(?:GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*\{(?:(?!z\.object|safeParse|parse\()[\s\S]){0,500}\}/,
    title: 'API route without input validation',
    description: 'API route handler does not validate input with Zod or similar',
    recommendation: 'Add Zod schema validation to all API route inputs.',
    cwe: 'CWE-20',
    fileTypes: ['.ts'],
  },

  // Cryptographic
  {
    id: 'SEC-050',
    category: 'cryptographic',
    severity: 'high',
    pattern: /Math\.random\(\)\s*.*(?:token|session|nonce|key|salt|iv)/i,
    title: 'Insecure randomness for security-sensitive values',
    description: 'Math.random() used for generating security tokens, nonces, or keys',
    recommendation: 'Use crypto.randomBytes() or crypto.getRandomValues() for security-sensitive randomness.',
    cwe: 'CWE-338',
  },

  // Supply Chain
  {
    id: 'SEC-060',
    category: 'supply_chain',
    severity: 'high',
    pattern: /(?:require|import)\s*\(\s*['"`]https?:\/\//,
    title: 'Remote code import',
    description: 'Code imported directly from a URL (supply chain risk)',
    recommendation: 'Install dependencies via npm and pin versions. Never import code from URLs.',
    cwe: 'CWE-829',
  },
];

// ============================================================================
// NPM Dependency Security Checks
// ============================================================================

/** Known vulnerable or malicious package prefixes */
const SUSPICIOUS_PACKAGES = [
  'crossenv',      // Typosquat of cross-env
  'event-stream',  // Known supply chain attack
  'flatmap-stream', // Known malicious
  'ua-parser-js',  // Known compromised version
];

/** Packages that should be pinned (not use ^ or ~) */
const PIN_REQUIRED_PACKAGES = [
  'ethers',
  '@solana/web3.js',
  'ccxt',
  '@omnisat/lasereyes',
  'sats-connect',
];

// ============================================================================
// Scanner
// ============================================================================

export class SecurityScanner {
  /**
   * Scan source code content for security issues.
   */
  scanCode(content: string, filePath: string): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const extension = filePath.slice(filePath.lastIndexOf('.'));

    for (const pattern of SECURITY_PATTERNS) {
      // Skip if pattern is for specific file types and this isn't one
      if (pattern.fileTypes && !pattern.fileTypes.includes(extension)) continue;

      const matches = content.match(pattern.pattern);
      if (!matches) continue;

      // Check for false positives
      if (pattern.falsePositivePatterns) {
        const line = this.getMatchLine(content, matches[0]);
        const isFalsePositive = pattern.falsePositivePatterns.some(fp => fp.test(line));
        if (isFalsePositive) continue;
      }

      findings.push({
        id: pattern.id,
        category: pattern.category,
        severity: pattern.severity,
        title: pattern.title,
        description: pattern.description,
        file: filePath,
        line: this.getLineNumber(content, matches[0]),
        recommendation: pattern.recommendation,
        cwe: pattern.cwe,
      });
    }

    return findings;
  }

  /**
   * Analyze package.json dependencies for known vulnerabilities.
   */
  scanDependencies(packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const [name, version] of Object.entries(allDeps)) {
      // Check for suspicious packages
      if (SUSPICIOUS_PACKAGES.some(sp => name.includes(sp))) {
        findings.push({
          id: 'DEP-001',
          category: 'supply_chain',
          severity: 'critical',
          title: `Suspicious package: ${name}`,
          description: `Package "${name}" matches a known malicious or typosquat package pattern`,
          recommendation: `Remove "${name}" immediately and audit for unauthorized changes.`,
          cwe: 'CWE-829',
        });
      }

      // Check for unpinned critical packages
      if (PIN_REQUIRED_PACKAGES.includes(name) && (version.startsWith('^') || version.startsWith('~'))) {
        findings.push({
          id: 'DEP-002',
          category: 'supply_chain',
          severity: 'medium',
          title: `Unpinned critical package: ${name}@${version}`,
          description: `Security-critical package "${name}" uses a range version (${version}) instead of an exact version`,
          recommendation: `Pin "${name}" to an exact version to prevent supply chain attacks via auto-updates.`,
          cwe: 'CWE-1104',
        });
      }
    }

    return findings;
  }

  /**
   * Generate scan summary from findings.
   */
  summarize(findings: SecurityFinding[]): ScanSummary {
    const categoryCounts = {} as Record<FindingCategory, number>;
    let critical = 0, high = 0, medium = 0, low = 0, info = 0;

    for (const f of findings) {
      categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
      switch (f.severity) {
        case 'critical': critical++; break;
        case 'high': high++; break;
        case 'medium': medium++; break;
        case 'low': low++; break;
        case 'info': info++; break;
      }
    }

    return {
      totalFindings: findings.length,
      critical,
      high,
      medium,
      low,
      info,
      categoryCounts,
    };
  }

  /**
   * Calculate a security score from findings.
   */
  calculateScore(findings: SecurityFinding[]): number {
    let deductions = 0;
    for (const f of findings) {
      switch (f.severity) {
        case 'critical': deductions += 25; break;
        case 'high': deductions += 15; break;
        case 'medium': deductions += 8; break;
        case 'low': deductions += 3; break;
        case 'info': deductions += 1; break;
      }
    }
    return Math.max(0, 100 - deductions);
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private getLineNumber(content: string, match: string): number {
    const index = content.indexOf(match);
    if (index === -1) return 0;
    return content.slice(0, index).split('\n').length;
  }

  private getMatchLine(content: string, match: string): string {
    const index = content.indexOf(match);
    if (index === -1) return '';
    const start = content.lastIndexOf('\n', index) + 1;
    const end = content.indexOf('\n', index);
    return content.slice(start, end === -1 ? undefined : end);
  }
}
