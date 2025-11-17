/**
 * Master Test Runner for All Lambda Functions
 * Executes all lambda tests and generates comprehensive report
 */

// Setup test environment BEFORE importing any lambda functions
process.env.NODE_ENV = 'test';
process.env.TESTING = 'true';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key-stub';
process.env.PODCASTS_TABLE = process.env.PODCASTS_TABLE || 'test-podcasts';
process.env.PODCAST_CONFIGS_TABLE = process.env.PODCAST_CONFIGS_TABLE || 'test-podcast-configs';
process.env.PODCAST_COMPETITORS_TABLE = process.env.PODCAST_COMPETITORS_TABLE || 'test-podcast-competitors';
process.env.PODCAST_TOPICS_TABLE = process.env.PODCAST_TOPICS_TABLE || 'test-podcast-topics';
process.env.RUNS_TABLE = process.env.RUNS_TABLE || 'test-runs';
process.env.RUN_EVENTS_TABLE = process.env.RUN_EVENTS_TABLE || 'test-run-events';
process.env.EPISODES_TABLE = process.env.EPISODES_TABLE || 'test-episodes';
process.env.S3_BUCKET_MEDIA = process.env.S3_BUCKET_MEDIA || 'test-media-bucket';
process.env.CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'https://test.cloudfront.net';
process.env.STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN || 'arn:aws:states:us-east-1:123456789012:stateMachine:test';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';

