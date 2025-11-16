/**
 * Run Event Emitter - emits progress events during pipeline execution
 */

import { v4 as uuidv4 } from 'uuid';
import { RunEvent, RunEventStage, RunEventLevel } from '@/types/shared';
import { logger } from './logger';

export interface IEventEmitter {
  emit(stage: RunEventStage, pct: number, message: string, level?: RunEventLevel, payload?: Record<string, unknown>): Promise<void>;
  setSubstage(substage: string): void;
  clearSubstage(): void;
}

export class RunEventEmitter implements IEventEmitter {
  private runId: string;
  private currentSubstage?: string;
  private persistFn?: (event: RunEvent) => Promise<void>;

  constructor(runId: string, persistFn?: (event: RunEvent) => Promise<void>) {
    this.runId = runId;
    this.persistFn = persistFn;
  }

  setSubstage(substage: string): void {
    this.currentSubstage = substage;
  }

  clearSubstage(): void {
    this.currentSubstage = undefined;
  }

  async emit(
    stage: RunEventStage,
    pct: number,
    message: string,
    level: RunEventLevel = 'info',
    payload?: Record<string, unknown>
  ): Promise<void> {
    const event: RunEvent = {
      id: uuidv4(),
      runId: this.runId,
      ts: new Date().toISOString(),
      stage,
      substage: this.currentSubstage,
      pct: Math.min(100, Math.max(0, pct)),
      level,
      message,
      payload,
    };

    logger.info(`[${stage}${this.currentSubstage ? ':' + this.currentSubstage : ''}] ${message}`, {
      pct,
      level,
    });

    if (this.persistFn) {
      try {
        await this.persistFn(event);
      } catch (error) {
        logger.error('Failed to persist run event', { error, event });
      }
    }
  }
}

export class NoOpEventEmitter implements IEventEmitter {
  async emit(
    _stage: RunEventStage,
    _pct: number,
    _message: string,
    _level?: RunEventLevel,
    _payload?: Record<string, unknown>
  ): Promise<void> {
    // No-op - used for CLI execution
  }

  setSubstage(_substage: string): void {
    // No-op
  }

  clearSubstage(): void {
    // No-op
  }
}

