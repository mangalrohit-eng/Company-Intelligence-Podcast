/**
 * Test: runs/create.ts
 * Tests podcast run creation and Step Functions execution
 */

import { handler } from '../../src/api/runs/create';
import { createMockEvent, testLambdaFunction, TestResult } from './test-infrastructure';

export async function testRunsCreate(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n' + '='.repeat(80));
  console.log('TESTING: runs/create.ts');
  console.log('='.repeat(80));

  // Test 1: Valid request with existing podcast
  results.push(
    await testLambdaFunction(
      'runs/create - Valid Request',
      handler,
      createMockEvent('POST', '/podcasts/test-podcast-123/runs', {
        pathParameters: {
          id: 'test-podcast-123',
        },
        body: {
          flags: {
            dryRun: true,
            provider: {
              llm: 'replay',
              tts: 'stub',
              http: 'replay',
            },
          },
        },
        userId: 'test-user-123',
        orgId: 'test-org-456',
      })
    )
  );

  // Test 2: Missing podcast ID
  results.push(
    await testLambdaFunction(
      'runs/create - Missing Podcast ID',
      handler,
      createMockEvent('POST', '/podcasts//runs', {
        pathParameters: {},
        userId: 'test-user-123',
        orgId: 'test-org-456',
      })
    )
  );

  // Test 3: Missing authentication
  results.push(
    await testLambdaFunction(
      'runs/create - Missing Authentication',
      handler,
      createMockEvent('POST', '/podcasts/test-podcast-123/runs', {
        pathParameters: {
          id: 'test-podcast-123',
        },
      })
    )
  );

  // Test 4: Non-existent podcast
  results.push(
    await testLambdaFunction(
      'runs/create - Non-existent Podcast',
      handler,
      createMockEvent('POST', '/podcasts/non-existent-podcast/runs', {
        pathParameters: {
          id: 'non-existent-podcast',
        },
        userId: 'test-user-123',
        orgId: 'test-org-456',
      })
    )
  );

  // Test 5: Unauthorized access (different org)
  results.push(
    await testLambdaFunction(
      'runs/create - Unauthorized Access',
      handler,
      createMockEvent('POST', '/podcasts/test-podcast-123/runs', {
        pathParameters: {
          id: 'test-podcast-123',
        },
        userId: 'different-user-999',
        orgId: 'different-org-999',
      })
    )
  );

  return results;
}

