/**
 * Stage 1: Prepare Inputs
 * Freeze config; compute targets/budgets
 * Per requirements: Speech budget ~150 wpm, Evidence units = round(duration_min * 2)
 */

import { PipelineInput, PodcastConfigSnapshot } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { logger } from '@/utils/logger';

export interface PrepareOutput {
  // Frozen config snapshot
  frozenConfig: PodcastConfigSnapshot;
  
  // Derived targets per requirements
  speechBudgetWords: number; // ~150 wpm
  evidenceTargetUnits: number; // round(duration_min * 2)
  
  // Per-topic allocations based on priority weights
  topicAllocations: Record<string, { 
    targetUnits: number; 
    timeBudgetSeconds: number;
    priorityWeight: number;
  }>;
  
  // Global budgets
  globalTimeBudgetSeconds: number;
}

export class PrepareStage {
  async execute(input: PipelineInput, emitter: IEventEmitter): Promise<PrepareOutput> {
    await emitter.emit('prepare', 0, 'Freezing config and computing targets');

    // Step 1: Freeze config snapshot (immutable for this run)
    const frozenConfig = JSON.parse(JSON.stringify(input.config)) as PodcastConfigSnapshot;

    await emitter.emit('prepare', 20, 'Config frozen');

    // Step 2: Calculate speech budget: ~150 wpm (per requirements section 2.3.2)
    const speechBudgetWords = Math.round(frozenConfig.durationMinutes * 150);

    // Step 3: Calculate evidence target: total_units = round(duration_min * 2)
    const evidenceTargetUnits = Math.round(frozenConfig.durationMinutes * 2);

    await emitter.emit('prepare', 40, 'Calculated speech and evidence budgets', 'info', {
      speechBudgetWords,
      evidenceTargetUnits,
    });

    // Step 4: Allocate evidence units across topics by priority weights
    const allTopics = [...frozenConfig.topics.standard, ...frozenConfig.topics.special];
    const totalPriority = allTopics.reduce((sum, t) => sum + t.priority, 0);

    const topicAllocations: Record<string, { 
      targetUnits: number; 
      timeBudgetSeconds: number;
      priorityWeight: number;
    }> = {};

    for (const topic of allTopics) {
      const priorityRatio = topic.priority / totalPriority;
      const targetUnits = Math.max(1, Math.round(evidenceTargetUnits * priorityRatio));
      const timeBudgetSeconds = Math.round(frozenConfig.durationMinutes * 60 * priorityRatio);

      topicAllocations[topic.id] = {
        targetUnits,
        timeBudgetSeconds,
        priorityWeight: topic.priority,
      };
    }

    const globalTimeBudgetSeconds = frozenConfig.durationMinutes * 60;

    await emitter.emit('prepare', 80, 'Allocated budgets across topics', 'info', {
      topicCount: allTopics.length,
      totalEvidenceTarget: evidenceTargetUnits,
    });

    logger.info('Prepare stage complete', {
      runId: input.runId,
      speechBudgetWords,
      evidenceTargetUnits,
      topicCount: allTopics.length,
      globalTimeBudgetSeconds,
    });

    await emitter.emit('prepare', 100, 'Input preparation complete');

    return {
      frozenConfig,
      speechBudgetWords,
      evidenceTargetUnits,
      topicAllocations,
      globalTimeBudgetSeconds,
    };
  }
}

