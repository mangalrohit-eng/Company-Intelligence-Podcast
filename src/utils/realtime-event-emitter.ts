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
    // Detect stage changes
    if (stage !== this.currentStage) {
      // Mark old stage as completed if it exists
      if (this.currentStage) {
        this.callback({
          stageStatus: 'completed',
          stageCompletedAt: new Date().toISOString(),
        });
      }

      // Start new stage
      this.currentStage = stage;
      this.callback({
        currentStage: stage,
        stageStatus: 'running',
        stageStartedAt: new Date().toISOString(),
        stageProgress: progress,
      });
    } else {
      // Update progress for current stage
      this.callback({
        stageProgress: progress,
      });
    }

    // Log the event
    logger.info(`[${stage}] ${message}`, { progress, level, ...metadata });
  }

  markStageCompleted(stage: string): void {
    this.callback({
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
}

