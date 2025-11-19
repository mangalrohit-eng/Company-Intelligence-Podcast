/**
 * Pipeline Orchestrator
 * Executes all stages in sequence based on RunFlags
 */

import 'dotenv/config'; // Load .env file explicitly
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
import { logger, enableS3LogStreaming, disableS3LogStreaming } from '@/utils/logger';
import { AdminSettings, DEFAULT_ADMIN_SETTINGS, calculateArticlesNeeded } from '@/types/admin-settings';
import { isS3Available, writeToS3, getDebugFileKey, getAudioFileKey } from '@/lib/s3-storage';

export class PipelineOrchestrator {
  /**
   * Load admin settings from S3
   */
  private async loadAdminSettings(): Promise<AdminSettings> {
    try {
      const { isS3Available, readFromS3, getAdminSettingsKey } = await import('@/lib/s3-storage');
      if (!isS3Available()) {
        logger.info('S3 not available, using default admin settings');
        return DEFAULT_ADMIN_SETTINGS;
      }
      
      const data = await readFromS3(getAdminSettingsKey());
      return JSON.parse(data.toString('utf-8'));
    } catch (error: any) {
      // If file doesn't exist in S3, return defaults
      if (error.message?.includes('not found') || error.message?.includes('NoSuchKey')) {
        logger.info('Admin settings not found in S3, using defaults');
        return DEFAULT_ADMIN_SETTINGS;
      }
      logger.warn('Error loading admin settings from S3, using defaults', { error: error.message });
      return DEFAULT_ADMIN_SETTINGS;
    }
  }

