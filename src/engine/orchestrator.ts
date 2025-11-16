/**
 * Pipeline Orchestrator
 * Executes all stages in sequence based on RunFlags
 */

import { PipelineInput, PipelineOutput, RunTelemetry, EvidenceUnit } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { GatewayFactory } from '@/gateways/factory';
import { PrepareStage } from './stages/prepare';
import { DiscoverStage } from './stages/discover';
import { DisambiguateStage } from './stages/disambiguate';
import { RankStage } from './stages/rank';
import { ScrapeStage } from './stages/scrape';
import { ExtractStage } from './stages/extract';
import { SummarizeStage } from './stages/summarize';
import { ContrastStage } from './stages/contrast';
import { OutlineStage } from './stages/outline';
import { ScriptStage } from './stages/script';
import { QAStage } from './stages/qa';
import { TtsStage } from './stages/tts';
import { PackageStage } from './stages/package';
import { logger } from '@/utils/logger';

export class PipelineOrchestrator {
  async execute(input: PipelineInput, emitter: IEventEmitter): Promise<PipelineOutput> {
    const startTime = new Date();
    logger.info('Pipeline execution started', { runId: input.runId });

    const telemetry: RunTelemetry = {
      startTime: startTime.toISOString(),
      endTime: '',
      durationSeconds: 0,
      stages: {},
    };

    try {
      // Initialize gateways
      const gatewayConfig = {
        llmProvider: input.flags.provider.llm,
        ttsProvider: input.flags.provider.tts,
        httpProvider: input.flags.provider.http,
        cassetteKey: input.flags.cassetteKey,
        cassettePath: process.env.CASSETTE_PATH || './cassettes',
        openaiApiKey: process.env.OPENAI_API_KEY,
      };

      const llmGateway = GatewayFactory.createLlmGateway(gatewayConfig);
      const ttsGateway = GatewayFactory.createTtsGateway(gatewayConfig);
      const httpGateway = GatewayFactory.createHttpGateway(gatewayConfig);

      // Stage 1: Prepare
      if (input.flags.enable.discover || input.flags.dryRun) {
        const stage = new PrepareStage();
        const stageStart = Date.now();
        await stage.execute(input, emitter);
        telemetry.stages.prepare = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
      }

      // Stage 2: Discover
      let discoverOutput;
      if (input.flags.enable.discover) {
        const stage = new DiscoverStage(llmGateway, httpGateway);
        const stageStart = Date.now();
        discoverOutput = await stage.execute(input, emitter);
        telemetry.stages.discover = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
        telemetry.discovery = {
          totalItemsFound: discoverOutput.stats.totalFound,
          itemsByTopic: discoverOutput.stats.byTopic,
        };
      }

      // Stage 3: Disambiguate
      let disambiguateOutput;
      if (input.flags.enable.discover && discoverOutput) {
        const stage = new DisambiguateStage(llmGateway);
        const stageStart = Date.now();
        disambiguateOutput = await stage.execute(
          discoverOutput.items,
          input.config.allowDomains || [],
          input.config.blockDomains || [],
          input.config.robotsMode,
          emitter
        );
        telemetry.stages.disambiguate = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
      }

      // Stage 4: Rank
      let rankOutput;
      if (input.flags.enable.discover && disambiguateOutput) {
        const stage = new RankStage();
        const stageStart = Date.now();
        // Filter to non-blocked items
        const validItems = disambiguateOutput.items.filter(item => !item.blocked);
        rankOutput = await stage.execute(validItems, emitter);
        telemetry.stages.rank = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
      }

      // Stage 5: Scrape
      let scrapeOutput;
      if (input.flags.enable.scrape && rankOutput) {
        const stage = new ScrapeStage(httpGateway);
        const stageStart = Date.now();
        // Get top-ranked items from all topic queues
        const rankedItems = Array.from(rankOutput.topicQueues.values()).flat();
        const topicTargets = Object.fromEntries(
          [...input.config.topics.standard, ...input.config.topics.special].map(t => [
            t.id,
            { targetUnits: Math.round(input.config.durationMinutes * 2 / (input.config.topics.standard.length + input.config.topics.special.length)) }
          ])
        );
        
        scrapeOutput = await stage.execute(
          rankedItems,
          topicTargets,
          input.config.robotsMode,
          emitter
        );
        telemetry.stages.scrape = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
        telemetry.scrape = {
          totalUrls: scrapeOutput.stats.totalUrls,
          successCount: scrapeOutput.stats.successCount,
          failureCount: scrapeOutput.stats.failureCount,
          avgLatencyMs: scrapeOutput.stats.avgLatencyMs,
          domainStats: Object.entries(scrapeOutput.stats.domainStats).reduce((acc, [domain, stats]) => {
            acc[domain] = {
              success: stats.success,
              failure: stats.failure,
              avgLatencyMs: stats.avgLatencyMs,
            };
            return acc;
          }, {} as Record<string, { success: number; failure: number; avgLatencyMs: number }>),
        };
      }

      // Stage 6: Extract Evidence
      let extractOutput;
      if (input.flags.enable.extract && scrapeOutput) {
        const stage = new ExtractStage(llmGateway);
        const stageStart = Date.now();
        extractOutput = await stage.execute(scrapeOutput.contents, emitter);
        telemetry.stages.extract = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
        telemetry.evidence = {
          totalUnits: extractOutput.stats.totalUnits,
          targetUnits: 0,
          unitsByTopic: extractOutput.stats.byTopic,
        };
      }

      // Group evidence by topic
      const evidenceByTopic = new Map<string, EvidenceUnit[]>();
      if (extractOutput) {
        for (const unit of extractOutput.units) {
          if (!evidenceByTopic.has(unit.topicId)) {
            evidenceByTopic.set(unit.topicId, []);
          }
          evidenceByTopic.get(unit.topicId)!.push(unit);
        }
      }

      // Stage 7: Summarize
      let summarizeOutput;
      if (input.flags.enable.summarize && extractOutput) {
        const stage = new SummarizeStage(llmGateway);
        const stageStart = Date.now();
        const topicIds = [...input.config.topics.standard, ...input.config.topics.special].map((t) => t.id);
        summarizeOutput = await stage.execute(topicIds, evidenceByTopic, emitter);
        telemetry.stages.summarize = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
      }

      // Stage 8: Competitor Contrasts
      let contrastOutput;
      if (input.flags.enable.contrast && extractOutput && summarizeOutput) {
        const stage = new ContrastStage(llmGateway);
        const stageStart = Date.now();
        const topicIds = [...input.config.topics.standard, ...input.config.topics.special].map((t) => t.id);
        const competitors = input.config.competitors?.map(c => c.name) || [];
        contrastOutput = await stage.execute(
          topicIds,
          evidenceByTopic,
          input.config.company.name,
          competitors,
          emitter
        );
        telemetry.stages.contrast = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
      }

      // Stage 9: Outline
      let outlineOutput;
      if (input.flags.enable.outline && summarizeOutput) {
        const stage = new OutlineStage(llmGateway);
        const stageStart = Date.now();
        outlineOutput = await stage.execute(summarizeOutput.summaries, input.config.company.name, emitter);
        telemetry.stages.outline = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
      }

      // Stage 10: Script
      let scriptOutput;
      if (input.flags.enable.script && outlineOutput && summarizeOutput && contrastOutput) {
        const stage = new ScriptStage(llmGateway);
        const stageStart = Date.now();
        scriptOutput = await stage.execute(
          outlineOutput.outline,
          summarizeOutput.summaries,
          contrastOutput.contrasts,
          input.config.durationMinutes,
          emitter
        );
        telemetry.stages.script = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
      }

      // Stage 11: QA & Bind
      let qaOutput;
      if (input.flags.enable.qa && scriptOutput && extractOutput) {
        const stage = new QAStage(llmGateway);
        const stageStart = Date.now();
        const timeWindowStart = new Date(input.config.timeWindow.startIso);
        const timeWindowEnd = new Date(input.config.timeWindow.endIso);
        qaOutput = await stage.execute(
          scriptOutput.script.narrative,
          extractOutput.units,
          timeWindowStart,
          timeWindowEnd,
          emitter
        );
        telemetry.stages.qa = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
      }

      // Stage 12: TTS
      let ttsOutput;
      let audioS3Key: string | undefined;
      const finalScript = qaOutput?.script || scriptOutput?.script.narrative || '';
      if (input.flags.enable.tts && finalScript) {
        const stage = new TtsStage(ttsGateway);
        const stageStart = Date.now();
        ttsOutput = await stage.execute(
          finalScript,
          input.config.durationMinutes,
          input.config.voice.voiceId,
          input.config.voice.speed,
          emitter
        );
        telemetry.stages.tts = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
        telemetry.tts = {
          audioDurationSeconds: ttsOutput.durationSeconds,
          generationTimeSeconds: (Date.now() - stageStart) / 1000,
          finalSpeed: input.config.voice.speed,
        };

        // TODO: Upload audio to S3
        audioS3Key = `runs/${input.runId}/audio.mp3`;
      }

      // Stage 13: Package & RSS
      let packageOutput;
      if (input.flags.enable.package && ttsOutput && outlineOutput && extractOutput) {
        const stage = new PackageStage();
        const stageStart = Date.now();
        const outputDir = `./output/episodes/${input.runId}`;
        const audioUrl = `https://cdn.example.com/${audioS3Key}`;
        
        packageOutput = await stage.execute(
          input.runId,
          finalScript,
          audioUrl,
          ttsOutput.durationSeconds,
          outlineOutput.outline,
          extractOutput.units,
          new Date(),
          outputDir,
          emitter
        );
        telemetry.stages.package = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
      }

      // Finalize
      const endTime = new Date();
      telemetry.endTime = endTime.toISOString();
      telemetry.durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      logger.info('Pipeline execution completed - ALL 13 STAGES', {
        runId: input.runId,
        durationSeconds: telemetry.durationSeconds,
        stagesCompleted: Object.keys(telemetry.stages).length,
      });

      return {
        runId: input.runId,
        status: 'success',
        artifacts: {
          mp3S3Key: audioS3Key,
          showNotesPath: packageOutput?.showNotesPath,
          transcriptVttPath: packageOutput?.transcriptVttPath,
          transcriptTxtPath: packageOutput?.transcriptTxtPath,
          sourcesJsonPath: packageOutput?.sourcesJsonPath,
          rssItem: packageOutput?.rssItem,
        },
        telemetry,
      };
    } catch (error) {
      logger.error('Pipeline execution failed', { runId: input.runId, error });

      const endTime = new Date();
      telemetry.endTime = endTime.toISOString();
      telemetry.durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      return {
        runId: input.runId,
        status: 'failed',
        artifacts: {},
        telemetry,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

