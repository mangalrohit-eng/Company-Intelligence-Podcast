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
        await fs.writeFile(
          path.join(debugDir, 'discover_input.json'),
          JSON.stringify(discoverInput, null, 2)
        );
        logger.info('Saved discover input', { topicCount: topicIds.length, feedCount: rssFeeds.length });
        
        discoverOutput = await stage.execute(topicIds, companyName, sources, emitter);
        
        // Save output AFTER execution (exact format next stage expects)
        // Disambiguate stage receives: discoverOutput.items
        await fs.writeFile(
          path.join(debugDir, 'discover_output.json'),
          JSON.stringify({
            items: discoverOutput.items, // Exact format disambiguate stage expects
            stats: discoverOutput.stats, // Keep stats for debugging
          }, null, 2)
        );
        
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
        
        // Save debug input
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
        await fs.writeFile(
          path.join(debugDir, 'disambiguate_input.json'),
          JSON.stringify(disambiguateInput, null, 2)
        );
        
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
        
        // Save output AFTER execution (exact format next stage expects)
        // Rank stage receives: disambiguateOutput.items.filter(item => !item.blocked)
        await fs.writeFile(
          path.join(debugDir, 'disambiguate_output.json'),
          JSON.stringify({
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
          }, null, 2)
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
        await fs.writeFile(
          path.join(debugDir, 'rank_input.json'),
          JSON.stringify(rankInput, null, 2)
        );
        
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
        await fs.writeFile(
          path.join(debugDir, 'rank_output.json'),
          JSON.stringify({
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
          }, null, 2)
        );
        logger.info('Saved rank debug output', { totalRanked: rankedItems.length });
      }

      // Stage 5: Scrape
      let scrapeOutput;
      if (input.flags.enable.scrape && rankOutput) {
        const stage = new ScrapeStage(httpGateway);
        const stageStart = Date.now();
        // Get top-ranked items from all topic queues
        // Deduplicate by URL since items can appear in multiple topic queues
        const allRankedItemsArray = Array.from(rankOutput.topicQueues.values()).flat();
        const seenUrls = new Set<string>();
        const allRankedItems: typeof allRankedItemsArray = [];
        for (const item of allRankedItemsArray) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            allRankedItems.push(item);
          }
        }
        
        // Sort by rankScore (descending) to get top-ranked items first
        allRankedItems.sort((a, b) => {
          const scoreA = (a as any).rankScore || 0;
          const scoreB = (b as any).rankScore || 0;
          return scoreB - scoreA; // Descending order (highest rank first)
        });
        
        // Apply article limit based on admin settings - take top N by rank
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
        await fs.writeFile(
          path.join(debugDir, 'scrape_input.json'),
          JSON.stringify(scrapeInput, null, 2)
        );
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
        await fs.writeFile(
          path.join(debugDir, 'scrape_output.json'),
          JSON.stringify({
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
          }, null, 2)
        );
        logger.info('Saved scrape debug output', { successCount: scrapeOutput.stats.successCount });
      }

      // Stage 6: Extract Evidence
      let extractOutput;
      if (input.flags.enable.extract && scrapeOutput) {
        const stage = new ExtractStage(llmGateway);
        const stageStart = Date.now();
        
        // Save input BEFORE execution
        const extractInput = {
          contentCount: scrapeOutput.contents.length,
          sampleContent: scrapeOutput.contents[0] ? {
            url: scrapeOutput.contents[0].url,
            contentLength: scrapeOutput.contents[0].content.length,
          } : null,
          sampleUrls: scrapeOutput.contents.slice(0, 3).map(c => c.url),
        };
        await fs.writeFile(
          path.join(debugDir, 'extract_input.json'),
          JSON.stringify(extractInput, null, 2)
        );
        logger.info('Saved extract input', { contentCount: scrapeOutput.contents.length });
        
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
        
        // Save output AFTER execution (exact format next stage expects)
        // Summarize stage receives: extractOutput.units (grouped by topic into Map)
        await fs.writeFile(
          path.join(debugDir, 'extract_output.json'),
          JSON.stringify({
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
          }, null, 2)
        );
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
        await fs.writeFile(
          path.join(debugDir, 'summarize_input.json'),
          JSON.stringify(summarizeInput, null, 2)
        );
        
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
          await fs.writeFile(
            path.join(debugDir, 'summarize_output.json'),
            JSON.stringify(summarizeOutputSummary, null, 2)
          );
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
          await fs.writeFile(
            path.join(debugDir, 'summarize_output.json'),
            JSON.stringify(errorOutput, null, 2)
          );
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
        await fs.writeFile(
          path.join(debugDir, 'contrast_input.json'),
          JSON.stringify(contrastInput, null, 2)
        );
        
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
          await fs.writeFile(
            path.join(debugDir, 'contrast_output.json'),
            JSON.stringify(contrastOutputSummary, null, 2)
          );
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
          await fs.writeFile(
            path.join(debugDir, 'contrast_output.json'),
            JSON.stringify(errorOutput, null, 2)
          );
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
        await fs.writeFile(
          path.join(debugDir, 'outline_input.json'),
          JSON.stringify(outlineInput, null, 2)
        );

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
          await fs.writeFile(
            path.join(debugDir, 'outline_output.json'),
            JSON.stringify(outlineOutputSummary, null, 2)
          );
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
          await fs.writeFile(
            path.join(debugDir, 'outline_output.json'),
            JSON.stringify(errorOutput, null, 2)
          );
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
        await fs.writeFile(
          path.join(debugDir, 'script_input.json'),
          JSON.stringify(scriptInput, null, 2)
        );
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
              emitter,
              input.config.title, // Pass podcast title to script stage
              input.config.subtitle, // Pass podcast subtitle
              input.config.description // Pass podcast description
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
          await fs.writeFile(
            path.join(debugDir, 'script_output.json'),
            JSON.stringify(scriptOutputSummary, null, 2)
          );
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
          await fs.writeFile(
            path.join(debugDir, 'script_output.json'),
            JSON.stringify(errorOutput, null, 2)
          );
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
        await fs.writeFile(
          path.join(debugDir, 'qa_input.json'),
          JSON.stringify(qaInput, null, 2)
        );
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
          await fs.writeFile(
            path.join(debugDir, 'qa_output.json'),
            JSON.stringify(qaOutputSummary, null, 2)
          );
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
        const stage = new TtsStage(ttsGateway);
        const stageStart = Date.now();
        
        // Save input BEFORE execution
        const ttsInput = {
          scriptLength: finalScript.length,
          wordCount: finalScript.split(/\s+/).length,
          voiceId: input.config.voice.voiceId,
          speed: input.config.voice.speed,
        };
        await fs.writeFile(
          path.join(debugDir, 'tts_input.json'),
          JSON.stringify(ttsInput, null, 2)
        );
        logger.info('Saved TTS input', { scriptLength: ttsInput.scriptLength, voiceId: ttsInput.voiceId });
        
        ttsOutput = await stage.execute(
          { 
            narrative: finalScript,
            boundEvidence: {},
            durationEstimateSeconds: 0
          }, // Wrap in Script object
          input.config.voice.voiceId,
          input.config.voice.speed,
          emitter
        );
        
        // Save output AFTER execution
        const ttsOutputSummary = {
          audioSize: ttsOutput.audioBuffer.length,
          audioSizeKB: Math.round(ttsOutput.audioBuffer.length / 1024),
          durationSeconds: ttsOutput.durationSeconds,
        };
        await fs.writeFile(
          path.join(debugDir, 'tts_output.json'),
          JSON.stringify(ttsOutputSummary, null, 2)
        );
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

        // Save audio to local disk (TODO: Upload to S3 in production)
        audioS3Key = `runs/${input.runId}/audio.mp3`;
        const audioPath = `./output/episodes/${input.runId}/audio.mp3`;
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
        await fs.writeFile(
          path.join(debugDir, 'package_input.json'),
          JSON.stringify(packageInput, null, 2)
        );
        logger.info('Saved package input', { scriptLength: packageInput.scriptLength, evidenceCount: packageInput.evidenceCount });
        
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
        
        // Save output AFTER execution
        if (packageOutput) {
          const packageOutputSummary = {
            showNotesPath: packageOutput.showNotesPath,
            transcriptTxtPath: packageOutput.transcriptTxtPath,
            transcriptVttPath: packageOutput.transcriptVttPath,
            sourcesJsonPath: packageOutput.sourcesJsonPath,
            rssItemGenerated: !!packageOutput.rssItem,
          };
          await fs.writeFile(
            path.join(debugDir, 'package_output.json'),
            JSON.stringify(packageOutputSummary, null, 2)
          );
          logger.info('Saved package output', { showNotesPath: packageOutput.showNotesPath });
        }
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
          showNotesS3Key: packageOutput?.showNotesPath,
          transcriptS3Key: packageOutput?.transcriptVttPath || packageOutput?.transcriptTxtPath,
          sourcesS3Key: packageOutput?.sourcesJsonPath,
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

