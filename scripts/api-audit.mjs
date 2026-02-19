#!/usr/bin/env node
/**
 * CYPHER V3 - API Endpoint Audit
 * Tests all API endpoints via HTTP and reports results.
 * Faster than Puppeteer-based audit (no browser needed).
 *
 * Usage: node scripts/api-audit.mjs [--json] [--base-url http://localhost:4444]
 */

const BASE_URL = process.argv.find(a => a.startsWith('--base-url='))?.split('=')[1]
  || process.env.BASE_URL
  || 'http://localhost:4444';
const JSON_OUTPUT = process.argv.includes('--json');
const TIMEOUT_MS = 20000;

const ENDPOINTS = [
  // Critical
  { path: '/api/health/', priority: 'critical', check: 'status' },
  { path: '/api/agent/', priority: 'critical', check: 'success' },
  { path: '/api/market/data/', priority: 'critical', check: 'success' },
  { path: '/api/market/price/', priority: 'critical', check: 'success' },

  // High
  { path: '/api/runes/', priority: 'high', check: 'success' },
  { path: '/api/ordinals/', priority: 'high', check: 'success' },
  { path: '/api/brc20/tokens/', priority: 'high', check: 'success' },
  { path: '/api/mempool/', priority: 'high', check: 'success' },
  { path: '/api/arbitrage/opportunities/', priority: 'high', check: 'success' },
  { path: '/api/runes-stats/', priority: 'high', check: 'success' },
  { path: '/api/ordinals-stats/', priority: 'high', check: 'success' },

  // Medium
  { path: '/api/fees/report/', priority: 'medium', check: 'success' },
  { path: '/api/fees/calculate/', priority: 'medium', check: 'json', method: 'POST', body: '{"tokenIn":"BTC","tokenOut":"USDC","amountIn":"0.01","network":"bitcoin"}' },
  { path: '/api/neural-metrics/', priority: 'medium', check: 'success' },
  { path: '/api/market/global/', priority: 'medium', check: 'success' },
  { path: '/api/hashrate-data/', priority: 'medium', check: 'success' },
  { path: '/api/mining-data/', priority: 'medium', check: 'success' },
  { path: '/api/realtime-prices/', priority: 'medium', check: 'success' },
  { path: '/api/trading/status/', priority: 'medium', check: 'success' },

  // Low (slow external APIs)
  { path: '/api/coingecko/', priority: 'low', check: 'json', timeout: 30000 },
];

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  const timeout = endpoint.timeout || TIMEOUT_MS;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const fetchOpts = {
      redirect: 'follow',
      signal: controller.signal,
      method: endpoint.method || 'GET',
    };
    if (endpoint.body) {
      fetchOpts.headers = { 'Content-Type': 'application/json' };
      fetchOpts.body = endpoint.body;
    }
    const res = await fetch(url, fetchOpts);
    clearTimeout(timer);

    const elapsed = Date.now() - start;
    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return {
        ...endpoint,
        status: 'FAIL',
        httpCode: res.status,
        elapsed,
        error: 'Invalid JSON response',
        responseSize: text.length,
      };
    }

    // Check based on expected field
    let ok = false;
    if (endpoint.check === 'success') {
      // Accept: { success: true }, or any valid JSON object with data
      ok = data.success === true
        || (typeof data === 'object' && data !== null && !data.error && Object.keys(data).length > 0);
    } else if (endpoint.check === 'status') {
      ok = ['healthy', 'warning', 'ok', 'operational'].includes(data.status);
    } else if (endpoint.check === 'json') {
      ok = typeof data === 'object' && data !== null;
    }

    return {
      ...endpoint,
      status: ok ? 'OK' : 'FAIL',
      httpCode: res.status,
      elapsed,
      responseSize: text.length,
      error: ok ? null : `Check failed: ${endpoint.check} (got ${JSON.stringify(data.success ?? data.status)})`,
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    return {
      ...endpoint,
      status: 'TIMEOUT',
      elapsed,
      error: err.name === 'AbortError' ? `Timeout after ${timeout}ms` : err.message,
    };
  }
}

async function main() {
  const results = [];
  let ok = 0;
  let fail = 0;

  if (!JSON_OUTPUT) {
    console.log(`=== CYPHER V3 - API AUDIT ===`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Endpoints: ${ENDPOINTS.length}`);
    console.log('');
  }

  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);

    if (result.status === 'OK') {
      ok++;
      if (!JSON_OUTPUT) {
        console.log(`  OK       ${result.path.padEnd(40)} ${result.elapsed}ms  (${result.responseSize} bytes)`);
      }
    } else {
      fail++;
      if (!JSON_OUTPUT) {
        console.log(`  ${result.status.padEnd(8)} ${result.path.padEnd(40)} ${result.error}`);
      }
    }
  }

  if (!JSON_OUTPUT) {
    console.log('');
    console.log(`=== RESULTS: ${ok} OK / ${fail} FAIL / ${ok + fail} TOTAL ===`);

    if (fail > 0) {
      console.log('');
      console.log('=== FAILURES ===');
      results.filter(r => r.status !== 'OK').forEach(r => {
        console.log(`  [${r.priority.toUpperCase()}] ${r.path}: ${r.error}`);
      });
    }
  }

  if (JSON_OUTPUT) {
    const output = {
      audit_type: 'api',
      base_url: BASE_URL,
      timestamp: new Date().toISOString(),
      summary: { total: ok + fail, ok, fail },
      results,
    };
    console.log(JSON.stringify(output, null, 2));
  }

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Audit failed:', err.message);
  process.exit(2);
});
