/**
 * Test script to verify Playwright can scrape a specific Google News URL
 * Usage: npx tsx scripts/test-specific-url.ts <url>
 */

import 'dotenv/config';
import { PlaywrightHttpGateway } from '../src/gateways/http/playwright';
import { logger } from '../src/utils/logger';

const testUrl = process.argv[2] || 'https://news.google.com/rss/articles/CBMiuAFBVV95cUxQRkdGbldZT01Ca1oyZFhybWgzYUlTU2RMUEJMVy1ybzh1M1E3S3NHNnN4d0tNVVhXNENDaWRIb0oySjZUeVNrdWNIclBfX0NKazZzNjIzQk9wS0V6ZjdNU2p1bjRBOG5BMlJadW5rTHBTN01CeXhyQldxNFlGcWE2RGx1Z3p0cmJhQjZPamN0bFh4aGxFVDBkVEdKYlUtZ2cxYTNQYlM4bW9WUm4wYzlyZEFmeUg1TTRN?oc=5';

async function testSpecificUrl() {
  console.log('🧪 Testing Playwright scrape for specific URL...\n');
  console.log(`URL: ${testUrl}\n`);
  console.log('='.repeat(80));
  console.log('');

  const gateway = new PlaywrightHttpGateway();

  try {
    console.log('1. Initializing Playwright...');
    const initStart = Date.now();
    await gateway.initialize();
    const initTime = Date.now() - initStart;
    console.log(`✅ Playwright initialized in ${initTime}ms\n`);

    console.log('2. Fetching URL with Playwright...');
    const startTime = Date.now();
    const response = await gateway.fetch({
      url: testUrl,
      timeout: 60000, // 60 second timeout for Lambda
    });
    const latencyMs = Date.now() - startTime;

    console.log(`✅ Fetch completed in ${latencyMs}ms\n`);
    console.log('Response details:');
    console.log(`  - Status: ${response.status}`);
    console.log(`  - Original URL: ${testUrl}`);
    console.log(`  - Final URL: ${response.url}`);
    console.log(`  - Redirected: ${response.url !== testUrl ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Body length: ${response.body.length} characters\n`);

    // Extract text content
    const textContent = response.body
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('📄 Extracted text content (first 2000 chars):');
    console.log('─'.repeat(80));
    console.log(textContent.substring(0, 2000));
    if (textContent.length > 2000) {
      console.log(`\n... (${textContent.length - 2000} more characters)`);
    }
    console.log('─'.repeat(80));
    console.log('');

    // Check if we got actual content or just "Google News"
    const lowerContent = textContent.toLowerCase();
    const isGoogleNewsOnly = lowerContent.includes('google news') && 
                            (lowerContent.length < 300 || 
                             lowerContent.split('google news').length > 5);
    
    if (isGoogleNewsOnly) {
      console.log('❌ WARNING: Only got "Google News" content - Playwright may not have followed redirects\n');
      console.log('This suggests the scraper is not working correctly.\n');
    } else if (textContent.length > 500) {
      console.log('✅ SUCCESS: Got substantial content - Playwright is working!\n');
      console.log(`Content length: ${textContent.length} characters\n`);
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

    // Check for article content indicators
    const hasArticleTags = /<article/i.test(response.body) || 
                          /<main/i.test(response.body) ||
                          /class=["'][^"']*article[^"']*["']/i.test(response.body);
    
    if (hasArticleTags) {
      console.log('✅ Found article HTML tags - good sign!\n');
    }

    await gateway.close();
    console.log('✅ Test completed successfully');
    console.log('='.repeat(80));

    // Return success/failure
    return {
      success: !isGoogleNewsOnly && textContent.length > 500,
      contentLength: textContent.length,
      redirected: response.url !== testUrl,
      latencyMs,
    };

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    try {
      await gateway.close();
    } catch (closeError) {
      // Ignore close errors
    }
    throw error;
  }
}

// Run if called directly
testSpecificUrl()
  .then((result) => {
    if (result.success) {
      console.log('\n✅ Overall test result: SUCCESS');
      process.exit(0);
    } else {
      console.log('\n⚠️  Overall test result: PARTIAL SUCCESS');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.log('\n❌ Overall test result: FAILED');
    process.exit(1);
  });

export { testSpecificUrl };

