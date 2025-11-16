#!/usr/bin/env ts-node
/**
 * Generate Cassette - Record real API responses for replay
 * Usage: ts-node scripts/generateCassette.ts --key <cassette-key> --stage <stage> --in <input.json>
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../src/utils/logger';

interface CassetteRecorder {
  llmResponses: any[];
  ttsResponses: any[];
  httpResponses: any[];
}

async function main() {
  const args = parseArgs();
  const cassettePath = join(process.cwd(), 'cassettes', args.key);

  // Create directory if it doesn't exist
  if (!existsSync(cassettePath)) {
    mkdirSync(cassettePath, { recursive: true });
  }

  const recorder: CassetteRecorder = {
    llmResponses: [],
    ttsResponses: [],
    httpResponses: [],
  };

  logger.info('Recording cassette', { key: args.key, stage: args.stage });

  // TODO: Execute stage with recording enabled
  // This would wrap the actual gateways and record their responses

  // Save cassettes
  if (recorder.llmResponses.length > 0) {
    writeFileSync(
      join(cassettePath, 'llm.json'),
      JSON.stringify(recorder.llmResponses, null, 2)
    );
    logger.info(`Recorded ${recorder.llmResponses.length} LLM responses`);
  }

  if (recorder.ttsResponses.length > 0) {
    writeFileSync(
      join(cassettePath, 'tts.json'),
      JSON.stringify(recorder.ttsResponses, null, 2)
    );
    logger.info(`Recorded ${recorder.ttsResponses.length} TTS responses`);
  }

  if (recorder.httpResponses.length > 0) {
    writeFileSync(
      join(cassettePath, 'http.json'),
      JSON.stringify(recorder.httpResponses, null, 2)
    );
    logger.info(`Recorded ${recorder.httpResponses.length} HTTP responses`);
  }

  logger.info('Cassette recording complete', { path: cassettePath });
}

function parseArgs() {
  const args: any = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    const value = argv[i + 1];
    args[key] = value;
  }

  if (!args.key) {
    console.error('Usage: generateCassette.ts --key <cassette-key> --stage <stage> --in <input.json>');
    process.exit(1);
  }

  return args;
}

main().catch((error) => {
  logger.error('Cassette recording failed', { error });
  process.exit(1);
});

