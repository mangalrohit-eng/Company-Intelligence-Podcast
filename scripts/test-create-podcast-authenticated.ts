/**
 * Test script to debug create podcast API with authentication
 */

import { CognitoIdentityProviderClient, InitiateAuthCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com';
const USER_POOL_ID = 'us-east-1_lvLcARe2P';
const CLIENT_ID = '3lm7s5lml6i0va070cm1c3uafn';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword123!';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

// Log file for debugging
const logFile = path.join(__dirname, 'create-podcast-debug.log');

function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  console.log(logLine);
  fs.appendFileSync(logFile, logLine);
}

async function ensureTestUser() {
  log('📝 Ensuring test user exists...');
  
  try {
    // Try to create user
    await cognitoClient.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: TEST_EMAIL,
      UserAttributes: [
        { Name: 'email', Value: TEST_EMAIL },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:org_id', Value: 'test-org-123' },
      ],
      MessageAction: 'SUPPRESS',
    }));
    
    log('✅ Test user created');
    
    // Set permanent password
    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: TEST_EMAIL,
      Password: TEST_PASSWORD,
      Permanent: true,
    }));
    
    log('✅ Password set');
  } catch (error: any) {
    if (error.name === 'UsernameExistsException') {
      log('ℹ️  Test user already exists');
    } else {
      log('❌ Error creating user', { error: error.message });
      throw error;
    }
  }
}

async function authenticateUser(): Promise<string> {
  log('🔐 Authenticating test user...');
  
  try {
    const response = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: TEST_EMAIL,
        PASSWORD: TEST_PASSWORD,
      },
    }));
    
    const idToken = response.AuthenticationResult?.IdToken;
    if (!idToken) {
      throw new Error('No ID token received');
    }
    
    log('✅ Authentication successful', {
      tokenPreview: idToken.substring(0, 50) + '...',
      tokenLength: idToken.length,
    });
    
    return idToken;
  } catch (error: any) {
    log('❌ Authentication failed', { error: error.message });
    throw error;
  }
}

async function testCreatePodcast(idToken: string) {
  log('📡 Testing create podcast API...');
  
  // Generate valid UUIDs for test data
  const companyId = '550e8400-e29b-41d4-a716-446655440000';
  const industryId = '550e8400-e29b-41d4-a716-446655440001';
  const competitorId = '550e8400-e29b-41d4-a716-446655440002';
  const topicId = '550e8400-e29b-41d4-a716-446655440003';
  
  const requestBody = {
    title: 'Test Podcast',
    subtitle: 'A test podcast',
    description: 'Testing the create podcast API',
    author: 'Test Author',
    email: TEST_EMAIL,
    category: 'Technology',
    explicit: false,
    language: 'en',  // Must be 2 characters
    cadence: 'daily',
    durationMinutes: 15,
    timeWindowHours: 24,
    timezone: 'America/New_York',
    publishTime: '09:00',
    companyId,  // UUID
    industryId,  // UUID
    voiceId: 'alloy',
    voiceSpeed: 1.0,
    voiceTone: 'professional',
    robotsMode: 'permissive',  // Must be 'strict' or 'permissive'
    regions: ['US'],
    sourceLanguages: ['en'],  // Required field
    topicPriorities: {},
    allowDomains: [],
    blockDomains: [],
    competitorIds: [competitorId],  // UUIDs
    topicIds: [topicId],  // UUIDs
  };
  
  log('Request details', {
    url: `${API_BASE_URL}/podcasts`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken.substring(0, 20)}...`,
    },
    bodyPreview: {
      title: requestBody.title,
      companyId: requestBody.companyId,
    },
  });
  
  try {
    const response = await fetch(`${API_BASE_URL}/podcasts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    log('Response received', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
    
    const responseText = await response.text();
    log('Response body (raw)', { text: responseText });
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      log('Response body (parsed)', responseData);
    } catch {
      log('⚠️  Response is not JSON');
    }
    
    if (response.ok) {
      log('✅ CREATE PODCAST SUCCESSFUL!', responseData);
      return { success: true, data: responseData };
    } else {
      log('❌ CREATE PODCAST FAILED', {
        status: response.status,
        error: responseData || responseText,
      });
      return { success: false, error: responseData || responseText };
    }
  } catch (error: any) {
    log('❌ Request failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function main() {
  // Clear previous log
  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
  }
  
  log('='.repeat(80));
  log('🚀 Starting Create Podcast API Test');
  log('='.repeat(80));
  
  try {
    // Step 1: Ensure test user exists
    await ensureTestUser();
    
    // Step 2: Authenticate
    const idToken = await authenticateUser();
    
    // Step 3: Test create podcast
    const result = await testCreatePodcast(idToken);
    
    log('='.repeat(80));
    if (result.success) {
      log('✅ TEST PASSED - Podcast created successfully!');
    } else {
      log('❌ TEST FAILED - See logs above for details');
    }
    log('='.repeat(80));
    log(`📄 Full logs saved to: ${logFile}`);
    
    process.exit(result.success ? 0 : 1);
  } catch (error: any) {
    log('💥 FATAL ERROR', {
      error: error.message,
      stack: error.stack,
    });
    log('='.repeat(80));
    log(`📄 Full logs saved to: ${logFile}`);
    process.exit(1);
  }
}

main();

