/**
 * Stub-Based Stage Testing
 * 
 * This script allows testing individual pipeline stages using output from previous stages.
 * Usage: npx tsx test-stage-stub.ts <stage-name> [run-id]
 * 
 * Example: npx tsx test-stage-stub.ts contrast run_1763439862339_bmo4vk
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { config } from 'dotenv';
import { logger } from './src/utils/logger';
import { GatewayFactory } from './src/gateways/factory';
import { RealtimeEventEmitter } from './src/utils/realtime-event-emitter';

// Load environment variables
config();

// Import all stages
import { ContrastStage } from './src/engine/stages/contrast';
import { OutlineStage } from './src/engine/stages/outline';
import { ScriptStage } from './src/engine/stages/script';
import { QAStage } from './src/engine/stages/qa';
import { TtsStage } from './src/engine/stages/tts';
import { PackageStage } from './src/engine/stages/package';

const DEBUG_DIR = join(process.cwd(), 'output', 'episodes');
const STUB_RUN_ID = 'stub_test_run';

async function loadStageOutput(runId: string, stageName: string, fallbackRunId?: string): Promise<any> {
  const filePath = join(DEBUG_DIR, runId, 'debug', `${stageName}_output.json`);
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    // Try fallback run if provided
    if (fallbackRunId) {
      const fallbackPath = join(DEBUG_DIR, fallbackRunId, 'debug', `${stageName}_output.json`);
      try {
        const content = await readFile(fallbackPath, 'utf-8');
        logger.info(`Using ${stageName} output from fallback run: ${fallbackRunId}`);
        return JSON.parse(content);
      } catch (fallbackError: any) {
        throw new Error(`Failed to load ${stageName} output from ${runId} or ${fallbackRunId}: ${error.message}`);
      }
    }
    throw new Error(`Failed to load ${stageName} output: ${error.message}`);
  }
}

async function loadStageInput(runId: string, stageName: string): Promise<any> {
  const filePath = join(DEBUG_DIR, runId, 'debug', `${stageName}_input.json`);
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    // Return empty object if input doesn't exist
    return {};
  }
}

async function saveStageIO(stageName: string, input: any, output: any) {
  const stubDir = join(DEBUG_DIR, STUB_RUN_ID, 'debug');
  await mkdir(stubDir, { recursive: true });
  
  await writeFile(
    join(stubDir, `${stageName}_input.json`),
    JSON.stringify(input, null, 2)
  );
  await writeFile(
    join(stubDir, `${stageName}_output.json`),
    JSON.stringify(output, null, 2)
  );
  
  logger.info(`Saved ${stageName} I/O to stub directory`);
}

async function testContrastStage(runId: string) {
  logger.info('Testing Contrast Stage with stubs');
  
  // Load required inputs
  const extractOutput = await loadStageOutput(runId, 'extract');
  const contrastInput = await loadStageInput(runId, 'contrast');
  
  // Create gateways
  const gatewayConfig = {
    llmProvider: 'openai' as const,
    ttsProvider: 'openai' as const,
    httpProvider: 'stub' as const,
    openaiApiKey: process.env.OPENAI_API_KEY || '',
  };
  const llmGateway = GatewayFactory.createLlmGateway(gatewayConfig);
  
  const emitter = new RealtimeEventEmitter((update) => {
    logger.info(`[Contrast] ${update.message}`, { pct: update.pct });
  });
  
  const stage = new ContrastStage(llmGateway);
  
  // Prepare input - group evidence by topic
  const evidenceUnits = extractOutput.units || [];
  const evidenceByTopic = new Map<string, any[]>();
  
  evidenceUnits.forEach((unit: any) => {
    const topicId = unit.topicId || 'company-news';
    if (!evidenceByTopic.has(topicId)) {
      evidenceByTopic.set(topicId, []);
    }
    evidenceByTopic.get(topicId)!.push(unit);
  });
  
  const topicIds = contrastInput.topicIds || ['company-news'];
  const companyName = contrastInput.companyName || 'Citibank';
  const competitors = contrastInput.competitors || [];
  
  logger.info('Contrast input', {
    topicIds,
    companyName,
    competitorCount: competitors.length,
    evidenceCount: evidenceUnits.length,
    evidenceByTopicSize: evidenceByTopic.size,
  });
  
  const input = {
    topicIds,
    companyName,
    competitors,
    evidenceByTopic: Array.from(evidenceByTopic.entries()).map(([topicId, units]) => ({
      topicId,
      unitCount: units.length,
    })),
  };
  
  // Execute stage
  const output = await stage.execute(
    topicIds,
    evidenceByTopic,
    companyName,
    competitors,
    emitter
  );
  
  // Save I/O
  await saveStageIO('contrast', input, {
    contrasts: output.contrasts,
    comparisonCount: output.contrasts.length,
    stats: output.stats,
  });
  
  logger.info('Contrast stage completed', {
    comparisonCount: output.contrasts.length,
    stats: output.stats,
  });
  
  return output;
}

async function testOutlineStage(runId: string) {
  logger.info('Testing Outline Stage with stubs');
  
  // Load required inputs
  const summarizeOutput = await loadStageOutput(runId, 'summarize');
  const outlineInput = await loadStageInput(runId, 'outline');
  
  // Create gateways
  const gatewayConfig = {
    llmProvider: 'openai' as const,
    ttsProvider: 'openai' as const,
    httpProvider: 'stub' as const,
    openaiApiKey: process.env.OPENAI_API_KEY || '',
  };
  const llmGateway = GatewayFactory.createLlmGateway(gatewayConfig);
  
  const emitter = new RealtimeEventEmitter((update) => {
    logger.info(`[Outline] ${update.message}`, { pct: update.pct });
  });
  
  const stage = new OutlineStage(llmGateway);
  
  // Prepare input
  const summaries = summarizeOutput.summaries || [];
  const companyName = outlineInput.companyName || 'Citibank';
  
  logger.info('Outline input', {
    summaryCount: summaries.length,
    companyName,
  });
  
  const input = {
    summaries,
    companyName,
  };
  
  // Execute stage
  const output = await stage.execute(
    summaries,
    companyName,
    emitter
  );
  
  // Save I/O
  await saveStageIO('outline', input, {
    outline: output.outline,
    segmentCount: output.outline.segments?.length || 0,
    knowledgeGraph: output.knowledgeGraph,
  });
  
  logger.info('Outline stage completed', {
    segmentCount: output.outline.segments?.length || 0,
  });
  
  return output;
}

async function testScriptStage(runId: string) {
  logger.info('Testing Script Stage with stubs');
  
  // Load required inputs - use stub_test_run as fallback for outline and contrast
  const outlineOutput = await loadStageOutput(runId, 'outline', STUB_RUN_ID);
  const summarizeOutput = await loadStageOutput(runId, 'summarize');
  const contrastOutput = await loadStageOutput(runId, 'contrast', STUB_RUN_ID);
  const scriptInput = await loadStageInput(runId, 'script');
  
  // Create gateways
  const gatewayConfig = {
    llmProvider: 'openai' as const,
    ttsProvider: 'openai' as const,
    httpProvider: 'stub' as const,
    openaiApiKey: process.env.OPENAI_API_KEY || '',
  };
  const llmGateway = GatewayFactory.createLlmGateway(gatewayConfig);
  
  const emitter = new RealtimeEventEmitter((update) => {
    logger.info(`[Script] ${update.message}`, { pct: update.pct });
  });
  
  const stage = new ScriptStage(llmGateway);
  
  // Prepare input
  const outline = outlineOutput.outline || outlineOutput;
  const summaries = summarizeOutput.summaries || [];
  const contrasts = contrastOutput.contrasts || [];
  const targetDurationMinutes = scriptInput.targetDurationMinutes || 5;
  
  logger.info('Script input', {
    segmentCount: outline.segments?.length || 0,
    summaryCount: summaries.length,
    contrastCount: contrasts.length,
    targetDurationMinutes,
  });
  
  const input = {
    outline,
    summaries,
    contrasts,
    targetDurationMinutes,
  };
  
  // Execute stage
  const output = await stage.execute(
    outline,
    summaries,
    contrasts,
    targetDurationMinutes,
    emitter
  );
  
  // Save I/O - save full narrative for TTS stage
  await saveStageIO('script', input, {
    script: {
      narrative: output.script.narrative, // Save full narrative, not truncated
      narrativeLength: output.script.narrative?.length || 0,
      boundEvidence: output.script.boundEvidence?.length || 0,
      durationEstimateSeconds: output.script.durationEstimateSeconds,
    },
    stats: output.stats,
  });
  
  logger.info('Script stage completed', {
    narrativeLength: output.script.narrative?.length || 0,
    wordCount: output.stats.wordCount,
    estimatedDurationMinutes: output.stats.estimatedDurationMinutes,
  });
  
  return output;
}

async function testQaStage(runId: string) {
  logger.info('Testing QA Stage with stubs');
  
  // Load required inputs
  const scriptOutput = await loadStageOutput(runId, 'script', STUB_RUN_ID);
  const extractOutput = await loadStageOutput(runId, 'extract');
  const qaInput = await loadStageInput(runId, 'qa');
  
  // Create gateways
  const gatewayConfig = {
    llmProvider: 'openai' as const,
    ttsProvider: 'openai' as const,
    httpProvider: 'stub' as const,
    openaiApiKey: process.env.OPENAI_API_KEY || '',
  };
  const llmGateway = GatewayFactory.createLlmGateway(gatewayConfig);
  
  const emitter = new RealtimeEventEmitter((update) => {
    logger.info(`[QA] ${update.message}`, { pct: update.pct });
  });
  
  const stage = new QAStage(llmGateway);
  
  // Prepare input
  const script = scriptOutput.script?.narrative || scriptOutput.narrative || '';
  const evidenceUnits = extractOutput.units || [];
  
  // Get time window from input or use defaults (last 30 days)
  const now = new Date();
  const timeWindowStart = qaInput.timeWindowStart 
    ? new Date(qaInput.timeWindowStart) 
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const timeWindowEnd = qaInput.timeWindowEnd 
    ? new Date(qaInput.timeWindowEnd) 
    : now;
  
  logger.info('QA input', {
    scriptLength: script.length,
    evidenceCount: evidenceUnits.length,
    timeWindowStart: timeWindowStart.toISOString(),
    timeWindowEnd: timeWindowEnd.toISOString(),
  });
  
  const input = {
    script: script.substring(0, 500),
    scriptLength: script.length,
    evidenceCount: evidenceUnits.length,
    timeWindowStart: timeWindowStart.toISOString(),
    timeWindowEnd: timeWindowEnd.toISOString(),
  };
  
  // Execute stage
  const output = await stage.execute(
    script,
    evidenceUnits,
    timeWindowStart,
    timeWindowEnd,
    emitter
  );
  
  // Save I/O
  await saveStageIO('qa', input, {
    scriptLength: output.script.length,
    finalScriptLength: output.finalScript.length,
    checkMarkers: output.checkMarkers.length,
    evidenceBindings: output.evidenceBindings.length,
    dateChecks: output.dateChecks,
    stats: output.stats,
  });
  
  logger.info('QA stage completed', {
    totalChecks: output.stats.totalChecks,
    resolved: output.stats.resolved,
    failed: output.stats.failed,
    totalBindings: output.stats.totalBindings,
    dateViolations: output.stats.dateViolations,
  });
  
  return output;
}

async function testTtsStage(runId: string) {
  logger.info('Testing TTS Stage with stubs');
  
  // Load required inputs - use script output (QA might not have full script saved)
  const scriptOutput = await loadStageOutput(runId, 'script', STUB_RUN_ID);
  const ttsInput = await loadStageInput(runId, 'tts');
  
  // Create gateways
  const gatewayConfig = {
    llmProvider: 'openai' as const,
    ttsProvider: 'openai' as const,
    httpProvider: 'stub' as const,
    openaiApiKey: process.env.OPENAI_API_KEY || '',
  };
  const ttsGateway = GatewayFactory.createTtsGateway(gatewayConfig);
  
  const emitter = new RealtimeEventEmitter((update) => {
    logger.info(`[TTS] ${update.message}`, { pct: update.pct });
  });
  
  const stage = new TtsStage(ttsGateway);
  
  // Prepare input - get narrative from script output
  const narrative = scriptOutput.script?.narrative || scriptOutput.narrative || '';
  
  if (!narrative) {
    throw new Error('No narrative found in script output');
  }
  
  // Create Script object
  const script = {
    narrative,
    boundEvidence: [],
    durationEstimateSeconds: 0,
  };
  
  const voiceId = ttsInput.voiceId || 'alloy';
  const speed = ttsInput.speed || 1.0;
  
  logger.info('TTS input', {
    scriptLength: narrative.length,
    wordCount: narrative.split(/\s+/).length,
    voiceId,
    speed,
  });
  
  const input = {
    scriptLength: narrative.length,
    wordCount: narrative.split(/\s+/).length,
    voiceId,
    speed,
  };
  
  // Execute stage
  const output = await stage.execute(
    script,
    voiceId,
    speed,
    emitter
  );
  
  // Save I/O
  await saveStageIO('tts', input, {
    audioSize: output.audioBuffer.length,
    audioSizeKB: Math.round(output.audioBuffer.length / 1024),
    durationSeconds: output.durationSeconds,
    metadata: output.metadata,
  });
  
  // Save audio file
  const audioPath = join(DEBUG_DIR, STUB_RUN_ID, 'audio.mp3');
  await writeFile(audioPath, output.audioBuffer);
  logger.info(`Saved audio to ${audioPath}`);
  
  logger.info('TTS stage completed', {
    audioSizeKB: Math.round(output.audioBuffer.length / 1024),
    durationSeconds: output.durationSeconds,
  });
  
  return output;
}

async function testPackageStage(runId: string) {
  logger.info('Testing Package Stage with stubs');
  
  // Load required inputs
  const scriptOutput = await loadStageOutput(runId, 'script', STUB_RUN_ID);
  const ttsOutput = await loadStageOutput(runId, 'tts', STUB_RUN_ID);
  const outlineOutput = await loadStageOutput(runId, 'outline', STUB_RUN_ID);
  const extractOutput = await loadStageOutput(runId, 'extract');
  
  const emitter = new RealtimeEventEmitter((update) => {
    logger.info(`[Package] ${update.message}`, { pct: update.pct });
  });
  
  const stage = new PackageStage();
  
  // Prepare input
  const episodeId = runId;
  const script = scriptOutput.script?.narrative || scriptOutput.narrative || '';
  const audioUrl = `http://localhost:3000/output/episodes/${STUB_RUN_ID}/audio.mp3`;
  const audioDurationSeconds = ttsOutput.durationSeconds || ttsOutput.metadata?.durationSeconds || 0;
  const outline = outlineOutput.outline || outlineOutput;
  const evidenceUnits = extractOutput.units || [];
  const publishDate = new Date();
  const outputDir = join(DEBUG_DIR, STUB_RUN_ID);
  
  logger.info('Package input', {
    episodeId,
    scriptLength: script.length,
    audioUrl,
    audioDurationSeconds,
    outlineSegments: outline.segments?.length || 0,
    evidenceCount: evidenceUnits.length,
    outputDir,
  });
  
  const input = {
    episodeId,
    scriptLength: script.length,
    audioUrl,
    audioDurationSeconds,
    outlineSegments: outline.segments?.length || 0,
    evidenceCount: evidenceUnits.length,
    outputDir,
  };
  
  // Execute stage
  const output = await stage.execute(
    episodeId,
    script,
    audioUrl,
    audioDurationSeconds,
    outline,
    evidenceUnits,
    publishDate,
    outputDir,
    emitter
  );
  
  // Save I/O
  await saveStageIO('package', input, {
    showNotesPath: output.showNotesPath,
    transcriptVttPath: output.transcriptVttPath,
    transcriptTxtPath: output.transcriptTxtPath,
    sourcesJsonPath: output.sourcesJsonPath,
    rssItemLength: output.rssItem.length,
  });
  
  logger.info('Package stage completed', {
    showNotesPath: output.showNotesPath,
    transcriptVttPath: output.transcriptVttPath,
    transcriptTxtPath: output.transcriptTxtPath,
    sourcesJsonPath: output.sourcesJsonPath,
  });
  
  return output;
}

async function main() {
  const stageName = process.argv[2];
  const runId = process.argv[3] || 'run_1763439862339_bmo4vk';
  
  if (!stageName) {
    console.error('Usage: npx tsx test-stage-stub.ts <stage-name> [run-id]');
    console.error('Stages: contrast, outline, script, qa, tts, package');
    process.exit(1);
  }
  
  logger.info(`Testing ${stageName} stage with stubs from ${runId}`);
  
  try {
    let output;
    switch (stageName) {
      case 'contrast':
        output = await testContrastStage(runId);
        break;
      case 'outline':
        output = await testOutlineStage(runId);
        break;
      case 'script':
        output = await testScriptStage(runId);
        break;
      case 'qa':
        output = await testQaStage(runId);
        break;
      case 'tts':
        output = await testTtsStage(runId);
        break;
      case 'package':
        output = await testPackageStage(runId);
        break;
      default:
        console.error(`Unknown stage: ${stageName}`);
        process.exit(1);
    }
    
    logger.info(`✅ ${stageName} stage test completed successfully`);
    process.exit(0);
  } catch (error: any) {
    logger.error(`❌ ${stageName} stage test failed`, { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

main();

