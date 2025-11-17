/**
 * Test: podcasts/list.ts
 * Tests podcast listing with authentication
 */

import { handler } from '../../src/api/podcasts/list';
import { createMockEvent, testLambdaFunction, TestResult } from './test-infrastructure';

export async function testPodcastsList(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n' + '='.repeat(80));
  console.log('TESTING: podcasts/list.ts');
  console.log('='.repeat(80));

  // Test 1: Valid authenticated request
  results.push(
    await testLambdaFunction(
      'podcasts/list - Valid Authenticated Request',
      handler,
      createMockEvent('GET', '/podcasts', {
        userId: 'test-user-123',
        orgId: 'test-org-456',
      })
    )
  );

  // Test 2: Missing authentication
  results.push(
    await testLambdaFunction(
      'podcasts/list - Missing Authentication',
      handler,
      createMockEvent('GET', '/podcasts', {})
    )
  );

  // Test 3: Legacy user without org_id (auto-generation)
  results.push(
    await testLambdaFunction(
      'podcasts/list - Legacy User Auto-OrgId',
      handler,
      createMockEvent('GET', '/podcasts', {
        userId: 'legacy-user-789',
        // No orgId - should auto-generate
      })
    )
  );

  // Test 4: Different user's podcasts
  results.push(
    await testLambdaFunction(
      'podcasts/list - Different User',
      handler,
      createMockEvent('GET', '/podcasts', {
        userId: 'different-user-999',
        orgId: 'different-org-999',
      })
    )
  );

  return results;
}

