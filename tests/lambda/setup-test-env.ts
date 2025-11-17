/**
 * Test Environment Setup
 * Loads test environment variables and provides mock AWS services
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load test environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.test') });

// Set testing flag
process.env.NODE_ENV = 'test';
process.env.TESTING = 'true';

console.log('Test environment loaded:');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '[SET]' : '[MISSING]');
console.log('- PODCASTS_TABLE:', process.env.PODCASTS_TABLE);
console.log('- AWS_REGION:', process.env.AWS_REGION);
console.log('- LOG_LEVEL:', process.env.LOG_LEVEL);
console.log('');

export default function setupTestEnvironment() {
  // Additional test setup can go here
  return {
    isTestEnvironment: true,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasDynamoDB: !!process.env.PODCASTS_TABLE,
  };
}

