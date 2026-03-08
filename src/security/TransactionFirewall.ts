/**
 * CYPHER V3 — Transaction Firewall
 *
 * Analyzes every transaction request BEFORE the user signs it.
 * Detects wallet draining patterns, malicious inscriptions,
 * suspicious rune transfers, and abnormal BTC outputs.
 *
 * Part of the HACKER YIELDS Security Division.
 */

// ============================================================================
// Types
// ============================================================================

export interface TransactionAnalysis {
  safe: boolean;
  riskScore: number;        // 0 = safe, 100 = certain malicious
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  flags: SecurityFlag[];
  recommendation: 'approve' | 'warn' | 'block';
  details: string;
  analyzedAt: number;
}

export interface SecurityFlag {
  code: string;
  severity: 'info' | 'warning' | 'danger' | 'critical';
  message: string;
  details?: string;
}

export interface PSBTAnalysis {
  inputCount: number;
  outputCount: number;
  totalInputValue: number;
  totalOutputValue: number;
  fee: number;
  userOutputValue: number;
  externalOutputValue: number;
  externalAddresses: string[];
  hasInscriptionInput: boolean;
  hasRuneInput: boolean;
  drainPercentage: number;
}

export interface EIP7702Check {
  isDelegation: boolean;
  delegateContract?: string;
  isKnownMalicious: boolean;
  contractVerified: boolean;
}

export interface EVMTransactionCheck {
  methodId?: string;
  methodName?: string;
  isApproval: boolean;
  isUnlimitedApproval: boolean;
  approvalAmount?: string;
  isTransfer: boolean;
  isDelegation: boolean;
  targetContract: string;
  isVerifiedContract: boolean;
  isKnownDrainer: boolean;
}

// ============================================================================
// Known Malicious Patterns
// ============================================================================

/** Known drainer contract method signatures */
const KNOWN_DRAINER_METHODS: Record<string, string> = {
  '0x1b568c2c': 'fuckNative(address)',
  '0x2e1a7d4d': 'withdraw(uint256)',    // legitimate but watch context
  '0xa22cb465': 'setApprovalForAll(address,bool)',
  '0x095ea7b3': 'approve(address,uint256)',
  '0x42842e0e': 'safeTransferFrom(address,address,uint256)',
  '0x23b872dd': 'transferFrom(address,address,uint256)',
  '0xd505accf': 'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)',
};

/** Method IDs that are ALWAYS malicious */
const MALICIOUS_METHOD_IDS = new Set([
  '0x1b568c2c', // fuckNative - EIP-7702 drainer
]);

/** Known phishing addresses (continuously updated) */
const KNOWN_PHISHING_ADDRESSES = new Set([
  '0x54ba52cbd043b0b2e11a6823a910360e31bb2544', // Fake_Phishing2168497
  '0x6c087c9bd6a6657158982c0b28382117986de57a', // EIP-7702 drainer contract
]);

/** Unlimited approval threshold (anything above this is "unlimited") */
const UNLIMITED_APPROVAL_THRESHOLD = BigInt('0xffffffffffffffffffffffffffffffff');

/** Max safe BTC output percentage to unknown addresses */
const MAX_SAFE_EXTERNAL_OUTPUT_PCT = 0.95;

/** Max outputs before suspicion */
const MAX_SAFE_OUTPUT_COUNT = 20;

// ============================================================================
// Transaction Firewall
// ============================================================================

export class TransactionFirewall {
  private blockedAddresses: Set<string>;
  private flaggedContracts: Set<string>;

  constructor() {
    this.blockedAddresses = new Set(KNOWN_PHISHING_ADDRESSES);
    this.flaggedContracts = new Set();
  }

  // ==========================================================================
  // Bitcoin / PSBT Analysis
  // ==========================================================================

