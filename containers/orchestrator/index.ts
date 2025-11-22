#!/usr/bin/env node
/**
 * Standalone Pipeline Orchestrator Entry Point
 * Can be run in a container without Next.js
 * 
 * Usage:
 *   RUN_ID=run-001 PODCAST_ID=podcast-001 PIPELINE_INPUT='{...}' node containers/orchestrator/index.ts
 * 
 * Or via stdin:
 *   echo '{"runId":"run-001",...}' | RUN_ID=run-001 PODCAST_ID=podcast-001 node containers/orchestrator/index.ts
 */

import { PipelineOrchestrator } from '../../src/engine/orchestrator';
import { RealtimeEventEmitter } from '../../src/utils/realtime-event-emitter';
import { logger } from '../../src/utils/logger';
import { PipelineInput } from '../../src/types/shared';

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
    process.stdin.on('error', reject);
  });
}

async function writeEventToDynamoDB(runId: string, update: any) {
  // TODO: Implement DynamoDB event writing
  // For now, just log
  logger.info('Pipeline event', { runId, update });
}

async function main() {
  try {
    // Get input from environment variables or stdin
    const runId = process.env.RUN_ID || `run-${Date.now()}`;
    const podcastId = process.env.PODCAST_ID || 'default-podcast';
    
    logger.info('Starting standalone orchestrator', { runId, podcastId });
    
    // Parse input from environment or stdin
    let inputJson = process.env.PIPELINE_INPUT;
    
    if (!inputJson) {
      // Try reading from stdin
      logger.info('No PIPELINE_INPUT env var, reading from stdin...');
      inputJson = await readStdin();
    }
    
    if (!inputJson || inputJson.trim() === '') {
      throw new Error('PIPELINE_INPUT environment variable or stdin required');
    }
    
    const pipelineInput: PipelineInput = JSON.parse(inputJson);
    
    // Ensure runId and podcastId match
    pipelineInput.runId = runId;
    pipelineInput.podcastId = podcastId;
    
    logger.info('Pipeline input parsed', {
      runId: pipelineInput.runId,
      podcastId: pipelineInput.podcastId,
      durationMinutes: pipelineInput.config?.durationMinutes,
    });
    
    // Create event emitter that writes to CloudWatch/DynamoDB
    const emitter = new RealtimeEventEmitter(async (update) => {
      // Write events to DynamoDB run_events table
      await writeEventToDynamoDB(runId, update);
    });
    
    // Create orchestrator
    const orchestrator = new PipelineOrchestrator();
    
    logger.info('Starting pipeline execution...');
    const startTime = Date.now();
    
    // Execute pipeline
    const output = await orchestrator.execute(pipelineInput, emitter);
    
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    logger.info('Pipeline completed', { 
      runId, 
      status: output.status,
      episodeId: output.episodeId,
      durationSeconds: duration,
    });
    
    // Write output summary
    console.log(JSON.stringify({
      status: output.status,
      runId: output.runId,
      episodeId: output.episodeId,
      durationSeconds: duration,
      error: output.error,
    }, null, 2));
    
    // Exit with appropriate code
    process.exit(output.status === 'success' ? 0 : 1);
    
  } catch (error: any) {
    logger.error('Fatal error in orchestrator', {
      error: error.message,
      stack: error.stack,
    });
    
    console.error(JSON.stringify({
      status: 'failed',
      error: error.message,
      stack: error.stack,
    }, null, 2));
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main };

