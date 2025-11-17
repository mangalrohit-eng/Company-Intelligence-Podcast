/**
 * Lambda Testing Infrastructure
 * Provides utilities for testing all lambda functions
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export interface TestResult {
  functionName: string;
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: any;
  duration: number;
  issues: string[];
  warnings: string[];
}

export interface TestContext {
  mockUserId?: string;
  mockOrgId?: string;
  mockAuth?: boolean;
}

/**
 * Creates a mock API Gateway event for testing
 */
export function createMockEvent(
  httpMethod: string,
  path: string,
  options: {
    body?: any;
    pathParameters?: Record<string, string>;
    queryStringParameters?: Record<string, string>;
    headers?: Record<string, string>;
    userId?: string;
    orgId?: string;
  } = {}
): APIGatewayProxyEvent {
  const event: any = {
    httpMethod,
    path,
    headers: options.headers || {},
    pathParameters: options.pathParameters || null,
    queryStringParameters: options.queryStringParameters || null,
    body: options.body ? JSON.stringify(options.body) : null,
    requestContext: {
      requestId: 'test-request-id',
      identity: {
        sourceIp: '127.0.0.1',
      },
      authorizer: options.userId ? {
        claims: {
          sub: options.userId,
          'custom:org_id': options.orgId || `org-${options.userId}`,
        },
        jwt: {
          claims: {
            sub: options.userId,
            'custom:org_id': options.orgId || `org-${options.userId}`,
          },
        },
      } : null,
    },
    isBase64Encoded: false,
  };

  return event as APIGatewayProxyEvent;
}

/**
 * Test runner for lambda functions
 */
export async function testLambdaFunction(
  functionName: string,
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
  event: APIGatewayProxyEvent
): Promise<TestResult> {
  const startTime = Date.now();
  const issues: string[] = [];
  const warnings: string[] = [];

  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${functionName}`);
    console.log('='.repeat(80));
    console.log('Event:', JSON.stringify(event, null, 2));
    console.log('-'.repeat(80));

    const result = await handler(event);
    const duration = Date.now() - startTime;

    console.log('Response Status:', result.statusCode);
    console.log('Response Headers:', JSON.stringify(result.headers, null, 2));
    
    let parsedBody;
    try {
      parsedBody = result.body ? JSON.parse(result.body) : null;
      console.log('Response Body:', JSON.stringify(parsedBody, null, 2));
    } catch (e) {
      console.log('Response Body (non-JSON):', result.body?.substring(0, 200));
      parsedBody = result.body;
    }

    console.log('Duration:', `${duration}ms`);
    console.log('='.repeat(80));

    // Validation checks
    if (!result.statusCode) {
      issues.push('Missing statusCode in response');
    }

    if (!result.headers) {
      warnings.push('Missing headers in response');
    }

    if (!result.headers?.['Content-Type']) {
      warnings.push('Missing Content-Type header');
    }

    if (!result.headers?.['Access-Control-Allow-Origin']) {
      warnings.push('Missing CORS header');
    }

    if (result.statusCode >= 500) {
      issues.push(`Server error: ${result.statusCode}`);
    }

    if (result.statusCode >= 400 && result.statusCode < 500) {
      warnings.push(`Client error: ${result.statusCode}`);
    }

    return {
      functionName,
      success: result.statusCode < 400 && issues.length === 0,
      statusCode: result.statusCode,
      response: parsedBody,
      duration,
      issues,
      warnings,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    issues.push(`Exception thrown: ${error.message}`);

    console.error('ERROR:', error);
    console.log('Duration:', `${duration}ms`);
    console.log('='.repeat(80));

    return {
      functionName,
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      duration,
      issues,
      warnings,
    };
  }
}

/**
 * Generate a test report
 */
export function generateTestReport(results: TestResult[]): string {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / totalTests;

  let report = `\n${'='.repeat(80)}\n`;
  report += `LAMBDA FUNCTION TEST REPORT\n`;
  report += `${'='.repeat(80)}\n\n`;
  report += `Total Tests: ${totalTests}\n`;
  report += `Passed: ${passedTests} ✓\n`;
  report += `Failed: ${failedTests} ✗\n`;
  report += `Total Issues: ${totalIssues}\n`;
  report += `Total Warnings: ${totalWarnings}\n`;
  report += `Average Duration: ${avgDuration.toFixed(2)}ms\n\n`;

  report += `${'='.repeat(80)}\n`;
  report += `DETAILED RESULTS\n`;
  report += `${'='.repeat(80)}\n\n`;

  results.forEach((result, index) => {
    report += `${index + 1}. ${result.functionName}\n`;
    report += `   Status: ${result.success ? '✓ PASS' : '✗ FAIL'}\n`;
    if (result.statusCode) {
      report += `   HTTP Status: ${result.statusCode}\n`;
    }
    report += `   Duration: ${result.duration}ms\n`;
    
    if (result.issues.length > 0) {
      report += `   Issues:\n`;
      result.issues.forEach(issue => {
        report += `     - ${issue}\n`;
      });
    }
    
    if (result.warnings.length > 0) {
      report += `   Warnings:\n`;
      result.warnings.forEach(warning => {
        report += `     - ${warning}\n`;
      });
    }
    
    report += '\n';
  });

  return report;
}

/**
 * Save test report to file
 */
export async function saveTestReport(results: TestResult[], filename: string): Promise<void> {
  const { writeFileSync } = await import('fs');
  const report = generateTestReport(results);
  writeFileSync(filename, report);
  console.log(`\nTest report saved to: ${filename}`);
}

