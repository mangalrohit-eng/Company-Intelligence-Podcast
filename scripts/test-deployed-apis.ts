/**
 * Automated API Testing Script
 * Tests all deployed endpoints with REAL AWS & OpenAI APIs
 */

import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = 'https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com';
const TEST_RESULTS_FILE = './api-test-results.json';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(test: string, status: 'PASS' | 'FAIL' | 'SKIP', duration: number, details?: any, error?: string) {
  results.push({ test, status, duration, error, details });
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} ${test}: ${status} (${duration}ms)`);
  if (error) console.log(`   Error: ${error}`);
  if (details) console.log(`   Details:`, JSON.stringify(details, null, 2));
}

async function test1_HealthCheck() {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    const duration = Date.now() - start;
    
    if (response.status === 404 || response.status === 403) {
      // Expected - no root endpoint
      logTest('API Gateway Reachable', 'PASS', duration, { status: response.status });
    } else {
      logTest('API Gateway Reachable', 'PASS', duration, { status: response.status });
    }
  } catch (error: any) {
    logTest('API Gateway Reachable', 'FAIL', Date.now() - start, undefined, error.message);
  }
}

async function test2_CompetitorSuggestionsWithoutAuth() {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE_URL}/competitors/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName: 'Tesla' })
    });
    
    const duration = Date.now() - start;
    const data = await response.json();
    
    if (response.ok && data.competitors && data.competitors.length > 0) {
      logTest('Competitor Suggestions API (No Auth)', 'PASS', duration, {
        competitors: data.competitors,
        tokensUsed: data.tokensUsed
      });
    } else {
      logTest('Competitor Suggestions API (No Auth)', 'FAIL', duration, data, `Status: ${response.status}`);
    }
  } catch (error: any) {
    logTest('Competitor Suggestions API (No Auth)', 'FAIL', Date.now() - start, undefined, error.message);
  }
}

async function test3_CompetitorSuggestionsVariousCompanies() {
  const companies = ['Microsoft', 'Starbucks', 'Nike', 'Toyota'];
  
  for (const company of companies) {
    const start = Date.now();
    try {
      const response = await fetch(`${API_BASE_URL}/competitors/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: company })
      });
      
      const duration = Date.now() - start;
      const data = await response.json();
      
      if (response.ok && data.competitors && data.competitors.length >= 4) {
        logTest(`Competitor AI: ${company}`, 'PASS', duration, {
          competitors: data.competitors.slice(0, 3),
          count: data.competitors.length
        });
      } else {
        logTest(`Competitor AI: ${company}`, 'FAIL', duration, data);
      }
    } catch (error: any) {
      logTest(`Competitor AI: ${company}`, 'FAIL', Date.now() - start, undefined, error.message);
    }
  }
}

async function test4_VoicePreview() {
  const voices = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'];
  
  for (const voiceId of voices) {
    const start = Date.now();
    try {
      const response = await fetch(`${API_BASE_URL}/voice/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId })
      });
      
      const duration = Date.now() - start;
      
      if (response.ok && response.headers.get('content-type')?.includes('audio')) {
        const buffer = await response.arrayBuffer();
        const audioSize = buffer.byteLength;
        
        logTest(`Voice Preview: ${voiceId}`, 'PASS', duration, {
          audioSize: `${(audioSize / 1024).toFixed(1)} KB`,
          contentType: response.headers.get('content-type')
        });
      } else {
        const text = await response.text();
        logTest(`Voice Preview: ${voiceId}`, 'FAIL', duration, { body: text }, `Status: ${response.status}`);
      }
    } catch (error: any) {
      logTest(`Voice Preview: ${voiceId}`, 'FAIL', Date.now() - start, undefined, error.message);
    }
  }
}

async function test5_ListPodcastsWithoutAuth() {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE_URL}/podcasts`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const duration = Date.now() - start;
    const data = await response.json();
    
    if (response.status === 401) {
      logTest('List Podcasts (No Auth) → 401', 'PASS', duration, { message: 'Correctly requires auth' });
    } else if (response.ok) {
      logTest('List Podcasts (No Auth) → 401', 'FAIL', duration, data, 'Should require auth but returned 200');
    } else {
      logTest('List Podcasts (No Auth) → 401', 'FAIL', duration, data, `Unexpected status: ${response.status}`);
    }
  } catch (error: any) {
    logTest('List Podcasts (No Auth) → 401', 'FAIL', Date.now() - start, undefined, error.message);
  }
}

async function test6_CreatePodcastWithoutAuth() {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE_URL}/podcasts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Podcast',
        companyId: 'Test Company',
        competitors: ['Comp1', 'Comp2']
      })
    });
    
    const duration = Date.now() - start;
    const data = await response.json();
    
    if (response.status === 401) {
      logTest('Create Podcast (No Auth) → 401', 'PASS', duration, { message: 'Correctly requires auth' });
    } else if (response.ok) {
      logTest('Create Podcast (No Auth) → 401', 'FAIL', duration, data, 'Should require auth but returned 200');
    } else {
      logTest('Create Podcast (No Auth) → 401', 'FAIL', duration, data, `Unexpected status: ${response.status}`);
    }
  } catch (error: any) {
    logTest('Create Podcast (No Auth) → 401', 'FAIL', Date.now() - start, undefined, error.message);
  }
}

async function test7_ListRunsWithoutAuth() {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE_URL}/runs`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const duration = Date.now() - start;
    
    if (response.status === 401) {
      logTest('List Runs (No Auth) → 401', 'PASS', duration, { message: 'Correctly requires auth' });
    } else {
      const data = await response.json();
      logTest('List Runs (No Auth) → 401', 'FAIL', duration, data, `Expected 401, got ${response.status}`);
    }
  } catch (error: any) {
    logTest('List Runs (No Auth) → 401', 'FAIL', Date.now() - start, undefined, error.message);
  }
}

async function runAllTests() {
  console.log('🧪 AUTOMATED API TESTING - REAL AWS & OpenAI APIs\n');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('📡 Testing API Gateway...');
  await test1_HealthCheck();
  console.log('');
  
  console.log('🤖 Testing OpenAI Competitor Suggestions...');
  await test2_CompetitorSuggestionsWithoutAuth();
  await test3_CompetitorSuggestionsVariousCompanies();
  console.log('');
  
  console.log('🎙️  Testing OpenAI Voice Preview...');
  await test4_VoicePreview();
  console.log('');
  
  console.log('🔒 Testing Authentication Enforcement...');
  await test5_ListPodcastsWithoutAuth();
  await test6_CreatePodcastWithoutAuth();
  await test7_ListRunsWithoutAuth();
  console.log('');
  
  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('');
  
  if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.test}: ${r.error || 'See details above'}`);
    });
    console.log('');
  }
  
  // Save results
  fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`📄 Full results saved to: ${TEST_RESULTS_FILE}\n`);
  
  console.log('═══════════════════════════════════════════════════\n');
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! APIs are working with REAL OpenAI & AWS!\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Review errors above.\n`);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});

