/**
 * Test: competitors/suggest.ts
 * Tests AI-powered competitor suggestion API
 */

import { handler } from '../../src/api/competitors/suggest';
import { createMockEvent, testLambdaFunction, TestResult } from './test-infrastructure';

export async function testCompetitorsSuggest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n' + '='.repeat(80));
  console.log('TESTING: competitors/suggest.ts');
  console.log('='.repeat(80));

  // Test 1: Valid request with company name
  results.push(
    await testLambdaFunction(
      'competitors/suggest - Valid Request',
      handler,
      createMockEvent('POST', '/competitors/suggest', {
        body: {
          companyName: 'Microsoft',
        },
      })
    )
  );

  // Test 2: Missing company name
  results.push(
    await testLambdaFunction(
      'competitors/suggest - Missing Company Name',
      handler,
      createMockEvent('POST', '/competitors/suggest', {
        body: {},
      })
    )
  );

  // Test 3: Empty company name
  results.push(
    await testLambdaFunction(
      'competitors/suggest - Empty Company Name',
      handler,
      createMockEvent('POST', '/competitors/suggest', {
        body: {
          companyName: '',
        },
      })
    )
  );

  // Test 4: Very short company name
  results.push(
    await testLambdaFunction(
      'competitors/suggest - Short Company Name',
      handler,
      createMockEvent('POST', '/competitors/suggest', {
        body: {
          companyName: 'A',
        },
      })
    )
  );

  // Test 5: Special characters in company name
  results.push(
    await testLambdaFunction(
      'competitors/suggest - Special Characters',
      handler,
      createMockEvent('POST', '/competitors/suggest', {
        body: {
          companyName: 'AT&T',
        },
      })
    )
  );

  return results;
}

