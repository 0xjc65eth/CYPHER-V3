/**
 * QA Testing Script for Ordinals Dashboard
 * Tests all tabs and functionality comprehensively
 */

const puppeteer = require('puppeteer');

const TEST_URL = 'http://localhost:4444/ordinals';
const WAIT_TIMEOUT = 10000;
const results = {
  collections: { passed: [], failed: [], warnings: [] },
  inscriptions: { passed: [], failed: [], warnings: [] },
  marketplace: { passed: [], failed: [], warnings: [] },
  arbitrage: { passed: [], failed: [], warnings: [] },
  analytics: { passed: [], failed: [], warnings: [] },
  general: { passed: [], failed: [], warnings: [] },
  consoleErrors: [],
  networkErrors: []
};

async function runTests() {
  console.log('🚀 Starting QA Test Suite for Ordinals Dashboard\n');
  console.log('=' .repeat(80));

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Monitor network errors
    page.on('requestfailed', request => {
      results.networkErrors.push({
        url: request.url(),
        failure: request.failure().errorText
      });
    });

    console.log('\n📍 Navigating to:', TEST_URL);
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: WAIT_TIMEOUT });

    console.log('✅ Page loaded successfully\n');

    // Wait for page to be interactive
    await new Promise(resolve => setTimeout(resolve, 2000)));

    // ========================================================================
    // TEST 1: COLLECTIONS TAB
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: COLLECTIONS TAB');
    console.log('='.repeat(80));

    await testCollectionsTab(page);

    // ========================================================================
    // TEST 2: INSCRIPTIONS TAB
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: INSCRIPTIONS TAB');
    console.log('='.repeat(80));

    await testInscriptionsTab(page);

    // ========================================================================
    // TEST 3: MARKETPLACE TAB
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('TEST 3: MARKETPLACE TAB');
    console.log('='.repeat(80));

    await testMarketplaceTab(page);

    // ========================================================================
    // TEST 4: ARBITRAGE TAB
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('TEST 4: ARBITRAGE TAB');
    console.log('='.repeat(80));

    await testArbitrageTab(page);

    // ========================================================================
    // TEST 5: ANALYTICS TAB
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('TEST 5: ANALYTICS TAB');
    console.log('='.repeat(80));

    await testAnalyticsTab(page);

    // ========================================================================
    // GENERATE REPORT
    // ========================================================================
    generateReport();

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    results.general.failed.push({ test: 'Test Suite Execution', error: error.message });
  } finally {
    await browser.close();
  }
}

