/**
 * CYPHER V3 — Security Division
 *
 * Autonomous AI Security System led by HACKER YIELDS.
 *
 * 50 Agent Roles across 5 Divisions:
 *
 * Division 1: CODE AUDIT (10 agents)
 *   - Static code analyzer
 *   - Dependency vulnerability scanner
 *   - Secrets exposure detector
 *   - Unsafe logic detector
 *   - Memory leak detector
 *   - Injection vulnerability scanner
 *   - Pull request security reviewer
 *   - Hardcoded credential detector
 *   - Unsafe async code detector
 *   - Security patch generator
 *
 * Division 2: WEB SECURITY (10 agents)
 *   - XSS detection agent
 *   - CSRF protection validator
 *   - CSP policy enforcer
 *   - DOM injection detector
 *   - Clickjacking defense agent
 *   - Browser extension attack detector
 *   - Wallet connection flow auditor
 *   - Script integrity validator
 *   - Input sanitization enforcer
 *   - Frontend security monitor
 *
 * Division 3: WALLET & TRANSACTION SECURITY (10 agents)
 *   - Bitcoin PSBT analyzer
 *   - EVM transaction inspector
 *   - Solana instruction analyzer
 *   - EIP-7702 delegation detector
 *   - Token approval auditor
 *   - Wallet drainer pattern detector
 *   - Signature request analyzer
 *   - Transaction simulation engine
 *   - Permit exploit detector
 *   - Multi-chain address validator
 *
 * Division 4: PHISHING & SOCIAL ENGINEERING DEFENSE (10 agents)
 *   - Domain typosquat monitor
 *   - Homograph attack detector
 *   - UI clone detector
 *   - Drainer script scanner
 *   - Social media scam monitor
 *   - Fake mint page detector
 *   - Brand abuse detector
 *   - Phishing URL analyzer
 *   - External link validator
 *   - Threat intelligence aggregator
 *
 * Division 5: INFRASTRUCTURE SECURITY (10 agents)
 *   - API endpoint scanner
 *   - Rate limit enforcer
 *   - Secrets management auditor
 *   - Container security scanner
 *   - DDoS pattern detector
 *   - Authentication flow auditor
 *   - Session security validator
 *   - Log analysis agent
 *   - Anomaly detection agent
 *   - Security header enforcer
 */

export { HackerYields, getHackerYields } from './HackerYields';
export type { SecurityReport, ThreatLevel, SecurityEvent, PatchSuggestion } from './HackerYields';

export { TransactionFirewall, getTransactionFirewall } from './TransactionFirewall';
export type { TransactionAnalysis, SecurityFlag, PSBTAnalysis, EVMTransactionCheck } from './TransactionFirewall';

export { PhishingMonitor } from './PhishingMonitor';
export type { PhishingScanResult, PhishingThreat, DomainSimilarity } from './PhishingMonitor';

export { SecurityScanner } from './SecurityScanner';
export type { SecurityScanResult, SecurityFinding, ScanSummary, FindingCategory } from './SecurityScanner';
