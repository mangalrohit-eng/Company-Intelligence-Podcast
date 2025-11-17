/**
 * Test: voice/preview.ts
 * Tests TTS voice preview generation
 */

import { handler } from '../../src/api/voice/preview';
import { createMockEvent, testLambdaFunction, TestResult } from './test-infrastructure';

export async function testVoicePreview(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n' + '='.repeat(80));
  console.log('TESTING: voice/preview.ts');
  console.log('='.repeat(80));

  const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

  // Test 1: Valid voice ID
  for (const voiceId of validVoices) {
    results.push(
      await testLambdaFunction(
        `voice/preview - Voice: ${voiceId}`,
        handler,
        createMockEvent('POST', '/voice/preview', {
          body: {
            voiceId,
          },
        })
      )
    );
  }

  // Test 2: Missing voice ID
  results.push(
    await testLambdaFunction(
      'voice/preview - Missing Voice ID',
      handler,
      createMockEvent('POST', '/voice/preview', {
        body: {},
      })
    )
  );

  // Test 3: Invalid voice ID
  results.push(
    await testLambdaFunction(
      'voice/preview - Invalid Voice ID',
      handler,
      createMockEvent('POST', '/voice/preview', {
        body: {
          voiceId: 'invalid-voice',
        },
      })
    )
  );

  // Test 4: Empty voice ID
  results.push(
    await testLambdaFunction(
      'voice/preview - Empty Voice ID',
      handler,
      createMockEvent('POST', '/voice/preview', {
        body: {
          voiceId: '',
        },
      })
    )
  );

  return results;
}