  /**
   * Analyze a Bitcoin PSBT before signing.
   * Detects: drain patterns, inscription theft, rune theft, abnormal outputs.
   */
  analyzePSBT(params: {
    inputAddresses: string[];
    inputValues: number[];
    outputAddresses: string[];
    outputValues: number[];
    userAddresses: string[];
    hasInscriptions?: boolean;
    hasRunes?: boolean;
  }): TransactionAnalysis {
    const flags: SecurityFlag[] = [];
    let riskScore = 0;

    const totalInput = params.inputValues.reduce((a, b) => a + b, 0);
    const totalOutput = params.outputValues.reduce((a, b) => a + b, 0);
    const fee = totalInput - totalOutput;

    // Identify user vs external outputs
    const userOutputs: number[] = [];
    const externalOutputs: { address: string; value: number }[] = [];

    params.outputAddresses.forEach((addr, i) => {
      if (params.userAddresses.some(ua => ua === addr)) {
        userOutputs.push(params.outputValues[i]);
      } else {
        externalOutputs.push({ address: addr, value: params.outputValues[i] });
      }
    });

    const userOutputTotal = userOutputs.reduce((a, b) => a + b, 0);
    const externalOutputTotal = externalOutputs.reduce((a, b) => a + b.value, 0);
    const drainPct = totalInput > 0 ? externalOutputTotal / totalInput : 0;

    // CHECK 1: Almost all funds going to unknown addresses
    if (drainPct > MAX_SAFE_EXTERNAL_OUTPUT_PCT) {
      flags.push({
        code: 'DRAIN_PATTERN',
        severity: 'critical',
        message: `${(drainPct * 100).toFixed(1)}% of funds going to external addresses`,
        details: `Only ${userOutputTotal} sats returning to your wallet out of ${totalInput} sats`,
      });
      riskScore += 60;
    } else if (drainPct > 0.8) {
      flags.push({
        code: 'HIGH_EXTERNAL_OUTPUT',
        severity: 'warning',
        message: `${(drainPct * 100).toFixed(1)}% of funds going to external addresses`,
      });
      riskScore += 25;
    }

    // CHECK 2: Excessive number of outputs (mass drain)
    if (params.outputAddresses.length > MAX_SAFE_OUTPUT_COUNT) {
      flags.push({
        code: 'EXCESSIVE_OUTPUTS',
        severity: 'danger',
        message: `${params.outputAddresses.length} outputs detected — possible mass drain`,
      });
      riskScore += 30;
    }

    // CHECK 3: Known phishing destination
    for (const ext of externalOutputs) {
      if (this.blockedAddresses.has(ext.address.toLowerCase())) {
        flags.push({
          code: 'KNOWN_PHISHING',
          severity: 'critical',
          message: `Destination is a KNOWN PHISHING address: ${ext.address.slice(0, 12)}...`,
        });
        riskScore += 80;
      }
    }

    // CHECK 4: Inscription theft (all inscription UTXOs being sent externally)
    if (params.hasInscriptions && drainPct > 0.5) {
      flags.push({
        code: 'INSCRIPTION_THEFT',
        severity: 'danger',
        message: 'Transaction may transfer your inscriptions to an external address',
      });
      riskScore += 35;
    }

    // CHECK 5: Rune theft
    if (params.hasRunes && drainPct > 0.5) {
      flags.push({
        code: 'RUNE_THEFT',
        severity: 'danger',
        message: 'Transaction may transfer your Runes to an external address',
      });
      riskScore += 35;
    }

    // CHECK 6: Abnormally high fee
    const feeRate = totalInput > 0 ? fee / totalInput : 0;
    if (feeRate > 0.1) { // >10% fee
      flags.push({
        code: 'HIGH_FEE',
        severity: 'warning',
        message: `Transaction fee is ${(feeRate * 100).toFixed(1)}% of total — unusually high`,
      });
      riskScore += 15;
    }

    // CHECK 7: Dust output (below 546 sats)
    const dustOutputs = params.outputValues.filter(v => v > 0 && v < 546);
    if (dustOutputs.length > 0) {
      flags.push({
        code: 'DUST_OUTPUT',
        severity: 'info',
        message: `${dustOutputs.length} output(s) below dust limit (546 sats)`,
      });
      riskScore += 5;
    }

    riskScore = Math.min(riskScore, 100);

    return {
      safe: riskScore < 30,
      riskScore,
      riskLevel: this.scoreToLevel(riskScore),
      flags,
      recommendation: riskScore >= 60 ? 'block' : riskScore >= 30 ? 'warn' : 'approve',
      details: this.generatePSBTSummary(totalInput, userOutputTotal, externalOutputTotal, fee, externalOutputs),
      analyzedAt: Date.now(),
    };
  }

  // ==========================================================================
  // EVM Transaction Analysis
  // ==========================================================================