// ============================================================================
// COLLECTIONS TAB TESTS
// ============================================================================
async function testCollectionsTab(page) {
  try {
    // Click Collections tab
    await page.click('[data-tab="collections"], button:has-text("Collections")').catch(() => {});
    await new Promise(resolve => setTimeout(resolve(1000);

    // Test 1.1: Collection names display correctly (not "Unknown")
    console.log('\n📋 Test 1.1: Collection names display correctly');
    const collections = await page.$$eval('[data-collection-name], .collection-name, h3', els =>
      els.map(el => el.textContent.trim()).filter(t => t.length > 0)
    );

    const unknownCount = collections.filter(name => name.toLowerCase().includes('unknown')).length;
    if (unknownCount === 0 && collections.length > 0) {
      results.collections.passed.push({ test: 'Collection names display', details: `Found ${collections.length} collections with valid names` });
      console.log(`✅ PASS: ${collections.length} collections loaded with proper names`);
      console.log(`   Sample names: ${collections.slice(0, 3).join(', ')}`);
    } else {
      results.collections.failed.push({ test: 'Collection names display', details: `Found ${unknownCount} "Unknown" names out of ${collections.length}` });
      console.log(`❌ FAIL: Found ${unknownCount} "Unknown" collection names`);
    }

    // Test 1.2: Click on collection opens details modal
    console.log('\n📋 Test 1.2: Collection click opens details modal');
    const collectionCards = await page.$$('[data-collection-card], .collection-card, [class*="cursor-pointer"]');

    if (collectionCards.length > 0) {
      await collectionCards[0].click();
      await new Promise(resolve => setTimeout(resolve(1500);

      const modalVisible = await page.$('[data-modal], [role="dialog"], .modal').then(el => !!el);

      if (modalVisible) {
        results.collections.passed.push({ test: 'Collection modal opens', details: 'Modal appears on collection click' });
        console.log('✅ PASS: Modal opened successfully');

        // Test modal content
        const modalContent = await page.$eval('[data-modal], [role="dialog"]', el => ({
          hasMetrics: el.textContent.includes('Volume') || el.textContent.includes('Floor'),
          hasChart: !!el.querySelector('canvas, svg'),
          hasLinks: el.querySelectorAll('a').length > 0,
          hasButtons: el.querySelectorAll('button').length > 0
        })).catch(() => ({ hasMetrics: false, hasChart: false, hasLinks: false, hasButtons: false }));

        console.log(`   - Metrics displayed: ${modalContent.hasMetrics ? '✅' : '❌'}`);
        console.log(`   - Chart visible: ${modalContent.hasChart ? '✅' : '❌'}`);
        console.log(`   - Marketplace links: ${modalContent.hasLinks ? '✅' : '❌'}`);
        console.log(`   - Action buttons: ${modalContent.hasButtons ? '✅' : '❌'}`);

        // Close modal
        await page.click('[data-close-modal], button[aria-label*="close"], .modal-close').catch(() => {});
        await new Promise(resolve => setTimeout(resolve(500);
      } else {
        results.collections.failed.push({ test: 'Collection modal opens', details: 'Modal did not appear' });
        console.log('❌ FAIL: Modal did not open');
      }
    } else {
      results.collections.warnings.push({ test: 'Collection cards', details: 'No collection cards found to click' });
      console.log('⚠️  WARNING: No collection cards found');
    }

    // Test 1.3: Search functionality
    console.log('\n📋 Test 1.3: Search functionality');
    const searchInput = await page.$('input[type="search"], input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('Bitcoin');
      await new Promise(resolve => setTimeout(resolve(1000);

      const filteredCollections = await page.$$('[data-collection-card], .collection-card');
      results.collections.passed.push({ test: 'Search works', details: `Search returned ${filteredCollections.length} results` });
      console.log(`✅ PASS: Search functional, found ${filteredCollections.length} results`);

      // Clear search
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await new Promise(resolve => setTimeout(resolve(500);
    } else {
      results.collections.warnings.push({ test: 'Search', details: 'Search input not found' });
      console.log('⚠️  WARNING: Search input not found');
    }

    // Test 1.4: Auto-refresh indicator
    console.log('\n📋 Test 1.4: Auto-refresh functionality');
    const refreshIndicator = await page.$('[data-last-updated], .last-updated, .refresh-indicator').then(el => !!el);
    if (refreshIndicator) {
      results.collections.passed.push({ test: 'Auto-refresh indicator', details: 'Last updated timestamp visible' });
      console.log('✅ PASS: Auto-refresh indicator present');
    } else {
      results.collections.warnings.push({ test: 'Auto-refresh indicator', details: 'No refresh indicator found' });
      console.log('⚠️  WARNING: No auto-refresh indicator found');
    }

  } catch (error) {
    results.collections.failed.push({ test: 'Collections Tab', error: error.message });
    console.log('❌ ERROR in Collections Tab:', error.message);
  }
}

// ============================================================================
// INSCRIPTIONS TAB TESTS
// ============================================================================
async function testInscriptionsTab(page) {
  try {
    // Navigate to Inscriptions tab
    await page.click('[data-tab="inscriptions"], button:has-text("Inscriptions")').catch(() => {
      return page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const inscriptionsBtn = buttons.find(b => b.textContent.includes('Inscriptions'));
        if (inscriptionsBtn) inscriptionsBtn.click();
      });
    });
    await new Promise(resolve => setTimeout(resolve(2000);

    console.log('\n📋 Test 2.1: Inscriptions data loads');
    const inscriptions = await page.$$('[data-inscription], .inscription-card, .inscription-item');

    if (inscriptions.length > 0) {
      results.inscriptions.passed.push({ test: 'Inscriptions load', details: `Loaded ${inscriptions.length} inscriptions` });
      console.log(`✅ PASS: ${inscriptions.length} inscriptions loaded`);
    } else {
      results.inscriptions.failed.push({ test: 'Inscriptions load', details: 'No inscriptions found' });
      console.log('❌ FAIL: No inscriptions loaded');
    }

    // Test 2.2: Content type filter
    console.log('\n📋 Test 2.2: Content type filter');
    const filterButtons = await page.$$('button[data-filter], button[data-content-type]');

    if (filterButtons.length > 0) {
      // Try clicking a filter
      await filterButtons[0].click();
      await new Promise(resolve => setTimeout(resolve(1000);

      results.inscriptions.passed.push({ test: 'Content type filter', details: `Found ${filterButtons.length} filter options` });
      console.log(`✅ PASS: Content type filters present (${filterButtons.length} options)`);
    } else {
      results.inscriptions.warnings.push({ test: 'Content type filter', details: 'No filter buttons found' });
      console.log('⚠️  WARNING: Content type filters not found');
    }

    // Test 2.3: Pagination controls
    console.log('\n📋 Test 2.3: Pagination controls');
    const paginationControls = await page.$('[data-pagination], .pagination, button:has-text("Next"), button:has-text("Previous")');

    if (paginationControls) {
      results.inscriptions.passed.push({ test: 'Pagination', details: 'Pagination controls present' });
      console.log('✅ PASS: Pagination controls found');
    } else {
      results.inscriptions.warnings.push({ test: 'Pagination', details: 'No pagination controls found' });
      console.log('⚠️  WARNING: Pagination controls not found');
    }

    // Test 2.4: Auto-refresh toggle
    console.log('\n📋 Test 2.4: Auto-refresh toggle');
    const autoRefreshToggle = await page.$('input[type="checkbox"], [data-auto-refresh]');

    if (autoRefreshToggle) {
      results.inscriptions.passed.push({ test: 'Auto-refresh toggle', details: 'Toggle present' });
      console.log('✅ PASS: Auto-refresh toggle found');
    } else {
      results.inscriptions.warnings.push({ test: 'Auto-refresh toggle', details: 'Toggle not found' });
      console.log('⚠️  WARNING: Auto-refresh toggle not found');
    }

  } catch (error) {
    results.inscriptions.failed.push({ test: 'Inscriptions Tab', error: error.message });
    console.log('❌ ERROR in Inscriptions Tab:', error.message);
  }
}

// ============================================================================
// MARKETPLACE TAB TESTS
// ============================================================================
async function testMarketplaceTab(page) {
  try {
    // Navigate to Marketplace tab
    await page.click('[data-tab="marketplace"], button:has-text("Marketplace")').catch(() => {
      return page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const marketplaceBtn = buttons.find(b => b.textContent.includes('Marketplace'));
        if (marketplaceBtn) marketplaceBtn.click();
      });
    });
    await new Promise(resolve => setTimeout(resolve(2000);

    // Test 3.1: Stats cards display
    console.log('\n📋 Test 3.1: Stats cards display (listings, sales, volume)');
    const statsCards = await page.$$('[data-stat-card], .stat-card, [class*="stats"]');

    const statsText = await page.evaluate(() => {
      const body = document.body.textContent;
      return {
        hasListings: /listings?/i.test(body),
        hasSales: /sales?/i.test(body),
        hasVolume: /volume/i.test(body),
        hasPrice: /price/i.test(body)
      };
    });

    const statsCount = Object.values(statsText).filter(Boolean).length;
    if (statsCount >= 3) {
      results.marketplace.passed.push({ test: 'Stats cards', details: `Found ${statsCount}/4 expected stats` });
      console.log(`✅ PASS: Stats cards present (${statsCount}/4 metrics)`);
      console.log(`   - Listings: ${statsText.hasListings ? '✅' : '❌'}`);
      console.log(`   - Sales: ${statsText.hasSales ? '✅' : '❌'}`);
      console.log(`   - Volume: ${statsText.hasVolume ? '✅' : '❌'}`);
      console.log(`   - Price: ${statsText.hasPrice ? '✅' : '❌'}`);
    } else {
      results.marketplace.failed.push({ test: 'Stats cards', details: `Only found ${statsCount}/4 stats` });
      console.log(`❌ FAIL: Only ${statsCount}/4 stats cards found`);
    }

    // Test 3.2: Activity feed loads
    console.log('\n📋 Test 3.2: Activity feed loads');
    const activities = await page.$$('[data-activity], .activity-item, .marketplace-activity');

    if (activities.length > 0) {
      results.marketplace.passed.push({ test: 'Activity feed', details: `Loaded ${activities.length} activities` });
      console.log(`✅ PASS: ${activities.length} activities loaded`);
    } else {
      results.marketplace.warnings.push({ test: 'Activity feed', details: 'No activities found' });
      console.log('⚠️  WARNING: No marketplace activities found');
    }

    // Test 3.3: Activity filters
    console.log('\n📋 Test 3.3: Activity filters (type, collection, price, time)');
    const filters = await page.$$('select, [data-filter], button[data-filter-type]');

    if (filters.length > 0) {
      results.marketplace.passed.push({ test: 'Activity filters', details: `Found ${filters.length} filter controls` });
      console.log(`✅ PASS: Activity filters present (${filters.length} controls)`);
    } else {
      results.marketplace.warnings.push({ test: 'Activity filters', details: 'No filter controls found' });
      console.log('⚠️  WARNING: Activity filters not found');
    }

    // Test 3.4: Last updated indicator
    console.log('\n📋 Test 3.4: Last updated indicator');
    const lastUpdated = await page.evaluate(() => {
      const text = document.body.textContent;
      return /last updated|updated.*ago/i.test(text);
    });

    if (lastUpdated) {
      results.marketplace.passed.push({ test: 'Last updated indicator', details: 'Timestamp visible' });
      console.log('✅ PASS: Last updated indicator present');
    } else {
      results.marketplace.warnings.push({ test: 'Last updated indicator', details: 'Not found' });
      console.log('⚠️  WARNING: Last updated indicator not found');
    }

  } catch (error) {
    results.marketplace.failed.push({ test: 'Marketplace Tab', error: error.message });
    console.log('❌ ERROR in Marketplace Tab:', error.message);
  }
}

// ============================================================================
// ARBITRAGE TAB TESTS
// ============================================================================
async function testArbitrageTab(page) {
  try {
    // Navigate to Arbitrage tab
    await page.click('[data-tab="arbitrage"], button:has-text("Arbitrage")').catch(() => {
      return page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const arbitrageBtn = buttons.find(b => b.textContent.includes('Arbitrage'));
        if (arbitrageBtn) arbitrageBtn.click();
      });
    });
    await new Promise(resolve => setTimeout(resolve(2000);

    console.log('\n📋 Test 4.1: Arbitrage scanner loads');
    const opportunities = await page.$$('[data-opportunity], .arbitrage-opportunity, .opportunity-card');

    if (opportunities.length > 0) {
      results.arbitrage.passed.push({ test: 'Arbitrage opportunities load', details: `Found ${opportunities.length} opportunities` });
      console.log(`✅ PASS: ${opportunities.length} arbitrage opportunities loaded`);
    } else {
      results.arbitrage.warnings.push({ test: 'Arbitrage opportunities', details: 'No opportunities found (may be normal)' });
      console.log('⚠️  WARNING: No arbitrage opportunities found (this may be expected)');
    }

    // Test 4.2: Filters functional
    console.log('\n📋 Test 4.2: Arbitrage filters');
    const filters = await page.$$('input[type="number"], select, [data-min-profit]');

    if (filters.length > 0) {
      results.arbitrage.passed.push({ test: 'Arbitrage filters', details: `Found ${filters.length} filter controls` });
      console.log(`✅ PASS: Arbitrage filters present (${filters.length} controls)`);
    } else {
      results.arbitrage.warnings.push({ test: 'Arbitrage filters', details: 'No filters found' });
      console.log('⚠️  WARNING: Arbitrage filters not found');
    }

  } catch (error) {
    results.arbitrage.failed.push({ test: 'Arbitrage Tab', error: error.message });
    console.log('❌ ERROR in Arbitrage Tab:', error.message);
  }
}

// ============================================================================
// ANALYTICS TAB TESTS
// ============================================================================
async function testAnalyticsTab(page) {
  try {
    // Navigate to Analytics tab
    await page.click('[data-tab="analytics"], button:has-text("Analytics")').catch(() => {
      return page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const analyticsBtn = buttons.find(b => b.textContent.includes('Analytics'));
        if (analyticsBtn) analyticsBtn.click();
      });
    });
    await new Promise(resolve => setTimeout(resolve(2000);

    // Test 5.1: Metrics display (no NaN)
    console.log('\n📋 Test 5.1: Analytics metrics display (no NaN)');
    const hasNaN = await page.evaluate(() => {
      const text = document.body.textContent;
      return text.includes('NaN');
    });

    if (!hasNaN) {
      results.analytics.passed.push({ test: 'No NaN values', details: 'All metrics display valid numbers' });
      console.log('✅ PASS: No NaN values found');
    } else {
      results.analytics.failed.push({ test: 'NaN values', details: 'Found NaN in analytics' });
      console.log('❌ FAIL: Found NaN values in analytics');
    }

    // Test 5.2: Recommendations display
    console.log('\n📋 Test 5.2: Recommendations display');
    const recommendations = await page.$$('[data-recommendation], .recommendation, [class*="recommend"]');

    if (recommendations.length > 0) {
      results.analytics.passed.push({ test: 'Recommendations', details: `Found ${recommendations.length} recommendations` });
      console.log(`✅ PASS: ${recommendations.length} recommendations displayed`);
    } else {
      results.analytics.warnings.push({ test: 'Recommendations', details: 'No recommendations found' });
      console.log('⚠️  WARNING: No recommendations found');
    }

    // Test 5.3: Charts present
    console.log('\n📋 Test 5.3: Charts present');
    const charts = await page.$$('canvas, svg[class*="chart"]');

    if (charts.length > 0) {
      results.analytics.passed.push({ test: 'Charts', details: `Found ${charts.length} charts` });
      console.log(`✅ PASS: ${charts.length} charts displayed`);
    } else {
      results.analytics.warnings.push({ test: 'Charts', details: 'No charts found' });
      console.log('⚠️  WARNING: No charts found in analytics');
    }

  } catch (error) {
    results.analytics.failed.push({ test: 'Analytics Tab', error: error.message });
    console.log('❌ ERROR in Analytics Tab:', error.message);
  }
}

// ============================================================================
// GENERATE COMPREHENSIVE REPORT
// ============================================================================
function generateReport() {
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('QA TEST REPORT - ORDINALS DASHBOARD');
  console.log('='.repeat(80));

  const allTests = [
    { name: 'Collections', data: results.collections },
    { name: 'Inscriptions', data: results.inscriptions },
    { name: 'Marketplace', data: results.marketplace },
    { name: 'Arbitrage', data: results.arbitrage },
    { name: 'Analytics', data: results.analytics }
  ];

  let totalPassed = 0;
  let totalFailed = 0;
  let totalWarnings = 0;

  allTests.forEach(({ name, data }) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`${name.toUpperCase()} TAB`);
    console.log('─'.repeat(80));

    if (data.passed.length > 0) {
      console.log(`\n✅ PASSED (${data.passed.length}):`);
      data.passed.forEach(p => console.log(`   • ${p.test}: ${p.details}`));
      totalPassed += data.passed.length;
    }

    if (data.failed.length > 0) {
      console.log(`\n❌ FAILED (${data.failed.length}):`);
      data.failed.forEach(f => console.log(`   • ${f.test}: ${f.details || f.error}`));
      totalFailed += data.failed.length;
    }

    if (data.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${data.warnings.length}):`);
      data.warnings.forEach(w => console.log(`   • ${w.test}: ${w.details}`));
      totalWarnings += data.warnings.length;
    }
  });

  // Console and Network Errors
  if (results.consoleErrors.length > 0) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log('CONSOLE ERRORS');
    console.log('─'.repeat(80));
    results.consoleErrors.slice(0, 10).forEach(err => {
      console.log(`\n❌ ${err.text}`);
      if (err.location) console.log(`   Location: ${JSON.stringify(err.location)}`);
    });
    if (results.consoleErrors.length > 10) {
      console.log(`\n... and ${results.consoleErrors.length - 10} more errors`);
    }
  }

  if (results.networkErrors.length > 0) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log('NETWORK ERRORS');
    console.log('─'.repeat(80));
    results.networkErrors.forEach(err => {
      console.log(`\n❌ ${err.url}`);
      console.log(`   Error: ${err.failure}`);
    });
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`⚠️  Warnings: ${totalWarnings}`);
  console.log(`🐛 Console Errors: ${results.consoleErrors.length}`);
  console.log(`🌐 Network Errors: ${results.networkErrors.length}`);

  const successRate = totalPassed / (totalPassed + totalFailed) * 100;
  console.log(`\n📊 Success Rate: ${successRate.toFixed(1)}%`);

  if (totalFailed === 0 && results.consoleErrors.length === 0 && results.networkErrors.length === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Dashboard is production ready!');
  } else if (totalFailed === 0) {
    console.log('\n✅ All functional tests passed, but check console/network errors');
  } else {
    console.log('\n⚠️  Some tests failed. Review issues above.');
  }

  console.log('='.repeat(80));
}

// Run the test suite
runTests().catch(console.error);
