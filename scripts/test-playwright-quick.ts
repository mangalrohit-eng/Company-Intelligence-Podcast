/**
 * Quick test to verify Playwright import works
 */

import 'dotenv/config';

// Simulate Lambda environment
process.env.AWS_LAMBDA_FUNCTION_NAME = 'test-lambda';

async function test() {
  console.log('Testing Playwright import...\n');
  
  try {
    const { GatewayFactory } = await import('../src/gateways/factory');
    const gateway = await GatewayFactory.createHttpGateway({
      httpProvider: 'playwright',
      llmProvider: 'openai',
      ttsProvider: 'openai',
    });
    
    console.log('✅ Gateway created:', gateway.constructor.name);
    
    if (gateway.constructor.name.includes('Playwright')) {
      console.log('✅ Playwright gateway created successfully!');
      await gateway.initialize();
      console.log('✅ Playwright initialized successfully!');
    } else {
      console.log('⚠️  Fallback to NodeFetchHttpGateway (Playwright not available)');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();

