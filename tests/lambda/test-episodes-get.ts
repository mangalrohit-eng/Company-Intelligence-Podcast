/**
 * Test: episodes/get.ts
 * Tests episode retrieval with S3 presigned URLs
 */

import { handler } from '../../src/api/episodes/get';
import { createMockEvent, testLambdaFunction, TestResult } from './test-infrastructure';

export async function testEpisodesGet(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n' + '='.repeat(80));
  console.log('TESTING: episodes/get.ts');
  console.log('='.repeat(80));

  // Test 1: Valid episode ID (will fail if episode doesn't exist)
  results.push(
    await testLambdaFunction(
      'episodes/get - Valid Episode ID',
      handler,
      createMockEvent('GET', '/episodes/test-episode-123', {
        pathParameters: {
          id: 'test-episode-123',
        },
      })
    )
  );

  // Test 2: Missing episode ID
  results.push(
    await testLambdaFunction(
      'episodes/get - Missing Episode ID',
      handler,
      createMockEvent('GET', '/episodes', {
        pathParameters: {},
      })
    )
  );

  // Test 3: Invalid episode ID format
  results.push(
    await testLambdaFunction(
      'episodes/get - Invalid Episode ID',
      handler,
      createMockEvent('GET', '/episodes/invalid', {
        pathParameters: {
          id: '',
        },
      })
    )
  );

  // Test 4: Non-existent episode
  results.push(
    await testLambdaFunction(
      'episodes/get - Non-existent Episode',
      handler,
      createMockEvent('GET', '/episodes/non-existent-episode-xyz', {
        pathParameters: {
          id: 'non-existent-episode-xyz',
        },
      })
    )
  );

  return results;
}

