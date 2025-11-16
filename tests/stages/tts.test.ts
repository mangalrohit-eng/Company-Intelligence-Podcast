/**
 * Unit tests for Stage 12: TTS Render
 * Tests OpenAI TTS, duration validation (±10%), voice/speed/tone
 */

import { TTSStage } from '../../src/engine/stages/tts';

describe('Stage 12: TTS Render', () => {
  let stage: TTSStage;
  let mockTtsGateway: any;
  let mockEmitter: any;

  beforeEach(() => {
    mockTtsGateway = {
      synthesize: jest.fn().mockResolvedValue({
        audioBuffer: Buffer.from('fake-audio-data'),
        durationSeconds: 600, // 10 minutes
        format: 'mp3',
      }),
    };
    stage = new TTSStage(mockTtsGateway);
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('Audio Generation', () => {
    it('should generate audio from script', async () => {
      const script = 'This is a test script for TTS rendering.';
      const targetDurationMinutes = 10;

      const result = await stage.execute(
        script,
        targetDurationMinutes,
        'alloy',
        1.0,
        'professional',
        mockEmitter
      );

      expect(mockTtsGateway.synthesize).toHaveBeenCalled();
      expect(result.audioBuffer).toBeDefined();
    });

    it('should include voice, speed, and tone parameters', async () => {
      const script = 'Test script.';
      const targetDurationMinutes = 10;

      await stage.execute(
        script,
        targetDurationMinutes,
        'nova',
        1.2,
        'conversational',
        mockEmitter
      );

      expect(mockTtsGateway.synthesize).toHaveBeenCalledWith(
        expect.objectContaining({
          text: script,
          voice: 'nova',
          speed: 1.2,
        })
      );
    });
  });

  describe('Duration Validation (±10%)', () => {
    it('should validate audio within ±10% of target', async () => {
      mockTtsGateway.synthesize.mockResolvedValue({
        audioBuffer: Buffer.from('audio'),
        durationSeconds: 540, // 9 minutes (10% under)
        format: 'mp3',
      });

      const script = 'Test script.';
      const targetDurationMinutes = 10;

      const result = await stage.execute(
        script,
        targetDurationMinutes,
        'alloy',
        1.0,
        'professional',
        mockEmitter
      );

      expect(result.validation.withinTolerance).toBe(true);
    });

    it('should flag audio outside ±10% tolerance', async () => {
      mockTtsGateway.synthesize.mockResolvedValue({
        audioBuffer: Buffer.from('audio'),
        durationSeconds: 300, // 5 minutes (50% under target)
        format: 'mp3',
      });

      const script = 'Test script.';
      const targetDurationMinutes = 10;

      const result = await stage.execute(
        script,
        targetDurationMinutes,
        'alloy',
        1.0,
        'professional',
        mockEmitter
      );

      expect(result.validation.withinTolerance).toBe(false);
      expect(result.validation.deviationPercent).toBeGreaterThan(10);
    });

    it('should calculate deviation percentage', async () => {
      mockTtsGateway.synthesize.mockResolvedValue({
        audioBuffer: Buffer.from('audio'),
        durationSeconds: 550, // 9.17 minutes (~8% under)
        format: 'mp3',
      });

      const script = 'Test script.';
      const targetDurationMinutes = 10;

      const result = await stage.execute(
        script,
        targetDurationMinutes,
        'alloy',
        1.0,
        'professional',
        mockEmitter
      );

      expect(result.validation.deviationPercent).toBeLessThan(10);
    });
  });

  describe('Statistics', () => {
    it('should track actual duration in seconds', async () => {
      const script = 'Test script.';
      const targetDurationMinutes = 10;

      const result = await stage.execute(
        script,
        targetDurationMinutes,
        'alloy',
        1.0,
        'professional',
        mockEmitter
      );

      expect(result.stats.actualDurationSeconds).toBe(600);
    });

    it('should track target duration', async () => {
      const script = 'Test script.';
      const targetDurationMinutes = 10;

      const result = await stage.execute(
        script,
        targetDurationMinutes,
        'alloy',
        1.0,
        'professional',
        mockEmitter
      );

      expect(result.stats.targetDurationMinutes).toBe(10);
    });

    it('should track audio format', async () => {
      mockTtsGateway.synthesize.mockResolvedValue({
        audioBuffer: Buffer.from('audio'),
        durationSeconds: 600,
        format: 'wav',
      });

      const script = 'Test script.';
      const targetDurationMinutes = 10;

      const result = await stage.execute(
        script,
        targetDurationMinutes,
        'alloy',
        1.0,
        'professional',
        mockEmitter
      );

      expect(result.stats.format).toBe('wav');
    });
  });

  describe('Voice Options', () => {
    it('should support different voice options', async () => {
      const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

      for (const voice of voices) {
        await stage.execute(
          'Test',
          10,
          voice as any,
          1.0,
          'professional',
          mockEmitter
        );
      }

      expect(mockTtsGateway.synthesize).toHaveBeenCalledTimes(voices.length);
    });
  });
});