  /**
   * Analyze an EVM transaction before signing.
   * Detects: drainer contracts, unlimited approvals, EIP-7702 delegation,
   * permit exploits, malicious method calls.
   */
  analyzeEVMTransaction(params: {
    to: string;
    value: string;
    data?: string;
    chainId: number;
    from: string;
  }): TransactionAnalysis {
    const flags: SecurityFlag[] = [];
    let riskScore = 0;

    const toAddress = params.to.toLowerCase();
    const methodId = params.data?.slice(0, 10) || '';

    // CHECK 1: Known phishing destination
    if (this.blockedAddresses.has(toAddress)) {
      flags.push({
        code: 'KNOWN_DRAINER',
        severity: 'critical',
        message: `Target address is a KNOWN DRAINER: ${params.to.slice(0, 12)}...`,
      });
      riskScore += 90;
    }

    // CHECK 2: Known malicious method ID
    if (MALICIOUS_METHOD_IDS.has(methodId)) {
      flags.push({
        code: 'MALICIOUS_METHOD',
        severity: 'critical',
        message: `Malicious function detected: ${KNOWN_DRAINER_METHODS[methodId] || methodId}`,
        details: 'This function is known to drain wallet funds',
      });
      riskScore += 90;
    }

    // CHECK 3: EIP-7702 delegation detection
    if (this.isEIP7702Delegation(params.data)) {
      flags.push({
        code: 'EIP7702_DELEGATION',
        severity: 'critical',
        message: 'EIP-7702 delegation detected — this grants code execution rights over your wallet',
        details: 'EIP-7702 authorizations allow a smart contract to execute any action as your wallet. NEVER sign these unless you fully trust the contract.',
      });
      riskScore += 70;
    }

    // CHECK 4: Unlimited token approval
    if (methodId === '0x095ea7b3' && params.data && params.data.length >= 138) {
      const approvalAmount = BigInt('0x' + params.data.slice(74, 138));
      if (approvalAmount >= UNLIMITED_APPROVAL_THRESHOLD) {
        flags.push({
          code: 'UNLIMITED_APPROVAL',
          severity: 'danger',
          message: 'Unlimited token approval requested — the approved contract can drain ALL tokens of this type',
          details: `Approve a specific amount instead of unlimited to reduce risk`,
        });
        riskScore += 40;
      }
    }

    // CHECK 5: setApprovalForAll (NFT drainer common method)
    if (methodId === '0xa22cb465') {
      flags.push({
        code: 'APPROVAL_FOR_ALL',
        severity: 'danger',
        message: 'setApprovalForAll requested — grants full access to all your NFTs in this collection',
      });
      riskScore += 35;
    }

    // CHECK 6: permit() signature (gasless approval drain)
    if (methodId === '0xd505accf') {
      flags.push({
        code: 'PERMIT_SIGNATURE',
        severity: 'danger',
        message: 'ERC-2612 permit() detected — this grants token spending rights without an on-chain approval transaction',
        details: 'Permit signatures are commonly used in phishing attacks because they don\'t require gas',
      });
      riskScore += 40;
    }

    // CHECK 7: multicall / batch (can hide malicious calls)
    if (methodId === '0xac9650d8' || methodId === '0x252dba42') {
      flags.push({
        code: 'MULTICALL',
        severity: 'warning',
        message: 'Multicall/batch transaction — contains multiple operations that should be reviewed individually',
      });
      riskScore += 15;
    }

    // CHECK 8: Sending all ETH
    const value = BigInt(params.value || '0');
    if (value > BigInt(0)) {
      flags.push({
        code: 'ETH_TRANSFER',
        severity: 'info',
        message: `Sending ${Number(value) / 1e18} ETH to ${params.to.slice(0, 12)}...`,
      });
    }

    riskScore = Math.min(riskScore, 100);

    return {
      safe: riskScore < 30,
      riskScore,
      riskLevel: this.scoreToLevel(riskScore),
      flags,
      recommendation: riskScore >= 60 ? 'block' : riskScore >= 30 ? 'warn' : 'approve',
      details: this.generateEVMSummary(params, flags),
      analyzedAt: Date.now(),
    };
  }

  // ==========================================================================
  // Solana Transaction Analysis
  // ==========================================================================