console.log('✓ Test environment configured');
console.log('  - OPENAI_API_KEY:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
console.log('  - AWS_REGION:', process.env.AWS_REGION);
console.log('  - LOG_LEVEL:', process.env.LOG_LEVEL);
console.log('');

import { TestResult, generateTestReport, saveTestReport } from './test-infrastructure';
import { testCompetitorsSuggest } from './test-competitors-suggest';
import { testEpisodesGet } from './test-episodes-get';
import { testPodcastsCreate } from './test-podcasts-create';
import { testPodcastsList } from './test-podcasts-list';
import { testRunsCreate } from './test-runs-create';
import { testRunsEvents } from './test-runs-events';
import { testVoicePreview } from './test-voice-preview';

interface TestSuite {
  name: string;
  testFunction: () => Promise<TestResult[]>;
}

const testSuites: TestSuite[] = [
  { name: 'Competitors Suggest', testFunction: testCompetitorsSuggest },
  { name: 'Episodes Get', testFunction: testEpisodesGet },
  { name: 'Podcasts Create', testFunction: testPodcastsCreate },
  { name: 'Podcasts List', testFunction: testPodcastsList },
  { name: 'Runs Create', testFunction: testRunsCreate },
  { name: 'Runs Events', testFunction: testRunsEvents },
  { name: 'Voice Preview', testFunction: testVoicePreview },
];

/**
 * Issue tracking system
 */
interface Issue {
  category: string;
  description: string;
  affectedFunctions: string[];
  resolution?: string;
  status: 'open' | 'resolved';
}

const knownIssues: Issue[] = [];

function recordIssue(category: string, description: string, functionName: string, resolution?: string) {
  const existing = knownIssues.find(i => i.category === category && i.description === description);
  
  if (existing) {
    if (!existing.affectedFunctions.includes(functionName)) {
      existing.affectedFunctions.push(functionName);
    }
    if (resolution) {
      existing.resolution = resolution;
      existing.status = 'resolved';
    }
  } else {
    knownIssues.push({
      category,
      description,
      affectedFunctions: [functionName],
      resolution,
      status: resolution ? 'resolved' : 'open',
    });
  }
}

/**
 * Analyze test results and identify patterns
 */
function analyzeResults(allResults: TestResult[]): any {
  const analysis = {
    totalTests: allResults.length,
    passed: 0,
    failed: 0,
    totalIssues: 0,
    totalWarnings: 0,
    avgDuration: 0,
    commonIssues: {} as Record<string, number>,
    commonWarnings: {} as Record<string, number>,
    byStatusCode: {} as Record<number, number>,
    authenticationTests: {
      total: 0,
      passed: 0,
      failed: 0,
    },
    validationTests: {
      total: 0,
      passed: 0,
      failed: 0,
    },
  };

  allResults.forEach(result => {
    if (result.success) {
      analysis.passed++;
    } else {
      analysis.failed++;
    }

    analysis.totalIssues += result.issues.length;
    analysis.totalWarnings += result.warnings.length;
    analysis.avgDuration += result.duration;

    // Track issues
    result.issues.forEach(issue => {
      analysis.commonIssues[issue] = (analysis.commonIssues[issue] || 0) + 1;
      
      // Record for pattern analysis
      if (issue.includes('Authentication') || issue.includes('Unauthorized')) {
        recordIssue('Authentication', issue, result.functionName);
      } else if (issue.includes('Validation') || issue.includes('required')) {
        recordIssue('Validation', issue, result.functionName);
      } else if (issue.includes('DynamoDB') || issue.includes('Database')) {
        recordIssue('Database', issue, result.functionName);
      } else if (issue.includes('S3') || issue.includes('storage')) {
        recordIssue('Storage', issue, result.functionName);
      } else if (issue.includes('OpenAI') || issue.includes('API')) {
        recordIssue('External API', issue, result.functionName);
      } else {
        recordIssue('Other', issue, result.functionName);
      }
    });

    // Track warnings
    result.warnings.forEach(warning => {
      analysis.commonWarnings[warning] = (analysis.commonWarnings[warning] || 0) + 1;
    });

    // Track status codes
    if (result.statusCode) {
      analysis.byStatusCode[result.statusCode] = (analysis.byStatusCode[result.statusCode] || 0) + 1;
    }

    // Categorize tests
    if (result.functionName.toLowerCase().includes('auth') || 
        result.functionName.toLowerCase().includes('missing authentication')) {
      analysis.authenticationTests.total++;
      if (result.success) {
        analysis.authenticationTests.passed++;
      } else {
        analysis.authenticationTests.failed++;
      }
    }

    if (result.functionName.toLowerCase().includes('validation') || 
        result.functionName.toLowerCase().includes('missing') ||
        result.functionName.toLowerCase().includes('invalid')) {
      analysis.validationTests.total++;
      if (result.success || (result.statusCode && result.statusCode === 400)) {
        analysis.validationTests.passed++;
      } else {
        analysis.validationTests.failed++;
      }
    }
  });

  analysis.avgDuration = analysis.avgDuration / analysis.totalTests;

  return analysis;
}

/**
 * Generate comprehensive report with issue tracking
 */
function generateComprehensiveReport(allResults: TestResult[], analysis: any): string {
  let report = '\n' + '='.repeat(100) + '\n';
  report += 'COMPREHENSIVE LAMBDA FUNCTION TEST REPORT\n';
  report += '='.repeat(100) + '\n\n';
  
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `Environment: ${process.env.NODE_ENV || 'development'}\n\n`;

  // Executive Summary
  report += '='.repeat(100) + '\n';
  report += 'EXECUTIVE SUMMARY\n';
  report += '='.repeat(100) + '\n\n';
  report += `Total Tests Executed: ${analysis.totalTests}\n`;
  report += `Passed: ${analysis.passed} (${((analysis.passed / analysis.totalTests) * 100).toFixed(1)}%)\n`;
  report += `Failed: ${analysis.failed} (${((analysis.failed / analysis.totalTests) * 100).toFixed(1)}%)\n`;
  report += `Total Issues Found: ${analysis.totalIssues}\n`;
  report += `Total Warnings: ${analysis.totalWarnings}\n`;
  report += `Average Execution Time: ${analysis.avgDuration.toFixed(2)}ms\n\n`;

  // HTTP Status Code Distribution
  report += '='.repeat(100) + '\n';
  report += 'HTTP STATUS CODE DISTRIBUTION\n';
  report += '='.repeat(100) + '\n\n';
  Object.entries(analysis.byStatusCode)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([code, count]) => {
      const percentage = ((count as number) / analysis.totalTests * 100).toFixed(1);
      report += `${code}: ${count} (${percentage}%)\n`;
    });
  report += '\n';

  // Test Categories
  report += '='.repeat(100) + '\n';
  report += 'TEST CATEGORIES\n';
  report += '='.repeat(100) + '\n\n';
  report += `Authentication Tests: ${analysis.authenticationTests.passed}/${analysis.authenticationTests.total} passed\n`;
  report += `Validation Tests: ${analysis.validationTests.passed}/${analysis.validationTests.total} passed\n\n`;

  // Common Issues
  if (Object.keys(analysis.commonIssues).length > 0) {
    report += '='.repeat(100) + '\n';
    report += 'COMMON ISSUES (Top 10)\n';
    report += '='.repeat(100) + '\n\n';
    Object.entries(analysis.commonIssues)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10)
      .forEach(([issue, count]) => {
        report += `[${count}x] ${issue}\n`;
      });
    report += '\n';
  }

  // Common Warnings
  if (Object.keys(analysis.commonWarnings).length > 0) {
    report += '='.repeat(100) + '\n';
    report += 'COMMON WARNINGS (Top 10)\n';
    report += '='.repeat(100) + '\n\n';
    Object.entries(analysis.commonWarnings)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10)
      .forEach(([warning, count]) => {
        report += `[${count}x] ${warning}\n`;
      });
    report += '\n';
  }

  // Issue Tracking
  report += '='.repeat(100) + '\n';
  report += 'ISSUE TRACKING & PATTERNS\n';
  report += '='.repeat(100) + '\n\n';
  
  const issuesByCategory = knownIssues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = [];
    }
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, Issue[]>);

  Object.entries(issuesByCategory).forEach(([category, issues]) => {
    report += `${category.toUpperCase()}:\n`;
    issues.forEach((issue, index) => {
      report += `  ${index + 1}. ${issue.description}\n`;
      report += `     Status: ${issue.status.toUpperCase()}\n`;
      report += `     Affected Functions: ${issue.affectedFunctions.join(', ')}\n`;
      if (issue.resolution) {
        report += `     Resolution: ${issue.resolution}\n`;
      }
      report += '\n';
    });
  });

  // Detailed Results by Function
  report += '='.repeat(100) + '\n';
  report += 'DETAILED RESULTS BY FUNCTION\n';
  report += '='.repeat(100) + '\n\n';

  const resultsByFunction = allResults.reduce((acc, result) => {
    const functionName = result.functionName.split(' - ')[0];
    if (!acc[functionName]) {
      acc[functionName] = [];
    }
    acc[functionName].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  Object.entries(resultsByFunction).forEach(([functionName, results]) => {
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    report += `-`.repeat(100) + '\n';
    report += `${functionName} (${passed}/${total} passed)\n`;
    report += `-`.repeat(100) + '\n\n';
    
    results.forEach((result, index) => {
      const status = result.success ? '✓ PASS' : '✗ FAIL';
      report += `  ${index + 1}. ${result.functionName.split(' - ')[1] || 'Test'} - ${status}\n`;
      report += `     Status Code: ${result.statusCode || 'N/A'}\n`;
      report += `     Duration: ${result.duration}ms\n`;
      
      if (result.issues.length > 0) {
        report += `     Issues:\n`;
        result.issues.forEach(issue => {
          report += `       - ${issue}\n`;
        });
      }
      
      if (result.warnings.length > 0) {
        report += `     Warnings:\n`;
        result.warnings.forEach(warning => {
          report += `       - ${warning}\n`;
        });
      }
      report += '\n';
    });
  });

  // Recommendations
  report += '='.repeat(100) + '\n';
  report += 'RECOMMENDATIONS\n';
  report += '='.repeat(100) + '\n\n';
  
  const recommendations: string[] = [];
  
  if (analysis.authenticationTests.failed > 0) {
    recommendations.push('Review authentication middleware and ensure consistent auth handling across all functions');
  }
  
  if (analysis.totalWarnings > analysis.totalTests * 0.5) {
    recommendations.push('Address CORS and content-type header warnings for better API consistency');
  }
  
  if (analysis.commonIssues['Missing statusCode in response']) {
    recommendations.push('Ensure all functions return proper HTTP status codes');
  }
  
  if (analysis.avgDuration > 5000) {
    recommendations.push('Consider optimizing slow functions or implementing caching');
  }

  const openIssues = knownIssues.filter(i => i.status === 'open');
  if (openIssues.length > 0) {
    recommendations.push(`Resolve ${openIssues.length} open issues identified in testing`);
  }

  if (recommendations.length > 0) {
    recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
  } else {
    report += 'All tests passed successfully! No immediate recommendations.\n';
  }
  
  report += '\n' + '='.repeat(100) + '\n';

  return report;
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(100));
  console.log('STARTING COMPREHENSIVE LAMBDA FUNCTION TESTING');
  console.log('='.repeat(100) + '\n');

  const allResults: TestResult[] = [];
  const startTime = Date.now();

  // Run all test suites
  for (const suite of testSuites) {
    try {
      console.log(`\n${'*'.repeat(100)}`);
      console.log(`Running Test Suite: ${suite.name}`);
      console.log('*'.repeat(100));
      
      const results = await suite.testFunction();
      allResults.push(...results);
      
      const passed = results.filter(r => r.success).length;
      console.log(`\n${suite.name}: ${passed}/${results.length} tests passed`);
    } catch (error) {
      console.error(`\nFailed to run test suite ${suite.name}:`, error);
      allResults.push({
        functionName: `${suite.name} - Suite Failure`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
        issues: [`Test suite failed to execute: ${error}`],
        warnings: [],
      });
    }
  }

  const totalTime = Date.now() - startTime;

  // Analyze results
  const analysis = analyzeResults(allResults);

  // Generate reports
  const comprehensiveReport = generateComprehensiveReport(allResults, analysis);
  console.log(comprehensiveReport);

  // Save reports
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const reportFilename = `lambda-test-report-${timestamp}.txt`;
  const jsonFilename = `lambda-test-results-${timestamp}.json`;

  await saveTestReport(allResults, reportFilename);
  
  // Save JSON results
  const { writeFileSync } = await import('fs');
  writeFileSync(jsonFilename, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTime,
    analysis,
    issues: knownIssues,
    results: allResults,
  }, null, 2));
  
  console.log(`\nJSON results saved to: ${jsonFilename}`);
  console.log(`\nTotal testing time: ${(totalTime / 1000).toFixed(2)}s`);
  
  return {
    allResults,
    analysis,
    comprehensiveReport,
  };
}

// Auto-run tests
runAllTests()
  .then(() => {
    console.log('\n✓ All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Test execution failed:', error);
    process.exit(1);
  });

export { runAllTests };

