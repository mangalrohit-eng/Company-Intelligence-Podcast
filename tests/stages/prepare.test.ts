/**
 * Unit tests for Stage 1: Prepare
 * Tests budget calculations and config freezing
 */

import { PrepareStage } from '../../src/engine/stages/prepare';
import { PipelineInput } from '../../src/types/shared';
import { EventEmitter } from 'events';

describe('Stage 1: Prepare', () => {
  let stage: PrepareStage;
  let mockEmitter: any;

  beforeEach(() => {
    stage = new PrepareStage();
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('Budget Calculations', () => {
    it('should calculate speech budget at ~150 wpm', async () => {
      const input: PipelineInput = {
        runId: 'test-run',
        config: {
          durationMinutes: 10,
          topics: { standard: [], special: [] },
        } as any,
        flags: {} as any,
      };

      const result = await stage.execute(input, mockEmitter);

      expect(result.speechBudgetWords).toBe(1500); // 10 min * 150 wpm
    });

    it('should calculate evidence target as round(duration * 2)', async () => {
      const input: PipelineInput = {
        runId: 'test-run',
        config: {
          durationMinutes: 10,
          topics: { standard: [], special: [] },
        } as any,
        flags: {} as any,
      };

      const result = await stage.execute(input, mockEmitter);

      expect(result.evidenceTargetUnits).toBe(20); // 10 min * 2
    });

    it('should allocate budgets across topics by priority', async () => {
      const input: PipelineInput = {
        runId: 'test-run',
        config: {
          durationMinutes: 10,
          topics: {
            standard: [
              { id: 'topic1', name: 'Topic 1', priority: 3 },
              { id: 'topic2', name: 'Topic 2', priority: 2 },
            ],
            special: [
              { id: 'topic3', name: 'Topic 3', priority: 1 },
            ],
          },
        } as any,
        flags: {} as any,
      };

      const result = await stage.execute(input, mockEmitter);

      expect(result.topicAllocations['topic1'].targetUnits).toBeGreaterThan(
        result.topicAllocations['topic2'].targetUnits
      );
      expect(result.topicAllocations['topic2'].targetUnits).toBeGreaterThan(
        result.topicAllocations['topic3'].targetUnits
      );
    });
  });

  describe('Config Freezing', () => {
    it('should freeze config as snapshot', async () => {
      const input: PipelineInput = {
        runId: 'test-run',
        config: {
          durationMinutes: 10,
          topics: { standard: [], special: [] },
        } as any,
        flags: {} as any,
      };

      const result = await stage.execute(input, mockEmitter);

      expect(result.frozenConfig).toBeDefined();
      expect(result.frozenConfig.durationMinutes).toBe(10);
    });
  });

  describe('Event Emission', () => {
    it('should emit progress events', async () => {
      const input: PipelineInput = {
        runId: 'test-run',
        config: {
          durationMinutes: 10,
          topics: { standard: [], special: [] },
        } as any,
        flags: {} as any,
      };

      await stage.execute(input, mockEmitter);

      expect(mockEmitter.emit).toHaveBeenCalledWith('prepare', 0, expect.any(String));
      expect(mockEmitter.emit).toHaveBeenCalledWith('prepare', 100, expect.any(String));
    });
  });
});