  /**
   * Analyze Solana transaction instructions before signing.
   */
  analyzeSolanaTransaction(params: {
    instructions: Array<{
      programId: string;
      keys: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
      data: string;
    }>;
    userPubkey: string;
  }): TransactionAnalysis {
    const flags: SecurityFlag[] = [];
    let riskScore = 0;

    // Known Solana system programs
    const SYSTEM_PROGRAMS = new Set([
      '11111111111111111111111111111111',           // System Program
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token
      'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',  // Token-2022
    ]);

    for (const ix of params.instructions) {
      // CHECK 1: Unknown program
      if (!SYSTEM_PROGRAMS.has(ix.programId)) {
        flags.push({
          code: 'UNKNOWN_PROGRAM',
          severity: 'warning',
          message: `Interacting with unverified program: ${ix.programId.slice(0, 12)}...`,
        });
        riskScore += 15;
      }

      // CHECK 2: Token authority change
      const writableAccounts = ix.keys.filter(k => k.isWritable && k.pubkey !== params.userPubkey);
      if (writableAccounts.length > 5) {
        flags.push({
          code: 'MANY_WRITABLE_ACCOUNTS',
          severity: 'danger',
          message: `${writableAccounts.length} writable accounts modified — possible authority takeover`,
        });
        riskScore += 25;
      }

      // CHECK 3: Multiple signer requirements (could be CPI attack)
      const signers = ix.keys.filter(k => k.isSigner);
      if (signers.length > 2) {
        flags.push({
          code: 'MULTIPLE_SIGNERS',
          severity: 'warning',
          message: `${signers.length} signers required — review authority delegation`,
        });
        riskScore += 10;
      }
    }

    // CHECK 4: Too many instructions (complexity = risk)
    if (params.instructions.length > 10) {
      flags.push({
        code: 'COMPLEX_TRANSACTION',
        severity: 'warning',
        message: `${params.instructions.length} instructions — complex transaction, review carefully`,
      });
      riskScore += 10;
    }

    riskScore = Math.min(riskScore, 100);

    return {
      safe: riskScore < 30,
      riskScore,
      riskLevel: this.scoreToLevel(riskScore),
      flags,
      recommendation: riskScore >= 60 ? 'block' : riskScore >= 30 ? 'warn' : 'approve',
      details: `Solana transaction with ${params.instructions.length} instruction(s)`,
      analyzedAt: Date.now(),
    };
  }

  // ==========================================================================
  // Address Blocklist Management
  // ==========================================================================

  /** Add a known phishing/drainer address to the blocklist */
  blockAddress(address: string): void {
    this.blockedAddresses.add(address.toLowerCase());
  }

  /** Check if an address is blocked */
  isBlocked(address: string): boolean {
    return this.blockedAddresses.has(address.toLowerCase());
  }

  /** Add multiple addresses from an external threat feed */
  importBlocklist(addresses: string[]): number {
    let added = 0;
    for (const addr of addresses) {
      const normalized = addr.toLowerCase().trim();
      if (normalized && !this.blockedAddresses.has(normalized)) {
        this.blockedAddresses.add(normalized);
        added++;
      }
    }
    return added;
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  private isEIP7702Delegation(data?: string): boolean {
    if (!data) return false;
    // EIP-7702 authorization has specific structure
    // Look for delegation-related patterns
    return data.includes('7702') || data.length > 1000;
  }

  private scoreToLevel(score: number): TransactionAnalysis['riskLevel'] {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    if (score >= 10) return 'low';
    return 'safe';
  }

  private generatePSBTSummary(
    totalInput: number,
    userOutput: number,
    externalOutput: number,
    fee: number,
    externalOutputs: { address: string; value: number }[]
  ): string {
    const lines = [
      `Input: ${totalInput} sats`,
      `To you: ${userOutput} sats`,
      `To others: ${externalOutput} sats (${externalOutputs.length} address${externalOutputs.length !== 1 ? 'es' : ''})`,
      `Fee: ${fee} sats`,
    ];
    return lines.join(' | ');
  }

  private generateEVMSummary(
    params: { to: string; value: string; data?: string; chainId: number },
    flags: SecurityFlag[]
  ): string {
    const criticals = flags.filter(f => f.severity === 'critical');
    if (criticals.length > 0) {
      return `DANGER: ${criticals.map(f => f.message).join('; ')}`;
    }
    return `Transaction to ${params.to.slice(0, 12)}... on chain ${params.chainId}`;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let firewallInstance: TransactionFirewall | null = null;

export function getTransactionFirewall(): TransactionFirewall {
  if (!firewallInstance) {
    firewallInstance = new TransactionFirewall();
  }
  return firewallInstance;
}