  async execute(input: PipelineInput, emitter: IEventEmitter): Promise<PipelineOutput> {
    // Enable S3 log streaming for this run
    enableS3LogStreaming(input.runId);
    
    // Cleanup on exit
    const cleanup = () => {
      disableS3LogStreaming();
      const { removeLogStreamer } = require('@/utils/log-streamer');
      removeLogStreamer(input.runId);
    };
    
    try {
    const startTime = new Date();
    logger.info('Pipeline execution started', { runId: input.runId });

    // Load admin settings
    const adminSettings = await this.loadAdminSettings();
    logger.info('Loaded admin settings', { 
      wordsPerMinute: adminSettings.pipeline.wordsPerMinute,
      wordsPerArticle: adminSettings.pipeline.wordsPerArticle,
      scrapeSuccessRate: adminSettings.pipeline.scrapeSuccessRate,
      relevantTextRate: adminSettings.pipeline.relevantTextRate,
      models: adminSettings.models,
    });

    // Set environment variables for model selection (stages read from env)
    process.env.EXTRACT_MODEL = adminSettings.models.extract;
    process.env.SUMMARIZE_MODEL = adminSettings.models.summarize;
    process.env.CONTRAST_MODEL = adminSettings.models.contrast;
    process.env.OUTLINE_MODEL = adminSettings.models.outline;
    process.env.SCRIPT_MODEL = adminSettings.models.script;
    process.env.QA_MODEL = adminSettings.models.qa;
    process.env.COMPETITOR_MODEL = adminSettings.models.competitorIdentification;

    logger.info('Models configured for this run', {
      extract: adminSettings.models.extract,
      summarize: adminSettings.models.summarize,
      contrast: adminSettings.models.contrast,
      outline: adminSettings.models.outline,
      script: adminSettings.models.script,
      qa: adminSettings.models.qa,
    });

    // Calculate article limit based on duration
    const articleLimit = calculateArticlesNeeded(input.config.durationMinutes, adminSettings.pipeline);
    logger.info('Calculated article limit', { 
      duration: input.config.durationMinutes,
      articleLimit,
      formula: `(${input.config.durationMinutes} × ${adminSettings.pipeline.wordsPerMinute}) / (${adminSettings.pipeline.scrapeSuccessRate} × ${adminSettings.pipeline.relevantTextRate} × ${adminSettings.pipeline.wordsPerArticle})`,
    });

    // Always use S3 for file storage - consistent behavior across all environments
    const useS3 = isS3Available();
    if (!useS3) {
      throw new Error('AWS credentials required. S3 storage must be configured for file operations.');
    }
    logger.info('Using S3 for all file storage', { runId: input.runId });

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

            // Helper to write debug file to S3 with timeout protection
            // On Vercel, S3 writes can hang, so we add a timeout to prevent pipeline blocking
            const writeDebugFile = async (filename: string, content: string | object) => {
              try {
                const jsonContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
                const s3Key = getDebugFileKey(input.runId, filename);
                logger.debug(`Writing debug file to S3`, { 
                  filename, 
                  s3Key, 
                  contentLength: jsonContent.length,
                  runId: input.runId,
                });
                
                // Add timeout to prevent hanging on Vercel (5 seconds)
                const writePromise = writeToS3(
                  s3Key,
                  jsonContent,
                  'application/json'
                );
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('S3 write timeout')), 5000)
                );
                
                await Promise.race([writePromise, timeoutPromise]);
                
                logger.info(`Successfully wrote debug file to S3`, { 
                  filename, 
                  s3Key,
                  runId: input.runId,
                });
              } catch (error: any) {
                // Log but don't throw - continue pipeline even if debug file save fails
                if (error.message === 'S3 write timeout') {
                  logger.warn(`Debug file ${filename} write timed out after 5s, continuing pipeline`, { 
                    filename,
                    runId: input.runId,
                  });
                } else {
                  logger.error(`Failed to write debug file ${filename} to S3`, { 
                    filename,
                    runId: input.runId,
                    error: error.message,
                    errorName: error.name,
                  });
                }
                // Don't throw - continue pipeline even if debug file save fails
                // Debug files are non-critical - pipeline can proceed without them
              }
            };

            // Helper to save stage input/output to S3
            const saveStageIO = async (stageName: string, inputData: any, outputData: any) => {
              try {
                logger.debug(`Saving ${stageName} input to S3`, { runId: input.runId });
                await writeDebugFile(`${stageName}_input.json`, inputData);
                logger.debug(`Saving ${stageName} output to S3`, { runId: input.runId });
                await writeDebugFile(`${stageName}_output.json`, outputData);
                logger.debug(`${stageName} IO saved to S3`, { runId: input.runId });
              } catch (error: any) {
                logger.error(`Failed to save ${stageName} IO to S3`, { runId: input.runId, error: error.message });
                // Don't throw - continue pipeline even if debug file save fails
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
          
          // Save error details to S3
          try {
            const errorJson = JSON.stringify({
              error: errorMessage,
              stack: errorStack,
              timestamp: new Date().toISOString(),
            }, null, 2);
            
            await writeToS3(
              getDebugFileKey(input.runId, `${stageName}_error.json`),
              errorJson,
              'application/json'
            );
          } catch (saveError) {
            logger.warn(`Failed to save ${stageName} error details to S3`, { saveError });
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
        try {
          const stage = new PrepareStage();
          const stageStart = Date.now();
          
          const prepareInput = { config: input.config };
          await saveStageIO('prepare', prepareInput, {});
          
          logger.info('Starting prepare stage', { runId: input.runId });
          const prepareOutput = await stage.execute(input, emitter);
          logger.info('Prepare stage execute() returned', { 
            runId: input.runId,
            speechBudgetWords: prepareOutput.speechBudgetWords,
            evidenceTargetUnits: prepareOutput.evidenceTargetUnits,
          });
          
          logger.info('Saving prepare stage IO to S3', { runId: input.runId });
          await saveStageIO('prepare', prepareInput, prepareOutput);
          logger.info('Prepare stage IO saved to S3', { runId: input.runId });
          
          telemetry.stages.prepare = {
            startTime: new Date(stageStart).toISOString(),
            endTime: new Date().toISOString(),
            durationMs: Date.now() - stageStart,
            status: 'success',
          };
          
          logger.info('Prepare stage telemetry updated', { runId: input.runId });
          logger.info('Prepare stage fully completed, exiting try block', { runId: input.runId });
        } catch (error: any) {
          logger.error('Prepare stage failed', { runId: input.runId, error: error.message, stack: error.stack });
          throw error;
        }
      }
      
      logger.info('Prepare stage block completed, checking discover stage', { 
        runId: input.runId,
        enableDiscover: input.flags.enable.discover,
        dryRun: input.flags.dryRun,
      });
      
      logger.info('Moving to discover stage', { 
        runId: input.runId, 
        enableDiscover: input.flags.enable.discover,
        dryRun: input.flags.dryRun,
      });

      // Stage 2: Discover
      let discoverOutput;
      if (input.flags.enable.discover) {
        const stage = new DiscoverStage(llmGateway, httpGateway);
        const stageStart = Date.now();
        
        // Extract topic IDs from config (both standard and special topics)
        const topicIds = [
          ...(input.config.topics.standard || []).map(t => t.id),
          ...(input.config.topics.special || []).map(t => t.id)
        ];
        const companyName = input.config.company.name;
        
        // Build discovery sources from admin settings
        const rssFeedsFromSettings = adminSettings.discovery?.rssFeeds || [];
        
        // If no feeds configured, use default Google News
        const rssFeeds = rssFeedsFromSettings.length > 0 
          ? rssFeedsFromSettings
              .filter(feed => feed.enabled)
              .map(feed => {
                // Replace {company} placeholder with actual company name
                return feed.url.replace('{company}', encodeURIComponent(companyName));
              })
          : [
              // Default: Google News with company search
              'https://news.google.com/rss/search?q=' + encodeURIComponent(companyName),
            ];

        logger.info('Discovery RSS feeds configured', { 
          feedCount: rssFeeds.length,
          feeds: rssFeeds,
        });

        const sources = {
          rssFeeds,
          newsApis: [],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        };
        
        // Save input BEFORE execution
        const discoverInput = { topicIds, companyName, sources };
        logger.info('About to save discover input to S3', { 
          runId: input.runId,
          topicCount: topicIds.length, 
          feedCount: rssFeeds.length,
        });
        await writeDebugFile('discover_input.json', discoverInput);
        logger.info('Discover input save completed (check logs above for success/failure)', { 
          runId: input.runId,
        });
        
        logger.info('About to call discover stage execute()', { 
          runId: input.runId,
          topicCount: topicIds.length,
          feedCount: rssFeeds.length,
          companyName,
        });
        
        discoverOutput = await stage.execute(topicIds, companyName, sources, emitter);
        
        logger.info('Discover stage execute() returned', { 
          runId: input.runId,
          itemCount: discoverOutput.items.length,
          stats: discoverOutput.stats,
        });
        
        // Save output AFTER execution
        // Disambiguate stage receives: discoverOutput.items
        await writeDebugFile('discover_output.json', {
          items: discoverOutput.items, // Exact format disambiguate stage expects
          stats: discoverOutput.stats, // Keep stats for debugging
        });
        
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
        logger.info('Discover stage fully completed, moving to disambiguate stage', { 
          runId: input.runId,
          enableDiscover: input.flags.enable.discover,
          hasDiscoverOutput: !!discoverOutput,
          itemCount: discoverOutput.items.length,
        });
      } else {
        logger.warn('Discover stage skipped or failed', {
          runId: input.runId,
          enableDiscover: input.flags.enable.discover,
          hasDiscoverOutput: !!discoverOutput,
        });
      }

      // Stage 3: Disambiguate
      let disambiguateOutput;
      logger.info('Checking disambiguate stage conditions', {
        runId: input.runId,
        enableDiscover: input.flags.enable.discover,
        hasDiscoverOutput: !!discoverOutput,
        willExecute: !!(input.flags.enable.discover && discoverOutput),
      });
      
      if (input.flags.enable.discover && discoverOutput) {
        try {
          logger.info('Starting disambiguate stage', { 
            runId: input.runId,
            itemCount: discoverOutput.items.length,
          });
          const stage = new DisambiguateStage(llmGateway);
          const stageStart = Date.now();
          
          // Save debug input with timeout protection
          logger.info('Saving disambiguate input to S3', { runId: input.runId });
          const disambiguateInput = {
            itemCount: discoverOutput.items.length,
            allowDomains: input.config.sourcePolicies?.allowDomains || [],
            blockDomains: input.config.sourcePolicies?.blockDomains || [],
            robotsMode: input.config.robotsMode,
            sampleItems: discoverOutput.items.slice(0, 5).map(item => ({
              url: item.url,
              title: item.title,
              publisher: item.publisher,
            })),
          };
          await writeDebugFile('disambiguate_input.json', disambiguateInput);
          logger.info('Disambiguate input saved to S3', { runId: input.runId });
        
        // Extract company name and competitors for entity variation matching
        const companyName = input.config.company.name;
        const competitors = input.config.competitors?.map((c: any) => 
          typeof c === 'string' ? c : c.name || c.id
        ) || [];
        
        disambiguateOutput = await stage.execute(
          discoverOutput.items,
          input.config.sourcePolicies?.allowDomains || [],
          input.config.sourcePolicies?.blockDomains || [],
          input.config.robotsMode,
          emitter,
          companyName,
          competitors
        );
        telemetry.stages.disambiguate = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
        
        // Save output AFTER execution (exact format next stage expects)
        // Rank stage receives: disambiguateOutput.items.filter(item => !item.blocked)
        await writeDebugFile('disambiguate_output.json', {
          items: disambiguateOutput.items.map(item => ({
            url: item.url,
            title: item.title,
            publisher: item.publisher,
            publishedDate: item.publishedDate,
            topicIds: item.topicIds,
            entityIds: item.entityIds,
            scores: item.scores,
            blocked: item.blocked,
            blockReason: item.blockReason,
          })), // Exact format rank stage expects
          stats: disambiguateOutput.stats, // Keep stats for debugging
        });
        logger.info('Saved disambiguate debug output', { passedCount: disambiguateOutput.items.filter(i => !i.blocked).length });
      }

      // Stage 4: Rank
      let rankOutput;
      if (input.flags.enable.discover && disambiguateOutput) {
        const stage = new RankStage();
        const stageStart = Date.now();
        
        // Filter to non-blocked items
        const validItems = disambiguateOutput.items.filter(item => !item.blocked);
        
        // Save debug input
        const rankInput = {
          itemCount: validItems.length,
          rankingWeights: adminSettings.ranking,
          sampleItems: validItems.slice(0, 5).map(item => ({
            url: item.url,
            title: item.title,
            publisher: item.publisher,
            scores: item.scores,
          })),
        };
        await writeDebugFile('rank_input.json', rankInput);
        
        rankOutput = await stage.execute(validItems, adminSettings.ranking, emitter);
        telemetry.stages.rank = {
          startTime: new Date(stageStart).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          status: 'success',
        };
        
        // Save output AFTER execution (exact format next stage expects)
        // Scrape stage receives: Array.from(rankOutput.topicQueues.values()).flat()
        const rankedItems = Array.from(rankOutput.topicQueues.values()).flat();
        await writeDebugFile('rank_output.json', {
          topicQueues: Object.fromEntries(
            Array.from(rankOutput.topicQueues.entries()).map(([topicId, items]) => [
              topicId,
              items.map(item => ({
                url: item.url,
                title: item.title,
                publisher: item.publisher,
                publishedDate: item.publishedDate,
                topicIds: item.topicIds,
                entityIds: item.entityIds,
                scores: item.scores,
                rankScore: item.rankScore,
                expectedInfoGain: item.expectedInfoGain,
                rankingFactors: item.rankingFactors,
              })),
            ])
          ), // Exact format scrape stage expects (can extract flat array from this)
          // Also save flat array for convenience
          rankedItems: rankedItems.map(item => ({
            url: item.url,
            title: item.title,
            publisher: item.publisher,
            publishedDate: item.publishedDate,
            topicIds: item.topicIds,
            entityIds: item.entityIds,
            scores: item.scores,
            rankScore: item.rankScore,
            expectedInfoGain: item.expectedInfoGain,
            rankingFactors: item.rankingFactors,
          })),
        });
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
        
        // Save input BEFORE execution
        const scrapeInput = {
          itemCount: limitedRankedItems.length,
          articleLimit,
          topicTargets,
          sampleUrls: limitedRankedItems.slice(0, 3).map(i => i.url),
          totalRankedItems: allRankedItems.length,
        };
        await writeDebugFile('scrape_input.json', scrapeInput);
        logger.info('Saved scrape input', { itemCount: limitedRankedItems.length, articleLimit });
        
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
        
        // Save output AFTER execution (exact format next stage expects)
        // Extract stage receives: scrapeOutput.contents
        await writeDebugFile('scrape_output.json', {
          contents: scrapeOutput.contents.map(c => ({
            url: c.url,
            title: c.title,
            content: c.content, // Full content - exact format extract stage expects
            publisher: c.publisher,
            publishedDate: c.publishedDate,
            topicIds: c.topicIds,
            entityIds: c.entityIds,
            scrapedAt: c.scrapedAt,
            latencyMs: c.latencyMs,
          })), // Exact format extract stage expects
          stats: scrapeOutput.stats, // Keep stats for debugging
        });
        logger.info('Saved scrape debug output', { successCount: scrapeOutput.stats.successCount });
      }

      // Stage 6: Extract Evidence
      let extractOutput;
      if (input.flags.enable.extract && scrapeOutput) {
        try {
          const stage = new ExtractStage(llmGateway);
          const stageStart = Date.now();
          
          logger.info('Starting extract stage', { 
            runId: input.runId,
            contentCount: scrapeOutput.contents.length,
          });
          
          // Save input BEFORE execution
          const extractInput = {
            contentCount: scrapeOutput.contents.length,
            sampleContent: scrapeOutput.contents[0] ? {
              url: scrapeOutput.contents[0].url,
              contentLength: scrapeOutput.contents[0].content.length,
            } : null,
            sampleUrls: scrapeOutput.contents.slice(0, 3).map(c => c.url),
          };
          await writeDebugFile('extract_input.json', extractInput);
          logger.info('Saved extract input', { contentCount: scrapeOutput.contents.length });
          
          logger.info('About to call extract stage execute()', { 
            runId: input.runId,
            contentCount: scrapeOutput.contents.length,
          });
          
          // Add timeout wrapper for extract stage (Vercel has function timeouts)
          // Extract stage can take long if there are many articles (each requires LLM call)
          const extractPromise = stage.execute(scrapeOutput.contents, emitter);
          const extractTimeout = 240000; // 4 minutes timeout for extract stage
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Extract stage timeout')), extractTimeout)
          );
          
          extractOutput = await Promise.race([extractPromise, timeoutPromise]);
          
          logger.info('Extract stage execute() returned', { 
            runId: input.runId,
            unitCount: extractOutput.units.length,
          });
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
        
        // Save output AFTER execution (exact format next stage expects)
        // Summarize stage receives: extractOutput.units (grouped by topic into Map)
        await writeDebugFile('extract_output.json', {
          units: extractOutput.units.map(u => ({
            id: u.id,
            type: u.type,
            topicId: u.topicId,
            span: u.span, // Full span - exact format summarize stage expects
            context: u.context, // Full context - exact format summarize stage expects
            sourceUrl: u.sourceUrl,
            publisher: u.publisher,
            authority: u.authority,
            publishedDate: u.publishedDate,
          })), // Exact format summarize stage expects (can group by topicId)
          stats: extractOutput.stats, // Keep stats for debugging
        });
        logger.info('Saved extract debug output', { evidenceCount: extractOutput.units.length });
        } catch (extractError: any) {
          logger.error('Extract stage failed', { 
            runId: input.runId,
            error: extractError.message,
            errorName: extractError.name,
            stack: extractError.stack,
            isTimeout: extractError.message?.includes('timeout'),
          });
          
          // Save error details
          try {
            await writeDebugFile('extract_error.json', {
              error: extractError.message,
              stack: extractError.stack,
              timestamp: new Date().toISOString(),
              isTimeout: extractError.message?.includes('timeout'),
            });
          } catch (saveError) {
            logger.warn('Failed to save extract error details', { saveError });
          }
          
          // Mark stage as failed in telemetry
          telemetry.stages.extract = {
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            durationMs: 0,
            status: 'failed',
            error: extractError.message,
          };
          
          throw extractError; // Re-throw to fail the pipeline
        }
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
        // Use topicIds from evidence (not config) - evidence may have different topicIds from scraped content
        const topicIdsFromConfig = [...input.config.topics.standard, ...input.config.topics.special].map((t) => t.id);
        const topicIdsFromEvidence = Array.from(evidenceByTopic.keys());
        
        // Use evidence topicIds if available, otherwise fall back to config
        const topicIds = topicIdsFromEvidence.length > 0 ? topicIdsFromEvidence : topicIdsFromConfig;
        
        logger.info('Summarize stage topic selection', {
          topicIdsFromConfig,
          topicIdsFromEvidence,
          selectedTopicIds: topicIds,
          evidenceByTopicSize: evidenceByTopic.size,
        });
        
        // Save debug input
        const summarizeInput = {
          topicCount: topicIds.length,
          topicIds: topicIds,
          topicIdsFromConfig,
          topicIdsFromEvidence,
          evidenceCount: extractOutput.units.length,
          evidenceByTopic: Array.from(evidenceByTopic.entries()).map(([topicId, units]) => ({
            topicId,
            unitCount: units.length,
            sampleUnits: units.slice(0, 3).map(u => ({
              id: u.id,
              type: u.type,
              span: u.span?.substring(0, 100),
              authority: u.authority,
              publisher: u.publisher,
              context: u.context?.substring(0, 100),
              hasSpan: !!u.span,
              hasAuthority: u.authority !== undefined && u.authority !== null,
              hasPublisher: !!u.publisher,
              hasContext: !!u.context,
            })),
            // Count valid evidence
            validStats: units.filter(u => u.type === 'stat' && u.span && u.authority !== undefined).length,
            validQuotes: units.filter(u => u.type === 'quote' && u.span && u.authority !== undefined).length,
            validClaims: units.filter(u => u.type === 'claim' && u.span && u.authority !== undefined).length,
          })),
        };
        await writeDebugFile('summarize_input.json', summarizeInput);
        
        summarizeOutput = await executeStageWithErrorHandling(
          'summarize',
          async () => {
            const stage = new SummarizeStage(llmGateway);
            return await stage.execute(topicIds, evidenceByTopic, emitter);
          },
          (error) => {
            logger.error('Summarize stage failed - likely OpenAI API issue', {
              error: error.message,
              topicCount: topicIds.length,
              evidenceCount: extractOutput?.units.length,
            });
          }
        );
        
        // Save debug output (success or failure)
        if (summarizeOutput) {
          // Save output AFTER execution (exact format next stage expects)
          // Outline stage receives: summarizeOutput.summaries
          const summarizeOutputSummary = {
            summaries: summarizeOutput.summaries.map(s => ({
              topicId: s.topicId,
              topicName: s.topicName,
              paragraph: s.paragraph, // Full paragraph - exact format outline stage expects
              onAirStat: s.onAirStat, // Full stat object - exact format outline stage expects
              onAirQuote: s.onAirQuote, // Full quote object - exact format outline stage expects
            })), // Exact format outline stage expects
          };
          await writeDebugFile('summarize_output.json', summarizeOutputSummary);
          logger.info('Saved summarize debug output', { summaryCount: summarizeOutput.summaries.length });
        } else {
          // Save error output so UI can display it
          const errorOutput = {
            error: 'Summarize stage failed',
            summaryCount: 0,
            summaries: [],
            topicIds: topicIds,
            evidenceCount: extractOutput?.units.length || 0,
            message: 'Summarize stage encountered an error. Check summarize_error.json for details.',
          };
          await writeDebugFile('summarize_output.json', errorOutput);
          logger.warn('Saved summarize error output', { topicIds, evidenceCount: extractOutput?.units.length });
        }
      }

      // Stage 8: Competitor Contrasts
      let contrastOutput;
      if (input.flags.enable.contrast && extractOutput && summarizeOutput) {
        const topicIds = [...input.config.topics.standard, ...input.config.topics.special].map((t) => t.id);
        const competitors = input.config.competitors?.map(c => c.name) || [];
        
        // Save debug input
        const contrastInput = {
          topicCount: topicIds.length,
          topicIds: topicIds,
          companyName: input.config.company.name,
          competitorCount: competitors.length,
          competitors: competitors,
          evidenceCount: extractOutput.units.length,
        };
        await writeDebugFile('contrast_input.json', contrastInput);
        
        contrastOutput = await executeStageWithErrorHandling(
          'contrast',
          async () => {
            const stage = new ContrastStage(llmGateway);
            return await stage.execute(topicIds, evidenceByTopic, input.config.company.name, competitors, emitter);
          },
          (error) => {
            logger.error('Contrast stage failed', {
              error: error.message,
              competitorCount: competitors.length,
            });
          }
        );
        
        // Save debug output if successful (always save, even if 0 contrasts)
        if (contrastOutput) {
          // Save output AFTER execution (exact format next stage expects)
          // Script stage receives: contrastOutput.contrasts
          const contrastOutputSummary = {
            contrasts: contrastOutput.contrasts.map(c => ({
              topicId: c.topicId,
              sentences: c.sentences, // Full sentences array - exact format script stage expects
              boundStatOrQuote: c.boundStatOrQuote, // Exact format script stage expects
            })), // Exact format script stage expects
            stats: contrastOutput.stats, // Keep stats for debugging
          };
          await writeDebugFile('contrast_output.json', contrastOutputSummary);
          logger.info('Saved contrast debug output', { contrastCount: contrastOutput.contrasts.length });
        } else {
          // Save error output if stage failed
          const errorOutput = {
            error: 'Contrast stage failed',
            contrastCount: 0,
            stats: { totalContrasts: 0, byTopic: {} },
            contrasts: [],
            message: 'Contrast stage encountered an error. Check server logs for details.',
          };
          await writeDebugFile('contrast_output.json', errorOutput);
          logger.warn('Saved contrast error output');
        }
      }

      // Stage 9: Outline
      let outlineOutput;
      if (input.flags.enable.outline && summarizeOutput) {
        // Save debug input
        const outlineInput = {
          summaryCount: summarizeOutput.summaries.length,
          summaries: summarizeOutput.summaries.map(s => ({
            topicId: s.topicId,
            topicName: s.topicName,
            paragraph: s.paragraph?.substring(0, 200),
          })),
          companyName: input.config.company.name,
        };
        await writeDebugFile('outline_input.json', outlineInput);

        outlineOutput = await executeStageWithErrorHandling(
          'outline',
          async () => {
            const stage = new OutlineStage(llmGateway);
            return await stage.execute(summarizeOutput.summaries, input.config.company.name, emitter);
          },
          (error) => {
            logger.error('Outline stage failed', {
              error: error.message,
              summaryCount: summarizeOutput.summaries.length,
            });
          }
        );

        // Save output AFTER execution (exact format next stage expects)
        // Script stage receives: outlineOutput.outline
        if (outlineOutput) {
          const outlineOutputSummary = {
            outline: {
              theme: outlineOutput.outline.theme,
              subThemes: outlineOutput.outline.subThemes,
              sections: outlineOutput.outline.sections || [], // Full sections array - exact format script stage expects
            }, // Exact format script stage expects
            knowledgeGraph: outlineOutput.knowledgeGraph, // Keep for debugging
          };
          await writeDebugFile('outline_output.json', outlineOutputSummary);
          logger.info('Saved outline debug output', { sectionCount: outlineOutput.outline.sections?.length || 0 });
        } else {
          // Save error output if stage failed
          const errorOutput = {
            error: 'Outline stage failed',
            segmentCount: 0,
            theme: null,
            subThemes: [],
            segments: [],
            message: 'Outline stage encountered an error. Check server logs for details.',
          };
          await writeDebugFile('outline_output.json', errorOutput);
          logger.warn('Saved outline error output');
        }
      }

      // Stage 10: Script
      let scriptOutput;
      if (input.flags.enable.script && outlineOutput && summarizeOutput && contrastOutput) {
        // Save debug input BEFORE execution
        // Note: outline has 'sections', not 'segments'
        const scriptInput = {
          outlineSectionCount: outlineOutput.outline.sections?.length || 0,
          summaryCount: summarizeOutput.summaries.length,
          contrastCount: contrastOutput.contrasts?.length || 0,
          targetDurationMinutes: input.config.durationMinutes,
          outlineTheme: outlineOutput.outline.theme,
          outlineSubThemes: outlineOutput.outline.subThemes,
        };
        await writeDebugFile('script_input.json', scriptInput);
        logger.info('Saved script input', { 
          outlineSectionCount: scriptInput.outlineSectionCount,
          summaryCount: scriptInput.summaryCount,
          contrastCount: scriptInput.contrastCount,
        });

        scriptOutput = await executeStageWithErrorHandling(
          'script',
          async () => {
            const stage = new ScriptStage(llmGateway);
            return await stage.execute(
              outlineOutput.outline,
              summarizeOutput.summaries,
              contrastOutput.contrasts,
              input.config.durationMinutes,
              emitter
            );
          },
          (error) => {
            logger.error('Script stage failed', {
              error: error.message,
              outlineSectionCount: outlineOutput.outline.sections?.length || 0,
              summaryCount: summarizeOutput.summaries.length,
              contrastCount: contrastOutput.contrasts?.length || 0,
            });
          }
        );

        // Save output AFTER execution (exact format next stage expects)
        // QA stage receives: scriptOutput.script.narrative
        if (scriptOutput) {
          const scriptOutputSummary = {
            script: {
              narrative: scriptOutput.script.narrative, // Full narrative - exact format QA stage expects
              boundEvidence: scriptOutput.script.boundEvidence || [], // Full boundEvidence array - exact format QA stage expects
              durationEstimateSeconds: scriptOutput.script.durationEstimateSeconds,
            }, // Exact format QA stage expects
            stats: scriptOutput.stats, // Keep stats for debugging
          };
          await writeDebugFile('script_output.json', scriptOutputSummary);
          logger.info('Saved script debug output', { 
            narrativeLength: scriptOutput.script.narrative.length,
            wordCount: scriptOutput.stats.wordCount,
          });
        } else {
          // Save error output if stage failed
          const errorOutput = {
            error: 'Script stage failed',
            script: null,
            narrativeLength: 0,
            wordCount: 0,
            message: 'Script stage encountered an error. Check server logs for details.',
          };
          await writeDebugFile('script_output.json', errorOutput);
          logger.warn('Saved script error output');
        }
      }

      // Stage 11: QA & Bind
      let qaOutput;
      if (input.flags.enable.qa && scriptOutput && extractOutput) {
        const stage = new QAStage(llmGateway);
        const stageStart = Date.now();
        const timeWindowStart = new Date(input.config.timeWindow.startIso);
        const timeWindowEnd = new Date(input.config.timeWindow.endIso);
        
        // Save input BEFORE execution
        const qaInput = {
          scriptLength: scriptOutput.script.narrative.length,
          wordCount: scriptOutput.script.narrative.split(/\s+/).length,
          evidenceCount: extractOutput.units.length,
          timeWindowStart: timeWindowStart.toISOString(),
          timeWindowEnd: timeWindowEnd.toISOString(),
        };
        await writeDebugFile('qa_input.json', qaInput);
        logger.info('Saved QA input', { scriptLength: qaInput.scriptLength, evidenceCount: qaInput.evidenceCount });
        
        qaOutput = await stage.execute(
          scriptOutput.script.narrative,
          extractOutput.units,
          timeWindowStart,
          timeWindowEnd,
          emitter
        );
        
        // Save output AFTER execution (exact format next stage expects)
        // TTS stage receives: qaOutput.script || scriptOutput.script.narrative
        if (qaOutput) {
          const qaOutputSummary = {
            script: qaOutput.script || qaOutput.finalScript || '', // Full script - exact format TTS stage expects
            finalScript: qaOutput.finalScript || qaOutput.script || '', // Alias for compatibility
          }; // Exact format TTS stage expects
          await writeDebugFile('qa_output.json', qaOutputSummary);
          logger.info('Saved QA output', { scriptLength: qaOutputSummary.script.length });
        }
        
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
        const stageStart = Date.now();
        
        // Save input BEFORE execution
        const ttsInput = {
          scriptLength: finalScript.length,
          wordCount: finalScript.split(/\s+/).length,
          voiceId: input.config.voice.voiceId,
          speed: input.config.voice.speed,
        };
        await writeDebugFile('tts_input.json', ttsInput);
        logger.info('Saved TTS input', { scriptLength: ttsInput.scriptLength, voiceId: ttsInput.voiceId });
        
        ttsOutput = await executeStageWithErrorHandling(
          'tts',
          async () => {
            const stage = new TtsStage(ttsGateway);
            return await stage.execute(
              { narrative: finalScript }, // Wrap in Script object
              input.config.voice.voiceId,
              input.config.voice.speed,
              emitter
            );
          },
          (error) => {
            logger.error('TTS stage failed', {
              error: error.message,
              scriptLength: finalScript.length,
              wordCount: finalScript.split(/\s+/).length,
              voiceId: input.config.voice.voiceId,
            });
          }
        );
        
        // Save output AFTER execution (only if successful)
        if (ttsOutput) {
          const ttsOutputSummary = {
            audioSize: ttsOutput.audioBuffer.length,
            audioSizeKB: Math.round(ttsOutput.audioBuffer.length / 1024),
            durationSeconds: ttsOutput.durationSeconds,
          };
          await writeDebugFile('tts_output.json', ttsOutputSummary);
          logger.info('Saved TTS output', { audioSizeKB: ttsOutputSummary.audioSizeKB });
          
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

          // Save audio to S3
          audioS3Key = getAudioFileKey(input.runId);
          await writeToS3(audioS3Key, ttsOutput.audioBuffer, 'audio/mpeg');
          logger.info('Audio saved to S3', { s3Key: audioS3Key, sizeKB: Math.round(ttsOutput.audioBuffer.length / 1024) });
        } else {
          // Save error output if stage failed
          const errorOutput = {
            error: 'TTS stage failed',
            audioSize: 0,
            durationSeconds: 0,
            message: 'TTS stage encountered an error. Check server logs and tts_error.json for details.',
          };
          await writeDebugFile('tts_output.json', errorOutput);
          logger.warn('Saved TTS error output');
        }
      }

      // Stage 13: Package & RSS
      // Note: Package stage is non-critical - if it fails, pipeline can still succeed with audio
      let packageOutput;
      if (input.flags.enable.package && ttsOutput && outlineOutput && extractOutput) {
        try {
          const stage = new PackageStage();
          const stageStart = Date.now();
          // Generate audio URL - always use S3 URL or serve-file endpoint
          const audioUrl = audioS3Key
            ? `https://${process.env.S3_BUCKET_MEDIA || 'podcast-platform-media-' + process.env.AWS_ACCOUNT_ID}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${audioS3Key}`
            : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/serve-file/episodes/${input.runId}/audio.mp3`;
          
          // Save input BEFORE execution
          const packageInput = {
            scriptLength: finalScript.length,
            wordCount: finalScript.split(/\s+/).length,
            audioUrl,
            audioDurationSeconds: ttsOutput.durationSeconds,
            outlineTheme: outlineOutput.outline.theme,
            outlineSectionCount: outlineOutput.outline.sections?.length || 0,
            evidenceCount: extractOutput.units.length,
          };
          await writeDebugFile('package_input.json', packageInput);
          logger.info('Saved package input', { scriptLength: packageInput.scriptLength, evidenceCount: packageInput.evidenceCount });
          
          // Package stage no longer needs outputDir - all files go to S3
          packageOutput = await stage.execute(
            input.runId,
            finalScript,
            audioUrl,
            ttsOutput.durationSeconds,
            outlineOutput.outline,
            extractOutput.units,
            new Date(),
            '', // outputDir no longer used - kept for backward compatibility
            emitter
          );
          
          // Save output AFTER execution
          if (packageOutput) {
            const packageOutputSummary = {
              showNotesPath: packageOutput.showNotesPath,
              transcriptTxtPath: packageOutput.transcriptTxtPath,
              transcriptVttPath: packageOutput.transcriptVttPath,
              sourcesJsonPath: packageOutput.sourcesJsonPath,
              rssItemGenerated: !!packageOutput.rssItem,
            };
            await writeDebugFile('package_output.json', packageOutputSummary);
            logger.info('Saved package output', { showNotesPath: packageOutput.showNotesPath });
          }
          
          telemetry.stages.package = {
            startTime: new Date(stageStart).toISOString(),
            endTime: new Date().toISOString(),
            durationMs: Date.now() - stageStart,
            status: 'success',
          };
        } catch (packageError: any) {
          // Package stage failed, but don't fail the entire pipeline - audio is the critical output
          logger.error('Package stage failed, but continuing pipeline (audio already generated)', {
            runId: input.runId,
            error: packageError.message,
            stack: packageError.stack,
          });
          
          // Save error details
          try {
            await writeDebugFile('package_error.json', {
              error: packageError.message,
              stack: packageError.stack,
              timestamp: new Date().toISOString(),
            });
          } catch (saveError) {
            logger.warn('Failed to save package error details', { saveError });
          }
          
          // Mark package stage as failed in telemetry, but don't throw
          telemetry.stages.package = {
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            durationMs: 0,
            status: 'failed',
            error: packageError.message,
          };
          
          // packageOutput remains undefined, which is fine - pipeline can still succeed
        }
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
    } finally {
      cleanup();
    }
  }
}

