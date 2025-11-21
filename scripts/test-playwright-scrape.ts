/**
 * Test script to verify Playwright can scrape Google News URLs
 */

import 'dotenv/config';
import { PlaywrightHttpGateway } from '../src/gateways/http/playwright';
import { logger } from '../src/utils/logger';

const testUrl = 'https://news.google.com/rss/articles/CBMingFBVV95cUxORTBFWm5YS3VzZ2VremNZMjVNbjRrTG95RE0teDROU2UwbWp6LUNzY0o4TmpHbTBzZ0Naa2tsLS02bXRFSk1PTWZQNFh1RFFBc1dYVl9NYmxZc0t3YmxtaURxQmJoMVlEUWFxbXNlSE1kbURiYngyckFlRllXNkRDUXFBR25aQUxrTHd3dFRGTkptVzdkS0lrOG1WWHh3dw?oc=5';

async function testPlaywrightScrape() {
  console.log('🧪 Testing Playwright scrape for Google News URL...\n');
  console.log(`URL: ${testUrl}\n`);

  const gateway = new PlaywrightHttpGateway();

  try {
    console.log('1. Initializing Playwright...');
    await gateway.initialize();
    console.log('✅ Playwright initialized\n');

    console.log('2. Fetching URL with Playwright...');
    const startTime = Date.now();
    const response = await gateway.fetch({
      url: testUrl,
      timeout: 30000,
    });
    const latencyMs = Date.now() - startTime;

    console.log(`✅ Fetch completed in ${latencyMs}ms\n`);
    console.log('Response details:');
    console.log(`  - Status: ${response.status}`);
    console.log(`  - Final URL: ${response.url}`);
    console.log(`  - Redirected: ${response.url !== testUrl}`);
    console.log(`  - Body length: ${response.body.length} characters\n`);

    // Extract text content
    const textContent = response.body
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000);

    console.log('📄 Extracted text content (first 1000 chars):');
    console.log('─'.repeat(80));
    console.log(textContent);
    console.log('─'.repeat(80));
    console.log('');

    // Check if we got actual content or just "Google News"
    if (textContent.toLowerCase().includes('google news') && textContent.length < 200) {
      console.log('❌ WARNING: Only got "Google News" content - Playwright may not have followed redirects\n');
    } else if (textContent.length > 200) {
      console.log('✅ SUCCESS: Got substantial content - Playwright is working!\n');
    } else {
      console.log('⚠️  Got minimal content - may need to adjust wait times\n');
    }

    // Try to find article title
    const titleMatch = response.body.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      console.log(`📰 Page title: ${titleMatch[1]}\n`);
    }

    // Try to find canonical URL or og:url
    const canonicalMatch = response.body.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    const ogUrlMatch = response.body.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
    
    if (canonicalMatch && !canonicalMatch[1].includes('news.google.com')) {
      console.log(`🔗 Canonical URL: ${canonicalMatch[1]}\n`);
    } else if (ogUrlMatch && !ogUrlMatch[1].includes('news.google.com')) {
      console.log(`🔗 OG URL: ${ogUrlMatch[1]}\n`);
    }

    await gateway.close();
    console.log('✅ Test completed successfully');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
    try {
      await gateway.close();
    } catch (closeError) {
      // Ignore close errors
    }
    process.exit(1);
  }
}

testPlaywrightScrape();

