import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

const logs = [];
const errors = [];

page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  if (type === 'error' || type === 'warning') {
    logs.push(`[${type.toUpperCase()}] ${text}`);
  }
});
page.on('pageerror', err => errors.push(`[PAGE_ERROR] ${err.message}`));
page.on('requestfailed', req => {
  if (!req.url().includes('favicon'))
    errors.push(`[REQ_FAIL] ${req.url()} - ${req.failure()?.errorText || ''}`);
});

// Visit main page
console.log('=== MAIN PAGE ===');
await page.goto('http://localhost:4444', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));

// Check for wallet connect button
const walletBtn = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const walletBtns = btns.filter(b => b.textContent.toLowerCase().includes('wallet') || b.textContent.toLowerCase().includes('connect'));
  return walletBtns.map(b => ({ text: b.textContent.trim(), disabled: b.disabled }));
});
console.log('Wallet buttons:', JSON.stringify(walletBtn));

// Print errors so far
for (const l of logs) console.log(l);
for (const e of errors) console.log(e);
logs.length = 0;
errors.length = 0;

// Try clicking wallet connect
if (walletBtn.length > 0) {
  try {
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const walletBtn = btns.find(b => b.textContent.toLowerCase().includes('connect') || b.textContent.toLowerCase().includes('wallet'));
      if (walletBtn) { walletBtn.click(); return walletBtn.textContent.trim(); }
      return null;
    });
    console.log('Clicked:', clicked);
    await new Promise(r => setTimeout(r, 3000));
  } catch(e) { console.log('Click error:', e.message); }
}

// Collect errors after click
console.log('\n--- After wallet click ---');
for (const l of logs) console.log(l);
for (const e of errors) console.log(e);
logs.length = 0;
errors.length = 0;

// Check for modals/dialogs
const modals = await page.evaluate(() => {
  const overlays = document.querySelectorAll('[role=dialog], [class*=modal], [class*=Modal], [class*=overlay], [class*=Overlay]');
  return Array.from(overlays).map(el => ({
    tag: el.tagName,
    text: el.textContent?.substring(0, 300),
    visible: el.offsetParent !== null || getComputedStyle(el).display !== 'none'
  }));
});
console.log('Modals after click:', JSON.stringify(modals, null, 2));

// Take screenshot
await page.screenshot({ path: '/tmp/wallet-click.png', fullPage: false });
console.log('\nScreenshot saved: /tmp/wallet-click.png');

// Now visit hacker-yields page
console.log('\n=== TRADING AGENT PAGE ===');
await page.goto('http://localhost:4444/hacker-yields', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));

for (const l of logs) console.log(l);
for (const e of errors) console.log(e);
logs.length = 0;
errors.length = 0;

const pageInfo = await page.evaluate(() => {
  return {
    title: document.title,
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent?.trim()).slice(0, 5),
    errorElements: Array.from(document.querySelectorAll('[class*=error], [class*=Error], [role=alert]')).map(e => e.textContent?.trim().substring(0, 200)),
    buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(t => t).slice(0, 15),
  };
});
console.log('Page info:', JSON.stringify(pageInfo, null, 2));

await page.screenshot({ path: '/tmp/hacker-yields.png', fullPage: false });
console.log('Screenshot saved: /tmp/hacker-yields.png');

await browser.close();
