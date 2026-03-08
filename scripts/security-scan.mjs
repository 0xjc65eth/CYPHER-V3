#!/usr/bin/env node
/**
 * CYPHER V3 — HACKER YIELDS Security Scan
 *
 * Run: node scripts/security-scan.mjs
 *
 * Scans the codebase for:
 * - Hardcoded secrets
 * - Wallet security issues
 * - Dependency vulnerabilities
 * - XSS patterns
 * - Phishing domain watchlist
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// ============================================================================
// Configuration
// ============================================================================

const SRC_DIR = join(process.cwd(), 'src');
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const IGNORE_DIRS = new Set(['node_modules', '.next', 'dist', '__tests__', 'test', 'lasereyes-core']);
// Exclude security module itself (contains patterns/blocklists that trigger false positives)
const IGNORE_FILES = new Set([
  'src/security/SecurityScanner.ts',
  'src/security/TransactionFirewall.ts',
  'src/security/HackerYields.ts',
  'src/security/PhishingMonitor.ts',
  'src/lib/env.ts', // Security validator itself — checks NEXT_PUBLIC_ vars for secrets
]);

// ============================================================================
// Security Patterns
// ============================================================================

const PATTERNS = [
  {
    id: 'SEC-001',
    severity: 'CRITICAL',
    pattern: /(?:api[_-]?key|secret[_-]?key|private[_-]?key|password)\s*[:=]\s*['"`][A-Za-z0-9+/=_-]{20,}/gi,
    name: 'Hardcoded secret',
    exclude: [/process\.env/, /example/, /test/, /mock/, /placeholder/, /SKILL\.md/, /README/],
  },
  {
    id: 'SEC-002',
    severity: 'CRITICAL',
    pattern: /eval\s*\(\s*(?!.*JSON\.parse)/g,
    name: 'eval() usage',
    exclude: [/test/, /spec/],
  },
  {
    id: 'SEC-003',
    severity: 'HIGH',
    pattern: /dangerouslySetInnerHTML/g,
    name: 'dangerouslySetInnerHTML usage',
    exclude: [/layout\.tsx/, /theme/, /dark/],
  },
  {
    id: 'SEC-004',
    severity: 'HIGH',
    pattern: /localStorage\s*\.\s*setItem\s*\([^)]*(?:private_key|privateKey|secret_key|secretKey|mnemonic|seed_phrase|seedPhrase)/gi,
    name: 'Sensitive data in localStorage',
    exclude: [],
  },
  {
    id: 'SEC-005',
    severity: 'HIGH',
    pattern: /console\.\w+\s*\([^)]*(?:private[_-]?key|mnemonic|secret[_-]?key|password)\b/gi,
    name: 'Sensitive data in console',
    exclude: [/delete/, /redact/, /sanitize/, /NEXTAUTH_SECRET/, /JWT_SECRET/, /Failed/, /error/i],
  },
  {
    id: 'SEC-006',
    severity: 'MEDIUM',
    pattern: /Math\.random\(\)\s*.*(?:token|session|nonce|key|salt)/gi,
    name: 'Insecure randomness for security values',
    exclude: [],
  },
  {
    id: 'SEC-007',
    severity: 'HIGH',
    pattern: /(?:require|import)\s*\(\s*['"`]https?:\/\//g,
    name: 'Remote code import',
    exclude: [],
  },
  {
    id: 'SEC-008',
    severity: 'MEDIUM',
    pattern: /NEXT_PUBLIC_.*(?:SECRET|PRIVATE|KEY|PASSWORD|TOKEN)/gi,
    name: 'Sensitive data in NEXT_PUBLIC_ variable',
    exclude: [/NEXT_PUBLIC_SUPABASE_ANON_KEY/, /NEXT_PUBLIC_SITE_URL/, /NEXT_PUBLIC_ENABLE_/, /NEXT_PUBLIC_WALLETCONNECT/, /NEXT_PUBLIC_MAESTRO/, /validateEnvSecurity/],
  },
  {
    id: 'SEC-009',
    severity: 'HIGH',
    pattern: /innerHTML\s*=\s*[^;]*(?:req|input|params|query|body|user)/gi,
    name: 'User input in innerHTML',
    exclude: [],
  },
  {
    id: 'SEC-010',
    severity: 'CRITICAL',
    pattern: /0x54ba52cbd043b0b2e11a6823a910360e31bb2544|0x6c087c9bd6a6657158982c0b28382117986de57a|Fake_Phishing/gi,
    name: 'Known phishing address in code',
    exclude: [/report/, /INCIDENT/],
  },
];

// ============================================================================
// Scanner
// ============================================================================

function getFiles(dir, files = []) {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          getFiles(fullPath, files);
        } else if (EXTENSIONS.has(extname(entry))) {
          const rel = fullPath.replace(process.cwd() + '/', '');
          if (!IGNORE_FILES.has(rel)) files.push(fullPath);
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return files;
}

function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const findings = [];

  for (const pattern of PATTERNS) {
    const matches = content.match(pattern.pattern);
    if (!matches) continue;

    // Check exclusions
    for (const match of matches) {
      const lineNum = content.slice(0, content.indexOf(match)).split('\n').length;
      const line = content.split('\n')[lineNum - 1] || '';

      const isExcluded = pattern.exclude.some(ex => ex.test(line) || ex.test(filePath));
      if (isExcluded) continue;

      findings.push({
        id: pattern.id,
        severity: pattern.severity,
        name: pattern.name,
        file: filePath.replace(process.cwd() + '/', ''),
        line: lineNum,
        match: match.slice(0, 80),
      });
    }
  }

  return findings;
}

// ============================================================================
// Phishing Watchlist
// ============================================================================

function generatePhishingWatchlist() {
  const base = 'cypherordifuture';
  const tlds = ['com', 'io', 'net', 'org', 'app', 'dev', 'co', 'site', 'online'];
  const watchlist = [];

  // TLD swaps
  for (const tld of tlds) {
    watchlist.push(`${base}.${tld}`);
  }

  // Common typosquats
  const typos = [
    'cyhperordifuture', 'cypherodifuture', 'cypherordifutre',
    'cypherordifutrue', 'cypherordifuture1', 'cypher-ordifuture',
    'cypherordlfuture', 'cipherordifuture', 'cypherordiifuture',
  ];
  for (const t of typos) {
    watchlist.push(`${t}.xyz`);
  }

  // Subdomain tricks
  watchlist.push(
    `secure-${base}.xyz`,
    `${base}-wallet.xyz`,
    `${base}-claim.xyz`,
    `${base}-mint.xyz`,
    `app-${base}.xyz`,
  );

  return watchlist;
}

// ============================================================================
// Main
// ============================================================================

console.log('');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         HACKER YIELDS — Security Scan Report                ║');
console.log('║         CYPHER V3 Autonomous Security Division              ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`Scan started: ${new Date().toISOString()}`);
console.log('');

// Scan source files
const files = getFiles(SRC_DIR);
console.log(`Scanning ${files.length} source files...`);
console.log('');

let allFindings = [];
for (const file of files) {
  const findings = scanFile(file);
  allFindings.push(...findings);
}

// Summary
const critical = allFindings.filter(f => f.severity === 'CRITICAL');
const high = allFindings.filter(f => f.severity === 'HIGH');
const medium = allFindings.filter(f => f.severity === 'MEDIUM');

console.log('═══════════════════════════════════════════════════════════════');
console.log('FINDINGS SUMMARY');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  🔴 CRITICAL: ${critical.length}`);
console.log(`  🟠 HIGH:     ${high.length}`);
console.log(`  🟡 MEDIUM:   ${medium.length}`);
console.log(`  Total:       ${allFindings.length}`);
console.log('');

if (critical.length > 0) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔴 CRITICAL FINDINGS');
  console.log('═══════════════════════════════════════════════════════════════');
  for (const f of critical) {
    console.log(`  [${f.id}] ${f.name}`);
    console.log(`    File: ${f.file}:${f.line}`);
    console.log(`    Match: ${f.match}`);
    console.log('');
  }
}

if (high.length > 0) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🟠 HIGH FINDINGS');
  console.log('═══════════════════════════════════════════════════════════════');
  for (const f of high) {
    console.log(`  [${f.id}] ${f.name}`);
    console.log(`    File: ${f.file}:${f.line}`);
    console.log('');
  }
}

if (medium.length > 0) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🟡 MEDIUM FINDINGS');
  console.log('═══════════════════════════════════════════════════════════════');
  for (const f of medium) {
    console.log(`  [${f.id}] ${f.name}`);
    console.log(`    File: ${f.file}:${f.line}`);
    console.log('');
  }
}

// Phishing watchlist
console.log('═══════════════════════════════════════════════════════════════');
console.log('PHISHING DOMAIN WATCHLIST');
console.log('═══════════════════════════════════════════════════════════════');
const watchlist = generatePhishingWatchlist();
console.log(`  ${watchlist.length} domains to monitor:`);
for (const domain of watchlist.slice(0, 15)) {
  console.log(`    - ${domain}`);
}
console.log(`    ... and ${watchlist.length - 15} more`);
console.log('');

// Security score (calibrated: CRITICAL=25, HIGH=5, MEDIUM=2 — many HIGH are pattern-match FPs)
const deductions = critical.length * 25 + high.length * 5 + medium.length * 2;
const score = Math.max(0, 100 - deductions);
const threatLevel = score >= 80 ? 'GREEN' : score >= 60 ? 'YELLOW' : score >= 40 ? 'ORANGE' : score >= 20 ? 'RED' : 'CRITICAL';

console.log('═══════════════════════════════════════════════════════════════');
console.log('SECURITY SCORE');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Score: ${score}/100`);
console.log(`  Threat Level: ${threatLevel}`);
console.log('');
console.log(`Scan completed: ${new Date().toISOString()}`);
console.log('');

process.exit(critical.length > 0 ? 1 : 0);
