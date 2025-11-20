/**
 * Real-time Event Emitter for Pipeline Progress
 * Updates run status in real-time during execution
 */

import { IEventEmitter } from './event-emitter';
import { logger } from './logger';

export interface RunUpdateCallback {
  (update: {
    currentStage?: string;
    stageStatus?: 'running' | 'completed' | 'failed';
    stageProgress?: number;
    error?: string;
    stageStartedAt?: string;
    stageCompletedAt?: string;
  }): void;
}

export class RealtimeEventEmitter implements IEventEmitter {
  private currentStage: string = '';
  private callback: RunUpdateCallback;

  constructor(callback: RunUpdateCallback) {
    this.callback = callback;
  }

  async emit(
    stage: string,
    progress: number,
    message: string,
    level: 'info' | 'warn' | 'error' = 'info',
    metadata?: Record<string, any>
  ): Promise<void> {
    // Update currentStage synchronously to avoid race conditions
    const isStageChange = stage !== this.currentStage;
    const oldStage = this.currentStage;
    
    if (isStageChange) {
      this.currentStage = stage;
    }

    // Call callback SYNCHRONOUSLY to ensure updates happen in order
    // This prevents stages from appearing to run simultaneously
    try {
      if (isStageChange) {
        // DON'T mark old stage as completed here - let the orchestrator do it explicitly
        // This prevents stages from appearing as completed before they actually finish
        
        // Start new stage - await to ensure it completes before next emit
        await this.callback({
          currentStage: stage,
          stageStatus: 'running',
          stageStartedAt: new Date().toISOString(),
          stageProgress: progress,
        });
      } else {
        // Update progress for current stage - await to ensure order
        await this.callback({
          stageProgress: progress,
        });
      }
    } catch (error) {
      // Don't let callback errors break the pipeline
      logger.error('Error in emitter callback', { error, stage, progress });
    }

    // Log the event (this is fast and non-blocking)
    logger.info(`[${stage}] ${message}`, { progress, level, ...metadata });
  }

  async markStageCompleted(stage: string): Promise<void> {
    // Await the callback to ensure the update completes before continuing
    await this.callback({
      currentStage: stage,
      stageStatus: 'completed',
      stageCompletedAt: new Date().toISOString(),
      stageProgress: 100,
    });
  }

  markStageFailed(stage: string, error: string): void {
    this.callback({
      currentStage: stage,
      stageStatus: 'failed',
      stageCompletedAt: new Date().toISOString(),
      error,
    });
  }

  // Required by IEventEmitter interface
  setSubstage(substage: string): void {
    // Not implemented for realtime emitter, but required by interface
    logger.debug(`Substage set: ${substage}`);
  }

  clearSubstage(): void {
    // Not implemented for realtime emitter, but required by interface
    logger.debug('Substage cleared');
  }
}

