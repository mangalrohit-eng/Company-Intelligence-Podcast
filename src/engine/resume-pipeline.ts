/**
 * Resume Pipeline from Stage
 * 
 * Loads previous stage outputs and continues execution from a specific stage
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { PipelineOrchestrator } from './orchestrator';
import { PipelineInput, PipelineOutput } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { logger } from '@/utils/logger';

const STAGES = [
  'prepare',
  'discover',
  'disambiguate',
  'rank',
  'scrape',
  'extract',
  'summarize',
  'contrast',
  'outline',
  'script',
  'qa',
  'tts',
  'package',
] as const;

type StageName = typeof STAGES[number];

async function loadStageOutput(runId: string, stageName: string): Promise<any> {
  const filePath = join(process.cwd(), 'output', 'episodes', runId, 'debug', `${stageName}_output.json`);
  if (!existsSync(filePath)) {
    return null;
  }
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function loadStageInput(runId: string, stageName: string): Promise<any> {
  const filePath = join(process.cwd(), 'output', 'episodes', runId, 'debug', `${stageName}_input.json`);
  if (!existsSync(filePath)) {
    return null;
  }
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Resume pipeline execution from a specific stage
 * Loads all previous stage outputs and continues from the specified stage
 */
export async function resumePipeline(
  runId: string,
  fromStage: StageName,
  originalInput: PipelineInput,
  emitter: IEventEmitter
): Promise<PipelineOutput> {
  logger.info(`Resuming pipeline from stage: ${fromStage}`, { runId });

  // Load all previous stage outputs
  const stageIndex = STAGES.indexOf(fromStage);
  if (stageIndex === -1) {
    throw new Error(`Invalid stage: ${fromStage}`);
  }

  // Load outputs from all stages before fromStage
  const previousOutputs: Record<string, any> = {};
  for (let i = 0; i < stageIndex; i++) {
    const stageName = STAGES[i];
    const output = await loadStageOutput(runId, stageName);
    if (output) {
      previousOutputs[stageName] = output;
      logger.info(`Loaded ${stageName} output`, { 
        hasOutput: true,
        // Log key fields for each stage
        ...(stageName === 'scrape' && { successCount: output.stats?.successCount }),
        ...(stageName === 'extract' && { totalUnits: output.stats?.totalUnits }),
        ...(stageName === 'summarize' && { summaryCount: output.summaryCount }),
        ...(stageName === 'contrast' && { contrastCount: output.contrastCount }),
        ...(stageName === 'outline' && { segmentCount: output.segmentCount }),
      });
    } else {
      logger.warn(`Previous stage output not found: ${stageName}`, { runId });
    }
  }

  // Create a modified input that includes loaded outputs
  // The orchestrator will need to check for these and skip those stages
  const resumeInput: PipelineInput & { _resumeFrom?: StageName; _previousOutputs?: Record<string, any> } = {
    ...originalInput,
    _resumeFrom: fromStage,
    _previousOutputs: previousOutputs,
  };

  // Execute pipeline (orchestrator will need to be modified to handle resume)
  // For now, we'll use the stub test approach - execute individual stages
  const orchestrator = new PipelineOrchestrator();
  
  // Note: The orchestrator's execute method doesn't currently support resume
  // We would need to modify it to check for _resumeFrom and _previousOutputs
  // For now, this is a placeholder that shows the structure
  
  return await orchestrator.execute(resumeInput, emitter);
}

