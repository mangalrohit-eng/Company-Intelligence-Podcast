#!/usr/bin/env ts-node
/**
 * Run Stage Utility - Execute individual pipeline stages for testing
 * Usage: ts-node scripts/runStage.ts --stage <stage> --in <input.json> --out <output.json>
 */

import 'dotenv/config'; // Load .env file
import { readFileSync, writeFileSync } from 'fs';
import { GatewayFactory } from '../src/gateways/factory';
import { PrepareStage } from '../src/engine/stages/prepare';
import { DiscoverStage } from '../src/engine/stages/discover';
import { ScrapeStage } from '../src/engine/stages/scrape';
import { ExtractStage } from '../src/engine/stages/extract';
import { SummarizeStage } from '../src/engine/stages/summarize';
import { OutlineStage } from '../src/engine/stages/outline';
import { ScriptStage } from '../src/engine/stages/script';
import { TtsStage } from '../src/engine/stages/tts';
import { NoOpEventEmitter } from '../src/utils/event-emitter';
import { logger } from '../src/utils/logger';

interface Args {
  stage: string;
  in: string;
  out: string;
  llm?: 'openai' | 'replay' | 'stub';
  tts?: 'openai' | 'replay' | 'stub';
  http?: 'openai' | 'replay' | 'stub';
  cassette?: string;
}

async function main() {
  const args = parseArgs();

  logger.info('Running stage', { stage: args.stage, input: args.in });

  // Read input
  const input = JSON.parse(readFileSync(args.in, 'utf-8'));

  // Setup gateways
  const gatewayConfig = {
    llmProvider: (args.llm || process.env.LLM_PROVIDER || 'replay') as any,
    ttsProvider: (args.tts || process.env.TTS_PROVIDER || 'stub') as any,
    httpProvider: (args.http || process.env.HTTP_PROVIDER || 'replay') as any,
    cassetteKey: args.cassette || process.env.CASSETTE_KEY || 'default',
    cassettePath: process.env.CASSETTE_PATH || './cassettes',
    openaiApiKey: process.env.OPENAI_API_KEY,
  };

  const llmGateway = GatewayFactory.createLlmGateway(gatewayConfig);
  const ttsGateway = GatewayFactory.createTtsGateway(gatewayConfig);
  const httpGateway = GatewayFactory.createHttpGateway(gatewayConfig);

  const emitter = new NoOpEventEmitter();

  let output: any;

  // Execute stage
  switch (args.stage) {
    case 'prepare':
      const prepareStage = new PrepareStage();
      output = await prepareStage.execute(input, emitter);
      break;

    case 'discover':
      const discoverStage = new DiscoverStage(llmGateway, httpGateway);
      output = await discoverStage.execute(input, emitter);
      break;

    case 'scrape':
      const scrapeStage = new ScrapeStage(httpGateway);
      output = await scrapeStage.execute(input.items, input.robotsMode, emitter);
      break;

    case 'extract':
      const extractStage = new ExtractStage(llmGateway);
      output = await extractStage.execute(
        input.scrapedItems || input.contents || [],
        input.budgets || {},
        emitter
      );
      break;

    case 'summarize':
      const summarizeStage = new SummarizeStage(llmGateway);
      const evidenceByTopic = new Map();
      const evidenceUnits = input.evidenceUnits || [];
      for (const unit of evidenceUnits) {
        if (!evidenceByTopic.has(unit.topicId)) {
          evidenceByTopic.set(unit.topicId, []);
        }
        evidenceByTopic.get(unit.topicId).push(unit);
      }
      output = await summarizeStage.execute(
        input.frozenConfig,
        evidenceByTopic,
        emitter
      );
      break;

    case 'outline':
      const outlineStage = new OutlineStage(llmGateway);
      output = await outlineStage.execute(input.summaries, input.companyName, emitter);
      break;

    case 'script':
      const scriptStage = new ScriptStage(llmGateway);
      output = await scriptStage.execute(
        input.outline,
        input.summaries,
        input.contrasts || [],
        input.durationMinutes,
        emitter
      );
      break;

    case 'tts':
      const ttsStage = new TtsStage(ttsGateway);
      output = await ttsStage.execute(input.script, input.voice, input.speed, emitter);
      break;

    default:
      throw new Error(`Unknown stage: ${args.stage}`);
  }

  // Write output
  writeFileSync(args.out, JSON.stringify(output, null, 2));

  logger.info('Stage complete', { stage: args.stage, output: args.out });
}

function parseArgs(): Args {
  const args: any = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    const value = argv[i + 1];
    args[key] = value;
  }

  if (!args.stage || !args.in || !args.out) {
    console.error('Usage: runStage.ts --stage <stage> --in <input.json> --out <output.json>');
    process.exit(1);
  }

  return args as Args;
}

main().catch((error) => {
  logger.error('Stage execution failed', { error: error.message, stack: error.stack });
  console.error('Full error details:', error);
  process.exit(1);
});

