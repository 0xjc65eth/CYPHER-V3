#!/usr/bin/env node
/**
 * Deep Wallet Test - Puppeteer script that injects mock wallet providers
 * and captures all console output during wallet connection flows.
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:4444';
const allLogs = [];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  allLogs.push(line);
  console.log(line);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Inject mock wallet providers BEFORE any page load
  await page.evaluateOnNewDocument(() => {
    // Mock MetaMask
    window.ethereum = {
      isMetaMask: true,
      selectedAddress: null,
      chainId: '0x1',
      networkVersion: '1',
      request: async ({ method, params }) => {
        console.log('[MOCK_MM] request:', method, JSON.stringify(params));
        if (method === 'eth_requestAccounts') return ['0x742d35Cc6634C0532925a3b844Bc9e7595f2bD61'];
        if (method === 'eth_accounts') return ['0x742d35Cc6634C0532925a3b844Bc9e7595f2bD61'];
        if (method === 'eth_chainId') return '0x1';
        if (method === 'net_version') return '1';
        if (method === 'wallet_switchEthereumChain') return null;
        throw new Error('Unsupported method: ' + method);
      },
      on: (event, cb) => { console.log('[MOCK_MM] on:', event); },
      removeListener: () => {},
      isConnected: () => true,
    };

    // Mock Phantom
    window.solana = {
      isPhantom: true,
      publicKey: {
        toBase58: () => 'DRpbCBMxVnDK7maPMoGQfFaCRJCPsGSsa2DpCAqMjSJY',
        toString: () => 'DRpbCBMxVnDK7maPMoGQfFaCRJCPsGSsa2DpCAqMjSJY',
      },
      connect: async () => ({
        publicKey: {
          toBase58: () => 'DRpbCBMxVnDK7maPMoGQfFaCRJCPsGSsa2DpCAqMjSJY',
        },
      }),
      disconnect: async () => {},
      signTransaction: async (tx) => tx,
      signAllTransactions: async (txs) => txs,
      on: (event, cb) => {},
      isConnected: true,
    };

    // Mock UniSat
    window.unisat = {
      getAccounts: async () => ['bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'],
      requestAccounts: async () => ['bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'],
      getNetwork: async () => 'livenet',
      getPublicKey: async () => '02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc',
      signMessage: async (msg) => 'mock_sig',
      on: (event, cb) => {},
      getBalance: async () => ({ confirmed: 100000, unconfirmed: 0, total: 100000 }),
    };
  });

  // Capture ALL console messages
  page.on('console', (msg) => {
    const type = msg.type().toUpperCase();
    const text = msg.text();
    log(`[CONSOLE:${type}] ${text}`);
  });

  // Capture page errors
  page.on('pageerror', (err) => {
    log(`[PAGE_ERROR] ${err.message}`);
  });

  // Capture request failures
  page.on('requestfailed', (req) => {
    log(`[REQ_FAIL] ${req.method()} ${req.url()} - ${req.failure()?.errorText || 'unknown'}`);
  });

  // ========== STEP 1: Navigate to homepage ==========
  log('--- STEP 1: Navigating to homepage ---');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    log('Homepage loaded');
  } catch (e) {
    log(`Homepage load error: ${e.message}`);
    // Continue even if timeout - page may still be usable
  }
  await sleep(5000);
  await page.screenshot({ path: '/tmp/wallet-debug-01-homepage.png', fullPage: false });
  log('Screenshot saved: /tmp/wallet-debug-01-homepage.png');

  // ========== STEP 2: Click Connect Wallet button ==========
  log('--- STEP 2: Looking for Connect Wallet button ---');
  try {
    // Try multiple selectors for the connect wallet button
    const selectors = [
      'button:has-text("Connect")',
      'button:has-text("connect")',
      'button:has-text("Wallet")',
      '[data-testid="connect-wallet"]',
      'button.connect-wallet',
    ];

    let clicked = false;

    // Use XPath-style text matching via evaluate
    clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('connect') && (text.includes('wallet') || text.length < 30)) {
          console.log('[TEST] Clicking button: ' + btn.textContent?.trim());
          btn.click();
          return true;
        }
      }
      // Also try anchor tags or divs that look like buttons
      const allClickable = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      for (const el of allClickable) {
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('connect')) {
          console.log('[TEST] Clicking element: ' + el.textContent?.trim());
          el.click();
          return true;
        }
      }
      return false;
    });

    if (clicked) {
      log('Clicked Connect Wallet button');
    } else {
      log('Could not find Connect Wallet button - listing all buttons');
      const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.textContent?.trim()?.substring(0, 80),
          class: b.className?.substring(0, 80),
          id: b.id,
        }));
      });
      buttons.forEach(b => log(`  Button: "${b.text}" class="${b.class}" id="${b.id}"`));
    }
  } catch (e) {
    log(`Connect wallet click error: ${e.message}`);
  }

  await sleep(3000);
  await page.screenshot({ path: '/tmp/wallet-debug-02-after-connect-click.png', fullPage: false });
  log('Screenshot saved: /tmp/wallet-debug-02-after-connect-click.png');

  // ========== STEP 3: Try clicking wallet selector option ==========
  log('--- STEP 3: Looking for wallet selector / modal ---');
  try {
    const selectorClicked = await page.evaluate(() => {
      // Look for a modal or dialog that appeared
      const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"], [class*="Modal"], [class*="dialog"]');
      console.log('[TEST] Found ' + modals.length + ' modal elements');

      // Look for Xverse or any wallet option
      const allElements = Array.from(document.querySelectorAll('button, a, div[role="button"], li'));
      for (const el of allElements) {
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('xverse') || text.includes('unisat') || text.includes('metamask') || text.includes('phantom')) {
          console.log('[TEST] Found wallet option: ' + el.textContent?.trim());
          el.click();
          return el.textContent?.trim();
        }
      }
      return null;
    });

    if (selectorClicked) {
      log(`Clicked wallet option: ${selectorClicked}`);
    } else {
      log('No wallet selector modal found');
    }
  } catch (e) {
    log(`Wallet selector error: ${e.message}`);
  }

  await sleep(3000);
  await page.screenshot({ path: '/tmp/wallet-debug-03-wallet-selector.png', fullPage: false });
  log('Screenshot saved: /tmp/wallet-debug-03-wallet-selector.png');

  // ========== STEP 4: Navigate to /hacker-yields ==========
  log('--- STEP 4: Navigating to /hacker-yields ---');
  try {
    await page.goto(`${BASE_URL}/hacker-yields`, { waitUntil: 'networkidle2', timeout: 60000 });
    log('/hacker-yields loaded');
  } catch (e) {
    log(`/hacker-yields load error: ${e.message}`);
  }
  await sleep(5000);
  await page.screenshot({ path: '/tmp/wallet-debug-04-trading-agent.png', fullPage: false });
  log('Screenshot saved: /tmp/wallet-debug-04-trading-agent.png');

  // ========== STEP 5: Click MetaMask card ==========
  log('--- STEP 5: Looking for MetaMask card ---');
  try {
    const mmClicked = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('button, div, a, [role="button"], li, label'));
      for (const el of allElements) {
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('metamask') && !text.includes('phantom') && text.length < 200) {
          console.log('[TEST] Clicking MetaMask card: ' + el.textContent?.trim()?.substring(0, 100));
          el.click();
          return true;
        }
      }
      // Also try by image alt
      const imgs = Array.from(document.querySelectorAll('img'));
      for (const img of imgs) {
        if (img.alt?.toLowerCase().includes('metamask')) {
          console.log('[TEST] Clicking MetaMask image parent');
          img.closest('button, div[role="button"], a, div')?.click();
          return true;
        }
      }
      return false;
    });

    if (mmClicked) {
      log('Clicked MetaMask card');
    } else {
      log('MetaMask card not found - listing visible elements with wallet text');
      const walletElements = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return (text.includes('metamask') || text.includes('phantom') || text.includes('wallet')) && text.length < 100;
        }).slice(0, 20).map(el => ({
          tag: el.tagName,
          text: el.textContent?.trim()?.substring(0, 80),
          class: el.className?.toString()?.substring(0, 60),
        }));
      });
      walletElements.forEach(el => log(`  ${el.tag}: "${el.text}" class="${el.class}"`));
    }
  } catch (e) {
    log(`MetaMask click error: ${e.message}`);
  }

  await sleep(3000);
  await page.screenshot({ path: '/tmp/wallet-debug-05-metamask-click.png', fullPage: false });
  log('Screenshot saved: /tmp/wallet-debug-05-metamask-click.png');

  // ========== STEP 6: Click Phantom card ==========
  log('--- STEP 6: Looking for Phantom card ---');
  try {
    const phantomClicked = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('button, div, a, [role="button"], li, label'));
      for (const el of allElements) {
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('phantom') && !text.includes('metamask') && text.length < 200) {
          console.log('[TEST] Clicking Phantom card: ' + el.textContent?.trim()?.substring(0, 100));
          el.click();
          return true;
        }
      }
      const imgs = Array.from(document.querySelectorAll('img'));
      for (const img of imgs) {
        if (img.alt?.toLowerCase().includes('phantom')) {
          console.log('[TEST] Clicking Phantom image parent');
          img.closest('button, div[role="button"], a, div')?.click();
          return true;
        }
      }
      return false;
    });

    if (phantomClicked) {
      log('Clicked Phantom card');
    } else {
      log('Phantom card not found');
    }
  } catch (e) {
    log(`Phantom click error: ${e.message}`);
  }

  await sleep(3000);
  await page.screenshot({ path: '/tmp/wallet-debug-06-phantom-click.png', fullPage: false });
  log('Screenshot saved: /tmp/wallet-debug-06-phantom-click.png');

  // ========== SUMMARY ==========
  log('');
  log('========== FULL LOG SUMMARY ==========');
  log(`Total log entries: ${allLogs.length}`);

  const errors = allLogs.filter(l => l.includes('[PAGE_ERROR]') || l.includes('[CONSOLE:ERROR]'));
  const warnings = allLogs.filter(l => l.includes('[CONSOLE:WARNING]'));
  const mockCalls = allLogs.filter(l => l.includes('[MOCK_MM]') || l.includes('[MOCK_'));

  log(`Errors: ${errors.length}`);
  log(`Warnings: ${warnings.length}`);
  log(`Mock wallet calls: ${mockCalls.length}`);

  if (errors.length > 0) {
    log('');
    log('--- ERRORS ---');
    errors.forEach(e => log(e));
  }

  if (mockCalls.length > 0) {
    log('');
    log('--- MOCK WALLET INTERACTIONS ---');
    mockCalls.forEach(m => log(m));
  }

  await browser.close();
  log('Browser closed. Done.');
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
