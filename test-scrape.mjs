#!/usr/bin/env node
/**
 * Standalone Scrape Test
 * Tests scraping of Google News URLs with both Playwright and NodeFetch
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';

// Test URLs from Google News RSS
const TEST_URLS = [
  'https://news.google.com/rss/articles/CBMirwFBVV95cUxPNEFYdEZvZEl5QkRUWXEweHVjRzY5MjBkNy14MEFjM1NrOTI3QS1hUXREZWlkVUZJb0xlQlFRcGpFbS13R2JCT2prbi03bmR2d2JjZWVVTzFqbEVFX1FXeFBkSkFPTFBERVlla0MxTFN4NXdaOEpXTGdNSlZCWmJBbnBsWVFDX0F0V0JwcFkzaEt4ZTc2aW5pdXN3ckxjYlhRNEw2bkNrVUo2cHZPVEpv?oc=5',
  'https://news.google.com/rss/articles/CBMijwFBVV95cUxPdUs3Z0RSWkdldlZ6RUc5aFNIMi0tbGRvMks3M1p4Zkxrcm9nOHhGMzEwUkozWF9YZU1ubXVOeXVEWmV4ZnUtQllMcHUtUUdmRnZDR2gtb190dEpMM2h0SEMyVmc5cjAyUDZ6cDhPd2lFa0t3N1NTZHlfZE1VTjBFR2ZzSGxTUzBzTWRJOGNNQQ?oc=5',
  'https://news.google.com/rss/articles/CBMiuAFBVV95cUxQUExTR1ZCMTFPSjBPT05sYmdvYTd6UVdkNmc3VU0tTFNjM095NW93bjFidV9PWFhYNmtSbkI2cmlTSnRkYW43VFcxVlVrT2Y0RURHVlZrdGNVcFE0WWVTUXJSaWg2bnJqek16dVREVXRVT2trbWkyaWp5OUdvczRjRHpsZzRVZmZwWlBiTVpJLVNGVnBkQl81QXZGN2FickU3aEswcjg2NEd3Y2lod25HOFRlVmU5M0h3?oc=5',
];

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  🧪 STANDALONE SCRAPE TEST                                   ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Test 1: NodeFetch (simple HTTP)
async function testNodeFetch(url) {
  console.log(`\n📡 Testing NodeFetch: ${url.substring(0, 80)}...`);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });
    
    const body = await response.text();
    const finalUrl = response.url;
    
    console.log(`  ✅ Status: ${response.status}`);
    console.log(`  📍 Final URL: ${finalUrl.substring(0, 80)}...`);
    console.log(`  📊 Content length: ${body.length} chars`);
    console.log(`  📝 Preview: ${body.substring(0, 200).replace(/\s+/g, ' ')}...`);
    
    return {
      method: 'NodeFetch',
      success: true,
      finalUrl,
      contentLength: body.length,
      preview: body.substring(0, 500),
    };
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`);
    return { method: 'NodeFetch', success: false, error: error.message };
  }
}

// Test 2: Playwright (browser-based)
async function testPlaywright(url) {
  console.log(`\n🎭 Testing Playwright: ${url.substring(0, 80)}...`);
  
  let browser;
  let page;
  
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    
    console.log('  🔄 Loading page (networkidle)...');
    await page.goto(url, {
      timeout: 30000,
      waitUntil: 'networkidle',
    });
    
    // Extra wait for JS redirects
    console.log('  ⏱️  Waiting 2s for JS redirects...');
    await page.waitForTimeout(2000);
    
    const finalUrl = page.url();
    const body = await page.content();
    
    console.log(`  ✅ Final URL: ${finalUrl.substring(0, 80)}...`);
    console.log(`  📊 Content length: ${body.length} chars`);
    console.log(`  📝 Preview: ${body.substring(0, 200).replace(/\s+/g, ' ')}...`);
    
    await browser.close();
    
    return {
      method: 'Playwright',
      success: true,
      finalUrl,
      contentLength: body.length,
      preview: body.substring(0, 500),
    };
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`);
    if (browser) await browser.close();
    return { method: 'Playwright', success: false, error: error.message };
  }
}

// Run tests
async function main() {
  const results = [];
  
  for (const url of TEST_URLS) {
    console.log('\n' + '─'.repeat(64));
    console.log(`Testing URL ${TEST_URLS.indexOf(url) + 1}/${TEST_URLS.length}`);
    console.log('─'.repeat(64));
    
    const nodeFetchResult = await testNodeFetch(url);
    results.push(nodeFetchResult);
    
    const playwrightResult = await testPlaywright(url);
    results.push(playwrightResult);
    
    // Compare
    console.log('\n📊 COMPARISON:');
    if (nodeFetchResult.success && playwrightResult.success) {
      console.log(`  NodeFetch:  ${nodeFetchResult.contentLength} chars`);
      console.log(`  Playwright: ${playwrightResult.contentLength} chars`);
      
      if (playwrightResult.contentLength > nodeFetchResult.contentLength * 2) {
        console.log('  ✅ Playwright got significantly more content (likely followed redirect)');
      } else if (nodeFetchResult.contentLength > 1000) {
        console.log('  ✅ Both methods got substantial content');
      } else {
        console.log('  ⚠️  Both methods got minimal content (likely still redirect pages)');
      }
    }
  }
  
  // Save results
  await fs.writeFile('test-scrape-results.json', JSON.stringify(results, null, 2));
  console.log('\n\n✅ Results saved to test-scrape-results.json');
  
  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  📊 SUMMARY                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const nodeFetchResults = results.filter(r => r.method === 'NodeFetch');
  const playwrightResults = results.filter(r => r.method === 'Playwright');
  
  const nodeFetchSuccess = nodeFetchResults.filter(r => r.success).length;
  const playwrightSuccess = playwrightResults.filter(r => r.success).length;
  
  console.log(`NodeFetch:  ${nodeFetchSuccess}/${nodeFetchResults.length} successful`);
  console.log(`Playwright: ${playwrightSuccess}/${playwrightResults.length} successful`);
  
  const avgNodeFetch = nodeFetchResults
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.contentLength, 0) / nodeFetchSuccess || 0;
  const avgPlaywright = playwrightResults
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.contentLength, 0) / playwrightSuccess || 0;
  
  console.log(`\nAverage content length:`);
  console.log(`  NodeFetch:  ${Math.round(avgNodeFetch)} chars`);
  console.log(`  Playwright: ${Math.round(avgPlaywright)} chars`);
  
  if (avgPlaywright > 5000) {
    console.log('\n✅✅✅ Playwright is working - getting real article content!');
  } else if (avgNodeFetch > 5000) {
    console.log('\n✅ NodeFetch is working - simple redirects being followed!');
  } else {
    console.log('\n❌ Both methods failing - Google News redirects are blocked');
    console.log('   Recommendation: Use alternative news sources or demo articles');
  }
}

main().catch(console.error);

