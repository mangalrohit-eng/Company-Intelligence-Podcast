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
import { AdminSettings, DEFAULT_ADMIN_SETTINGS, calculateArticlesNeeded } from '@/types/admin-settings';

export class PipelineOrchestrator {
  /**
   * Load admin settings from file system
   */
  private async loadAdminSettings(): Promise<AdminSettings> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const settingsPath = path.join(process.cwd(), 'data', 'admin-settings.json');
      const data = await fs.readFile(settingsPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.info('Using default admin settings (file not found or error loading)');
      return DEFAULT_ADMIN_SETTINGS;
    }
  }

  async execute(input: PipelineInput, emitter: IEventEmitter): Promise<PipelineOutput> {
    const startTime = new Date();
    logger.info('Pipeline execution started', { runId: input.runId });

    // Load admin settings
    const adminSettings = await this.loadAdminSettings();
    logger.info('Loaded admin settings', { 
      wordsPerMinute: adminSettings.pipeline.wordsPerMinute,
      wordsPerArticle: adminSettings.pipeline.wordsPerArticle,
      scrapeSuccessRate: adminSettings.pipeline.scrapeSuccessRate,
      relevantTextRate: adminSettings.pipeline.relevantTextRate,
    });

    // Calculate article limit based on duration
    const articleLimit = calculateArticlesNeeded(input.config.durationMinutes, adminSettings.pipeline);
    logger.info('Calculated article limit', { 
      duration: input.config.durationMinutes,
      articleLimit,
      formula: `(${input.config.durationMinutes} × ${adminSettings.pipeline.wordsPerMinute}) / (${adminSettings.pipeline.scrapeSuccessRate} × ${adminSettings.pipeline.relevantTextRate} × ${adminSettings.pipeline.wordsPerArticle})`,
    });

    // Create debug output directory
    const fs = await import('fs/promises');
    const path = await import('path');
    const debugDir = path.join(process.cwd(), 'output', 'episodes', input.runId, 'debug');
    await fs.mkdir(debugDir, { recursive: true });
    logger.info('Debug output directory created', { debugDir });

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

      // Helper to save stage input/output
      const saveStageIO = async (stageName: string, inputData: any, outputData: any) => {
        try {
          await fs.writeFile(
            path.join(debugDir, `${stageName}_input.json`),
            JSON.stringify(inputData, null, 2)
          );
          await fs.writeFile(
            path.join(debugDir, `${stageName}_output.json`),
            JSON.stringify(outputData, null, 2)
          );
        } catch (error) {
          logger.warn(`Failed to save ${stageName} I/O`, { error });
        }
      };

      // Helper to execute stage with comprehensive error handling
      const executeStageWithErrorHandling = async <T>(
        stageName: string,
        stageExecutor: () => Promise<T>,
        onError?: (error: any) => void
      ): Promise<T | null> => {
        const stageStart = Date.now();
        try {
          logger.info(`Starting stage: ${stageName}`, { runId: input.runId });
          const result = await stageExecutor();
          
          telemetry.stages[stageName] = {
            startTime: new Date(stageStart).toISOString(),
            endTime: new Date().toISOString(),
            durationMs: Date.now() - stageStart,
            status: 'success',
          };
          
          logger.info(`Completed stage: ${stageName}`, { 
            runId: input.runId, 
            durationMs: Date.now() - stageStart,
          });
          
          // Mark stage as completed in emitter
          if ('markStageCompleted' in emitter && typeof emitter.markStageCompleted === 'function') {
            (emitter as any).markStageCompleted(stageName);
          }
          
          return result;
        } catch (error: any) {
          const errorMessage = error.message || String(error);
          const errorStack = error.stack || '';
          
          logger.error(`Stage ${stageName} failed`, {
            runId: input.runId,
            error: errorMessage,
            stack: errorStack,
            durationMs: Date.now() - stageStart,
          });
          
          telemetry.stages[stageName] = {
            startTime: new Date(stageStart).toISOString(),
            endTime: new Date().toISOString(),
            durationMs: Date.now() - stageStart,
            status: 'failed',
            error: errorMessage,
          };
          
          // Mark stage as failed in emitter
          if ('markStageFailed' in emitter && typeof emitter.markStageFailed === 'function') {
            (emitter as any).markStageFailed(stageName, errorMessage);
          }
          
          // Save error details
          try {
            await fs.writeFile(
              path.join(debugDir, `${stageName}_error.json`),
              JSON.stringify({
                error: errorMessage,
                stack: errorStack,
                timestamp: new Date().toISOString(),
              }, null, 2)
            );
          } catch (saveError) {
            logger.warn(`Failed to save ${stageName} error details`, { saveError });
          }
          
          // Call custom error handler if provided
          if (onError) {
            onError(error);
          }
          
          // Re-throw to stop pipeline
          throw new Error(`Stage ${stageName} failed: ${errorMessage}`);
        }
      };

      // Stage 1: Prepare
      if (input.flags.enable.discover || input.flags.dryRun) {
        const stage = new PrepareStage();
        const stageStart = Date.now();
        
        const prepareInput = { config: input.config };
        await saveStageIO('prepare', prepareInput, {});
        
        await stage.execute(input, emitter);
        
        const prepareOutput = {
          speechBudgetWords: Math.round(input.config.durationMinutes * 150),
          evidenceTargetUnits: Math.round(input.config.durationMinutes * 2),
        };
        await saveStageIO('prepare', prepareInput, prepareOutput);
        
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
        
        // Extract topic IDs from config
        const topicIds = input.config.topics.standard.map(t => t.id);
        const companyName = input.config.company.name;
        
        // Build discovery sources
        const sources = {
          rssFeeds: [
            // Use Reuters RSS which has direct article links
            `https://www.reuters.com/rssfeed/companyNews`,
            // Financial Times
            `https://www.ft.com/?format=rss`,
            // As fallback, Google News (we'll filter out redirect URLs in scrape)
            'https://news.google.com/rss/search?q=' + encodeURIComponent(companyName),
          ],
          newsApis: [],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        };
        
        const discoverInput = { topicIds, companyName, sources };
        
        discoverOutput = await stage.execute(topicIds, companyName, sources, emitter);
        
        const discoverOutputSummary = {
          stats: discoverOutput.stats,
          itemCount: discoverOutput.items.length,
          sampleItems: discoverOutput.items.slice(0, 3).map(i => ({ url: i.url, title: i.title })),
        };
        await saveStageIO('discover', discoverInput, discoverOutputSummary);
        
        telemetry.stages.discover = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
        telemetry.discovery = {
          totalItemsFound: discoverOutput.stats.totalItemsFound,
          itemsByTopic: discoverOutput.stats.itemsByTopic,
        };
        
        logger.info('Saved discover debug output', { totalItems: discoverOutput.items.length });
      }

      // Stage 3: Disambiguate
      let disambiguateOutput;
      if (input.flags.enable.discover && discoverOutput) {
        const stage = new DisambiguateStage(llmGateway);
        const stageStart = Date.now();
        disambiguateOutput = await stage.execute(
          discoverOutput.items,
          input.config.sourcePolicies?.allowDomains || [],
          input.config.sourcePolicies?.blockDomains || [],
          input.config.robotsMode,
          emitter
        );
        telemetry.stages.disambiguate = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
        
        // Save debug output
        await fs.writeFile(
          path.join(debugDir, '02_disambiguate.json'),
          JSON.stringify({ stats: disambiguateOutput.stats, itemCount: disambiguateOutput.items.length, items: disambiguateOutput.items.slice(0, 5) }, null, 2)
        );
        logger.info('Saved disambiguate debug output', { passedCount: disambiguateOutput.items.filter(i => !i.blocked).length });
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
        
        // Save debug output
        const rankedItems = Array.from(rankOutput.topicQueues.values()).flat();
        await fs.writeFile(
          path.join(debugDir, '03_rank.json'),
          JSON.stringify({ totalRanked: rankedItems.length, topItems: rankedItems.slice(0, 5).map(item => ({ url: item.url, title: item.title, scores: item.scores })) }, null, 2)
        );
        logger.info('Saved rank debug output', { totalRanked: rankedItems.length });
      }

      // Stage 5: Scrape
      let scrapeOutput;
      if (input.flags.enable.scrape && rankOutput) {
        const stage = new ScrapeStage(httpGateway);
        const stageStart = Date.now();
        // Get top-ranked items from all topic queues
        const allRankedItems = Array.from(rankOutput.topicQueues.values()).flat();
        
        // Apply article limit based on admin settings
        const limitedRankedItems = allRankedItems.slice(0, articleLimit);
        logger.info('Applied article limit', {
          totalRanked: allRankedItems.length,
          articleLimit,
          itemsToScrape: limitedRankedItems.length,
        });
        
        const topicTargets = Object.fromEntries(
          [...input.config.topics.standard, ...input.config.topics.special].map(t => [
            t.id,
            { targetUnits: Math.round(input.config.durationMinutes * 2 / (input.config.topics.standard.length + input.config.topics.special.length)) }
          ])
        );
        
        scrapeOutput = await stage.execute(
          limitedRankedItems,
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
        
        // Save I/O for scrape stage
        const scrapeInput = {
          itemCount: limitedRankedItems.length,
          articleLimit,
          topicTargets,
          sampleUrls: limitedRankedItems.slice(0, 3).map(i => i.url),
        };
        const scrapeOutputSummary = {
          stats: scrapeOutput.stats,
          contentCount: scrapeOutput.contents.length,
          sampleContents: scrapeOutput.contents.slice(0, 3).map(c => ({
            url: c.url,
            title: c.title,
            contentLength: c.content.length,
            contentPreview: c.content.substring(0, 500),
          })),
        };
        await saveStageIO('scrape', scrapeInput, scrapeOutputSummary);
        logger.info('Saved scrape debug output', { successCount: scrapeOutput.stats.successCount });
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
        
        // Save I/O for extract stage
        const extractInput = {
          contentCount: scrapeOutput.contents.length,
          sampleContent: scrapeOutput.contents[0] ? {
            url: scrapeOutput.contents[0].url,
            contentLength: scrapeOutput.contents[0].content.length,
          } : null,
        };
        const extractOutputSummary = {
          stats: extractOutput.stats,
          evidenceCount: extractOutput.units.length,
          sampleEvidence: extractOutput.units.slice(0, 5).map(u => ({
            type: u.type,
            topicId: u.topicId,
            span: u.span?.substring(0, 200) || '',
            sourceUrl: u.sourceUrl,
          })),
        };
        await saveStageIO('extract', extractInput, extractOutputSummary);
        logger.info('Saved extract debug output', { evidenceCount: extractOutput.units.length });
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
        summarizeOutput = await executeStageWithErrorHandling(
          'summarize',
          async () => {
            const stage = new SummarizeStage(llmGateway);
            const topicIds = [...input.config.topics.standard, ...input.config.topics.special].map((t) => t.id);
            return await stage.execute(topicIds, evidenceByTopic, emitter);
          },
          (error) => {
            logger.error('Summarize stage failed - likely OpenAI API issue', {
              error: error.message,
              topicCount: input.config.topics.standard.length + input.config.topics.special.length,
              evidenceCount: extractOutput?.units.length,
            });
          }
        );
      }

      // Stage 8: Competitor Contrasts
      let contrastOutput;
      if (input.flags.enable.contrast && extractOutput && summarizeOutput) {
        contrastOutput = await executeStageWithErrorHandling(
          'contrast',
          async () => {
            const stage = new ContrastStage(llmGateway);
            const topicIds = [...input.config.topics.standard, ...input.config.topics.special].map((t) => t.id);
            const competitors = input.config.competitors?.map(c => c.name) || [];
            return await stage.execute(topicIds, evidenceByTopic, input.config.company.name, competitors, emitter);
          },
          (error) => {
            logger.error('Contrast stage failed', {
              error: error.message,
              competitorCount: input.config.competitors?.length || 0,
            });
          }
        );
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
        const scriptInput = {
          outlineSegments: outlineOutput.outline.segments.length,
          summaryCount: summarizeOutput.summaries.length,
          contrastCount: contrastOutput.contrasts.length,
          targetDuration: input.config.durationMinutes,
        };
        
        scriptOutput = await stage.execute(
          outlineOutput.outline,
          summarizeOutput.summaries,
          contrastOutput.contrasts,
          input.config.durationMinutes,
          emitter
        );
        
        const scriptOutputSummary = {
          scriptLength: scriptOutput.script.narrative.length,
          wordCount: scriptOutput.script.narrative.split(/\s+/).length,
          preview: scriptOutput.script.narrative.substring(0, 500),
        };
        await saveStageIO('script', scriptInput, scriptOutputSummary);
        
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
        
        const ttsInput = {
          scriptLength: finalScript.length,
          wordCount: finalScript.split(/\s+/).length,
          voiceId: input.config.voice.voiceId,
          speed: input.config.voice.speed,
        };
        
        ttsOutput = await stage.execute(
          { narrative: finalScript }, // Wrap in Script object
          input.config.voice.voiceId,
          input.config.voice.speed,
          emitter
        );
        
        const ttsOutputSummary = {
          audioSize: ttsOutput.audioBuffer.length,
          audioSizeKB: Math.round(ttsOutput.audioBuffer.length / 1024),
        };
        await saveStageIO('tts', ttsInput, ttsOutputSummary);
        
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

        // Save audio to local disk (TODO: Upload to S3 in production)
        audioS3Key = `runs/${input.runId}/audio.mp3`;
        const audioPath = `./output/episodes/${input.runId}/audio.mp3`;
        const fs = await import('fs/promises');
        await fs.mkdir(`./output/episodes/${input.runId}`, { recursive: true });
        await fs.writeFile(audioPath, ttsOutput.audioBuffer);
        logger.info('Audio saved to disk', { audioPath, sizeKB: Math.round(ttsOutput.audioBuffer.length / 1024) });
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

