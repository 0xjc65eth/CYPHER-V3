#!/usr/bin/env node
/**
 * CYPHER V3 - Autonomous Browser Console Log Capture
 * Navigates all major pages and captures every console message.
 * Output: JSON logs to stdout, errors summary to stderr.
 */

import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4444';
const TIMEOUT = parseInt(process.env.PAGE_TIMEOUT || '30000');

// All pages to audit
const PAGES = [
  { name: 'Home / Dashboard', path: '/' },
  { name: 'Market', path: '/market' },
  { name: 'Portfolio', path: '/portfolio' },
  { name: 'Ordinals', path: '/ordinals' },
  { name: 'Runes', path: '/runes' },
  { name: 'BRC-20', path: '/brc20' },
  { name: 'Arbitrage', path: '/arbitrage' },
  { name: 'Swap', path: '/swap' },
  { name: 'Simple', path: '/simple' },
  { name: 'Rare Sats', path: '/rare-sats' },
  { name: 'Hacker Yields', path: '/hacker-yields' },
  { name: 'Tax', path: '/tax' },
  { name: 'Alerts', path: '/alerts' },
  { name: 'Admin Fees', path: '/admin/fees' },
  { name: 'API Health', path: '/api/health' },
];

async function captureConsoleLogs() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const allLogs = [];
  const summary = { total: 0, errors: 0, warnings: 0, info: 0, pages_with_errors: [] };

  for (const pageInfo of PAGES) {
    const page = await browser.newPage();
    const pageLogs = [];

    // Capture all console messages
    page.on('console', (msg) => {
      const entry = {
        page: pageInfo.name,
        path: pageInfo.path,
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString(),
      };
      pageLogs.push(entry);
      summary.total++;
      if (msg.type() === 'error') summary.errors++;
      else if (msg.type() === 'warning') summary.warnings++;
      else summary.info++;
    });

    // Capture uncaught errors
    page.on('pageerror', (err) => {
      pageLogs.push({
        page: pageInfo.name,
        path: pageInfo.path,
        type: 'pageerror',
        text: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      summary.errors++;
      summary.total++;
    });

    // Capture failed network requests
    page.on('requestfailed', (req) => {
      pageLogs.push({
        page: pageInfo.name,
        path: pageInfo.path,
        type: 'network_error',
        text: `${req.method()} ${req.url()} - ${req.failure()?.errorText || 'unknown'}`,
        timestamp: new Date().toISOString(),
      });
      summary.errors++;
      summary.total++;
    });

    // Capture response errors (4xx, 5xx)
    page.on('response', (res) => {
      if (res.status() >= 400) {
        pageLogs.push({
          page: pageInfo.name,
          path: pageInfo.path,
          type: 'http_error',
          text: `${res.status()} ${res.statusText()} - ${res.url()}`,
          timestamp: new Date().toISOString(),
        });
        if (res.status() >= 500) summary.errors++;
        else summary.warnings++;
        summary.total++;
      }
    });

    try {
      await page.goto(`${BASE_URL}${pageInfo.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: TIMEOUT,
      });
      // Wait for React hydration + lazy-loaded content
      await new Promise((r) => setTimeout(r, 5000));
    } catch (err) {
      pageLogs.push({
        page: pageInfo.name,
        path: pageInfo.path,
        type: 'navigation_error',
        text: err.message,
        timestamp: new Date().toISOString(),
      });
      summary.errors++;
      summary.total++;
    }

    if (pageLogs.some((l) => l.type === 'error' || l.type === 'pageerror' || l.type === 'network_error')) {
      summary.pages_with_errors.push(pageInfo.name);
    }

    allLogs.push(...pageLogs);
    await page.close();
  }

  await browser.close();

  // Output full logs as JSON
  const output = {
    captured_at: new Date().toISOString(),
    base_url: BASE_URL,
    summary,
    logs: allLogs,
  };

  console.log(JSON.stringify(output, null, 2));

  // Summary to stderr
  console.error(`\n=== CONSOLE AUDIT SUMMARY ===`);
  console.error(`Total messages: ${summary.total}`);
  console.error(`Errors: ${summary.errors}`);
  console.error(`Warnings: ${summary.warnings}`);
  console.error(`Info/Other: ${summary.info}`);
  console.error(`Pages with errors: ${summary.pages_with_errors.join(', ') || 'none'}`);
  console.error(`=============================\n`);

  return summary.errors > 0 ? 1 : 0;
}

const exitCode = await captureConsoleLogs();
process.exit(exitCode);
