/**
 * Test: podcasts/create.ts
 * Tests podcast creation with authentication and validation
 */

import { handler } from '../../src/api/podcasts/create';
import { createMockEvent, testLambdaFunction, TestResult } from './test-infrastructure';

export async function testPodcastsCreate(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n' + '='.repeat(80));
  console.log('TESTING: podcasts/create.ts');
  console.log('='.repeat(80));

  const validPodcastData = {
    title: 'Test Podcast',
    subtitle: 'A test podcast',
    description: 'This is a test podcast description',
    author: 'Test Author',
    email: 'test@example.com',
    category: 'Technology',
    explicit: false,
    language: 'en',
    cadence: 'weekly',
    durationMinutes: 10,
    timeWindowHours: 168,
    timezone: 'America/New_York',
    publishTime: '09:00',
    companyId: 'Microsoft',
    industryId: 'Technology',
    topicIds: ['AI', 'Cloud Computing'],
    competitorIds: ['Google', 'Amazon'],
    voiceId: 'alloy',
    voiceSpeed: 1.0,
    voiceTone: 'professional',
    robotsMode: 'permissive',
    regions: ['US'],
    sourceLanguages: ['en'],
    topicPriorities: { 'AI': 80, 'Cloud Computing': 60 },
    allowDomains: [],
    blockDomains: [],
  };

  // Test 1: Valid request with authentication
  results.push(
    await testLambdaFunction(
      'podcasts/create - Valid Authenticated Request',
      handler,
      createMockEvent('POST', '/podcasts', {
        body: validPodcastData,
        userId: 'test-user-123',
        orgId: 'test-org-456',
      })
    )
  );

  // Test 2: Missing authentication
  results.push(
    await testLambdaFunction(
      'podcasts/create - Missing Authentication',
      handler,
      createMockEvent('POST', '/podcasts', {
        body: validPodcastData,
      })
    )
  );

  // Test 3: Missing required fields
  results.push(
    await testLambdaFunction(
      'podcasts/create - Missing Required Fields',
      handler,
      createMockEvent('POST', '/podcasts', {
        body: {
          title: 'Test Podcast',
        },
        userId: 'test-user-123',
        orgId: 'test-org-456',
      })
    )
  );

  // Test 4: Invalid email format
  results.push(
    await testLambdaFunction(
      'podcasts/create - Invalid Email',
      handler,
      createMockEvent('POST', '/podcasts', {
        body: {
          ...validPodcastData,
          email: 'invalid-email',
        },
        userId: 'test-user-123',
        orgId: 'test-org-456',
      })
    )
  );

  // Test 5: Empty body
  results.push(
    await testLambdaFunction(
      'podcasts/create - Empty Body',
      handler,
      createMockEvent('POST', '/podcasts', {
        body: {},
        userId: 'test-user-123',
        orgId: 'test-org-456',
      })
    )
  );

  // Test 6: Legacy user without org_id (auto-generation)
  results.push(
    await testLambdaFunction(
      'podcasts/create - Legacy User Auto-OrgId',
      handler,
      createMockEvent('POST', '/podcasts', {
        body: validPodcastData,
        userId: 'legacy-user-789',
        // No orgId provided - should auto-generate
      })
    )
  );

  return results;
}

