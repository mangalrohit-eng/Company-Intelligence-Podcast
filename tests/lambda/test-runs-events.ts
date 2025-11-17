/**
 * Test: runs/events.ts
 * Tests run event retrieval for progress tracking
 */

import { handler } from '../../src/api/runs/events';
import { createMockEvent, testLambdaFunction, TestResult } from './test-infrastructure';

export async function testRunsEvents(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n' + '='.repeat(80));
  console.log('TESTING: runs/events.ts');
  console.log('='.repeat(80));

  // Test 1: Valid request with existing run ID
  results.push(
    await testLambdaFunction(
      'runs/events - Valid Request',
      handler,
      createMockEvent('GET', '/runs/test-run-123/events', {
        pathParameters: {
          id: 'test-run-123',
        },
      })
    )
  );

  // Test 2: With limit parameter
  results.push(
    await testLambdaFunction(
      'runs/events - With Limit',
      handler,
      createMockEvent('GET', '/runs/test-run-123/events', {
        pathParameters: {
          id: 'test-run-123',
        },
        queryStringParameters: {
          limit: '10',
        },
      })
    )
  );

  // Test 3: Missing run ID
  results.push(
    await testLambdaFunction(
      'runs/events - Missing Run ID',
      handler,
      createMockEvent('GET', '/runs//events', {
        pathParameters: {},
      })
    )
  );

  // Test 4: Invalid limit parameter
  results.push(
    await testLambdaFunction(
      'runs/events - Invalid Limit',
      handler,
      createMockEvent('GET', '/runs/test-run-123/events', {
        pathParameters: {
          id: 'test-run-123',
        },
        queryStringParameters: {
          limit: 'invalid',
        },
      })
    )
  );

  // Test 5: Non-existent run
  results.push(
    await testLambdaFunction(
      'runs/events - Non-existent Run',
      handler,
      createMockEvent('GET', '/runs/non-existent-run/events', {
        pathParameters: {
          id: 'non-existent-run',
        },
      })
    )
  );

  return results;
}

