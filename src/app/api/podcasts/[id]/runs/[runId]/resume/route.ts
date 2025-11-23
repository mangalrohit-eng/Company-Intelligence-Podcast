/**
 * API Route: Resume Pipeline from Stage
 * POST /api/podcasts/[id]/runs/[runId]/resume
 * 
 * Resumes a failed pipeline run from a specific stage using saved input JSONs
 * Uses the test-stage-stub approach to execute individual stages
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/utils/logger';
import { RealtimeEventEmitter } from '@/utils/realtime-event-emitter';
import { runsStore } from '@/lib/runs-store';
import { saveRun } from '@/lib/runs-persistence';
import { GatewayFactory } from '@/gateways/factory';
import { PrepareStage } from '@/engine/stages/prepare';
import { DiscoverStage } from '@/engine/stages/discover';
import { DisambiguateStage } from '@/engine/stages/disambiguate';
import { RankStage } from '@/engine/stages/rank';
import { ScrapeStage } from '@/engine/stages/scrape';
import { ExtractStage } from '@/engine/stages/extract';
import { SummarizeStage } from '@/engine/stages/summarize';
import { ContrastStage } from '@/engine/stages/contrast';
import { OutlineStage } from '@/engine/stages/outline';
import { ScriptStage } from '@/engine/stages/script';
import { QAStage } from '@/engine/stages/qa';
import { TtsStage } from '@/engine/stages/tts';
import { PackageStage } from '@/engine/stages/package';
import { writeFile, mkdir } from 'fs/promises';
import { AdminSettings, DEFAULT_ADMIN_SETTINGS } from '@/types/admin-settings';

const STAGES = [
  'prepare',
  'discover',
  'disambiguate',
  'rank',
  'scrape',
  'extract',
  'summarize',
  'contrast',
  'outline',
  'script',
  'qa',
  'tts',
  'package',
] as const;

type StageName = typeof STAGES[number];

async function loadStageOutput(runId: string, stageName: string): Promise<any> {
  const filePath = join(process.cwd(), 'output', 'episodes', runId, 'debug', `${stageName}_output.json`);
  if (!existsSync(filePath)) {
    return null;
  }
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function loadStageInput(runId: string, stageName: string): Promise<any> {
  const filePath = join(process.cwd(), 'output', 'episodes', runId, 'debug', `${stageName}_input.json`);
  if (!existsSync(filePath)) {
    return null;
  }
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function saveStageInput(runId: string, stageName: string, input: any): Promise<void> {
  const debugDir = join(process.cwd(), 'output', 'episodes', runId, 'debug');
  await mkdir(debugDir, { recursive: true });
  await writeFile(
    join(debugDir, `${stageName}_input.json`),
    JSON.stringify(input, null, 2)
  );
}

async function saveStageOutput(runId: string, stageName: string, output: any): Promise<void> {
  const debugDir = join(process.cwd(), 'output', 'episodes', runId, 'debug');
  await mkdir(debugDir, { recursive: true });
  await writeFile(
    join(debugDir, `${stageName}_output.json`),
    JSON.stringify(output, null, 2)
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    const { id: podcastId, runId } = params;
    const body = await request.json();
    const { fromStage } = body;

    if (!fromStage || !STAGES.includes(fromStage as StageName)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${STAGES.join(', ')}` },
        { status: 400 }
      );
    }

    logger.info(`Resuming pipeline from stage: ${fromStage}`, { runId, podcastId });

    // Fetch the podcast to get title, subtitle, and description
    let podcastTitle: string | undefined;
    let podcastSubtitle: string | undefined;
    let podcastDescription: string | undefined;
    try {
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb');
      
      const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
      const docClient = DynamoDBDocumentClient.from(client);
      
      const response = await docClient.send(
        new GetCommand({
          TableName: process.env.PODCASTS_TABLE || 'podcasts',
          Key: { id: podcastId },
        })
      );
      
      podcastTitle = response.Item?.title;
      podcastSubtitle = response.Item?.subtitle;
      podcastDescription = response.Item?.description;
    } catch (error: any) {
      console.warn(`⚠️ Could not fetch podcast metadata from DynamoDB (local dev mode):`, error.message);
      // Will use undefined, which will fallback to default in script stage
    }

    // Find the run
    let run = runsStore[podcastId]?.find(r => r.id === runId);
    if (!run) {
      const { getRunsForPodcast } = await import('@/lib/runs-persistence');
      const runs = await getRunsForPodcast(podcastId);
      run = runs.find(r => r.id === runId);
    }

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Update run status
    run.status = 'running';
    run.progress.currentStage = fromStage;
    await saveRun(run);

    // Create event emitter
    const emitter = new RealtimeEventEmitter((update) => {
      if (run) {
        if (update.currentStage) {
          run.progress.currentStage = update.currentStage;
          
          // Ensure the stage exists in the stages object
          if (!run.progress.stages[update.currentStage]) {
            run.progress.stages[update.currentStage] = { status: 'pending' };
          }
        }
        
        const currentStage = run.progress.currentStage;
        
        if (update.stageStatus && currentStage && run.progress.stages[currentStage]) {
          run.progress.stages[currentStage].status = update.stageStatus;
        }
        
        if (update.stageStartedAt && currentStage && run.progress.stages[currentStage]) {
          run.progress.stages[currentStage].startedAt = update.stageStartedAt;
        }
        
        if (update.stageCompletedAt && currentStage && run.progress.stages[currentStage]) {
          run.progress.stages[currentStage].completedAt = update.stageCompletedAt;
        }
        
        if (update.stageProgress !== undefined && currentStage && run.progress.stages[currentStage]) {
          run.progress.stages[currentStage].progress = update.stageProgress;
        }
        
        if (update.error) {
          run.error = update.error;
        }
        
        saveRun(run).catch(err => logger.error(`Failed to persist run update:`, err));
      }
    });

    // Create gateways
    const gatewayConfig = {
      llmProvider: 'openai' as const,
      ttsProvider: 'openai' as const,
      httpProvider: 'stub' as const,
      cassetteKey: 'default',
      cassettePath: process.env.CASSETTE_PATH || './cassettes',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
    };
    const llmGateway = GatewayFactory.createLlmGateway(gatewayConfig);
    const ttsGateway = GatewayFactory.createTtsGateway(gatewayConfig);
    const httpGateway = GatewayFactory.createHttpGateway(gatewayConfig);

    // Execute the stage based on fromStage
    let stageOutput: any = null;

    switch (fromStage) {
      case 'contrast': {
        const extractOutput = await loadStageOutput(runId, 'extract');
        const contrastInput = await loadStageInput(runId, 'contrast');
        if (!extractOutput || !contrastInput) {
          return NextResponse.json({ error: 'Required inputs not found for contrast stage' }, { status: 400 });
        }

        // Group evidence by topic
        const evidenceByTopic = new Map<string, any[]>();
        (extractOutput.units || []).forEach((unit: any) => {
          const topicId = unit.topicId || 'company-news';
          if (!evidenceByTopic.has(topicId)) {
            evidenceByTopic.set(topicId, []);
          }
          evidenceByTopic.get(topicId)!.push(unit);
        });

        const stage = new ContrastStage(llmGateway);
        stageOutput = await stage.execute(
          contrastInput.topicIds || [],
          evidenceByTopic,
          contrastInput.companyName || 'Citibank',
          contrastInput.competitors || [],
          emitter
        );
        break;
      }

      case 'outline': {
        const summarizeOutput = await loadStageOutput(runId, 'summarize');
        const outlineInput = await loadStageInput(runId, 'outline');
        if (!summarizeOutput) {
          return NextResponse.json({ error: 'Required inputs not found for outline stage (summarize output missing)' }, { status: 400 });
        }

        // Reconstruct full summaries from output (not just preview from input)
        const summaries = summarizeOutput.summaries || [];
        if (summaries.length === 0) {
          return NextResponse.json({ error: 'No summaries found in summarize output' }, { status: 400 });
        }

        // Get company name from prepare input or use default
        const prepareInput = await loadStageInput(runId, 'prepare');
        const companyName = outlineInput?.companyName || prepareInput?.config?.company?.name || 'Citibank';

        // Save input BEFORE execution
        const inputToSave = {
          summaryCount: summaries.length,
          summaries: summaries.map((s: any) => ({
            topicId: s.topicId,
            topicName: s.topicName,
            paragraph: s.paragraph?.substring(0, 200),
          })),
          companyName,
        };
        await saveStageInput(runId, 'outline', inputToSave);

        const stage = new OutlineStage(llmGateway);
        stageOutput = await stage.execute(
          summaries,
          companyName,
          emitter
        );
        break;
      }

      case 'script': {
        const outlineOutput = await loadStageOutput(runId, 'outline');
        const summarizeOutput = await loadStageOutput(runId, 'summarize');
        const contrastOutput = await loadStageOutput(runId, 'contrast');
        const scriptInput = await loadStageInput(runId, 'script');
        if (!outlineOutput || !summarizeOutput) {
          return NextResponse.json({ error: 'Required inputs not found for script stage' }, { status: 400 });
        }

        // Reconstruct outline structure - handle both old format (segments) and new format (sections)
        let outline = outlineOutput.outline || outlineOutput;
        if (!outline.sections && outline.segments) {
          // Convert segments to sections format
          outline = {
            ...outline,
            sections: outline.segments.map((seg: any) => ({
              section: seg.section || 'company_deep_dive',
              title: seg.title || '',
              bulletPoints: seg.bulletPoints || [],
            })),
          };
        }
        if (!outline.sections || outline.sections.length === 0) {
          return NextResponse.json({ 
            error: 'Outline has no sections. Please re-run the outline stage first using the resume button.',
            outlineTheme: outline.theme,
            sectionCount: 0,
            suggestion: 'Resume from "outline" stage to regenerate sections, then resume from "script" stage.',
          }, { status: 400 });
        }

        // Save input BEFORE execution
        const scriptInputToSave = {
          outlineSegments: outline.sections.length,
          summaryCount: summarizeOutput.summaries.length,
          contrastCount: contrastOutput?.contrasts?.length || 0,
          targetDurationMinutes: scriptInput?.targetDurationMinutes || 5,
          outlineTheme: outline.theme,
          outlineSubThemes: outline.subThemes,
        };
        await saveStageInput(runId, 'script', scriptInputToSave);

        const stage = new ScriptStage(llmGateway);
        stageOutput = await stage.execute(
          outline,
          summarizeOutput.summaries || [],
          (contrastOutput?.contrasts || []),
          scriptInputToSave.targetDurationMinutes,
          emitter,
          podcastTitle, // Pass podcast title to script stage
          podcastSubtitle, // Pass podcast subtitle
          podcastDescription // Pass podcast description
        );
        break;
      }

      case 'qa': {
        const scriptOutput = await loadStageOutput(runId, 'script');
        const extractOutput = await loadStageOutput(runId, 'extract');
        const qaInput = await loadStageInput(runId, 'qa');
        if (!scriptOutput || !extractOutput) {
          return NextResponse.json({ error: 'Required inputs not found for QA stage' }, { status: 400 });
        }

        const script = scriptOutput.script?.narrative || scriptOutput.narrative || '';
        const now = new Date();
        const timeWindowStart = qaInput?.timeWindowStart 
          ? new Date(qaInput.timeWindowStart) 
          : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const timeWindowEnd = qaInput?.timeWindowEnd ? new Date(qaInput.timeWindowEnd) : now;

        // Save input BEFORE execution
        const qaInputToSave = {
          scriptLength: script.length,
          wordCount: script.split(/\s+/).length,
          evidenceCount: extractOutput.units?.length || 0,
          timeWindowStart: timeWindowStart.toISOString(),
          timeWindowEnd: timeWindowEnd.toISOString(),
        };
        await saveStageInput(runId, 'qa', qaInputToSave);

        const stage = new QAStage(llmGateway);
        stageOutput = await stage.execute(
          script,
          extractOutput.units || [],
          timeWindowStart,
          timeWindowEnd,
          emitter
        );
        break;
      }

      case 'tts': {
        const scriptOutput = await loadStageOutput(runId, 'script');
        const qaOutput = await loadStageOutput(runId, 'qa');
        const ttsInput = await loadStageInput(runId, 'tts');
        if (!scriptOutput) {
          return NextResponse.json({ error: 'Required inputs not found for TTS stage' }, { status: 400 });
        }

        const narrative = qaOutput?.finalScript || scriptOutput.script?.narrative || scriptOutput.narrative || '';
        const script = { narrative, boundEvidence: {} as Record<string, string>, durationEstimateSeconds: 0 };
        const voiceId = ttsInput?.voiceId || 'alloy';
        const speed = ttsInput?.speed || 1.0;

        // Save input BEFORE execution
        const ttsInputToSave = {
          scriptLength: narrative.length,
          wordCount: narrative.split(/\s+/).length,
          voiceId,
          speed,
        };
        await saveStageInput(runId, 'tts', ttsInputToSave);

        const stage = new TtsStage(ttsGateway);
        stageOutput = await stage.execute(script, voiceId, speed, emitter);
        
        // Save audio file
        if (stageOutput?.audioBuffer) {
          const audioPath = join(process.cwd(), 'output', 'episodes', runId, 'audio.mp3');
          await mkdir(join(process.cwd(), 'output', 'episodes', runId), { recursive: true });
          await writeFile(audioPath, stageOutput.audioBuffer);
          logger.info(`Saved audio file to ${audioPath}`);
        }
        break;
      }

      case 'package': {
        const scriptOutput = await loadStageOutput(runId, 'script');
        const ttsOutput = await loadStageOutput(runId, 'tts');
        const outlineOutput = await loadStageOutput(runId, 'outline');
        const extractOutput = await loadStageOutput(runId, 'extract');
        if (!scriptOutput || !ttsOutput || !outlineOutput || !extractOutput) {
          return NextResponse.json({ error: 'Required inputs not found for package stage' }, { status: 400 });
        }

        const script = scriptOutput.script?.narrative || scriptOutput.narrative || '';
        const audioUrl = `http://localhost:3000/output/episodes/${runId}/audio.mp3`;
        const audioDurationSeconds = ttsOutput.durationSeconds || 0;
        const outline = outlineOutput.outline || outlineOutput;
        const outputDir = join(process.cwd(), 'output', 'episodes', runId);

        // Save input BEFORE execution
        const packageInputToSave = {
          scriptLength: script.length,
          wordCount: script.split(/\s+/).length,
          audioUrl,
          audioDurationSeconds,
          outlineTheme: outline.theme,
          outlineSectionCount: outline.sections?.length || 0,
          evidenceCount: extractOutput.units?.length || 0,
        };
        await saveStageInput(runId, 'package', packageInputToSave);

        const stage = new PackageStage();
        stageOutput = await stage.execute(
          runId,
          script,
          audioUrl,
          audioDurationSeconds,
          outline,
          extractOutput.units || [],
          new Date(),
          outputDir,
          emitter
        );
        break;
      }

      case 'extract': {
        const scrapeOutput = await loadStageOutput(runId, 'scrape');
        const extractInput = await loadStageInput(runId, 'extract');
        if (!scrapeOutput) {
          return NextResponse.json({ error: 'Required inputs not found for extract stage (scrape output missing)' }, { status: 400 });
        }

        // Use full contents from output (now saved as full array, not samples)
        const contents = scrapeOutput.contents || [];
        if (contents.length === 0) {
          return NextResponse.json({ 
            error: 'No scraped contents found in scrape output. Please re-run scrape stage first.',
            contentCount: scrapeOutput.contentCount || 0,
          }, { status: 400 });
        }

        // Convert to ScrapedContent format
        const scrapedContents = contents.map((c: any) => ({
          url: c.url,
          title: c.title,
          content: c.content,
          publisher: c.publisher,
          publishedDate: c.publishedDate,
          topicIds: c.topicIds || [],
          entityIds: c.entityIds || [],
          scrapedAt: c.scrapedAt,
          latencyMs: c.latencyMs,
        }));

        // Save input BEFORE execution
        const extractInputToSave = {
          contentCount: scrapedContents.length,
          sampleUrls: scrapedContents.slice(0, 3).map((c: any) => c.url),
        };
        await saveStageInput(runId, 'extract', extractInputToSave);

        const stage = new ExtractStage(llmGateway);
        stageOutput = await stage.execute(scrapedContents, emitter);
        break;
      }

      case 'summarize': {
        const extractOutput = await loadStageOutput(runId, 'extract');
        const summarizeInput = await loadStageInput(runId, 'summarize');
        if (!extractOutput) {
          return NextResponse.json({ error: 'Required inputs not found for summarize stage (extract output missing)' }, { status: 400 });
        }

        // Use full evidence units from output (now saved as full array, not samples)
        const units = extractOutput.units || [];
        if (units.length === 0) {
          return NextResponse.json({ error: 'No evidence units found in extract output. Please re-run extract stage first.' }, { status: 400 });
        }

        // Reconstruct evidence by topic from full units
        const evidenceByTopic = new Map<string, any[]>();
        units.forEach((unit: any) => {
          const topicId = unit.topicId || 'company-news';
          if (!evidenceByTopic.has(topicId)) {
            evidenceByTopic.set(topicId, []);
          }
          evidenceByTopic.get(topicId)!.push(unit);
        });

        const topicIds = summarizeInput?.topicIds || Array.from(evidenceByTopic.keys());
        if (topicIds.length === 0) {
          return NextResponse.json({ error: 'No topic IDs found for summarize stage' }, { status: 400 });
        }

        // Save input BEFORE execution
        const summarizeInputToSave = {
          topicCount: topicIds.length,
          topicIds,
          evidenceCount: units.length,
        };
        await saveStageInput(runId, 'summarize', summarizeInputToSave);

        const stage = new SummarizeStage(llmGateway);
        stageOutput = await stage.execute(topicIds, evidenceByTopic, emitter);
        break;
      }

      case 'scrape': {
        const rankOutput = await loadStageOutput(runId, 'rank');
        const scrapeInput = await loadStageInput(runId, 'scrape');
        if (!rankOutput) {
          return NextResponse.json({ error: 'Required inputs not found for scrape stage (rank output missing)' }, { status: 400 });
        }

        // Use full ranked items from output (now saved as full array, not samples)
        const rankedItems = rankOutput.rankedItems || rankOutput.topItems || [];
        if (rankedItems.length === 0) {
          return NextResponse.json({ 
            error: 'No ranked items found in rank output. Please re-run rank stage first.',
            suggestion: 'Resume from rank stage to regenerate ranked items, then resume from scrape.',
          }, { status: 400 });
        }

        // Convert to DiscoveryItem format (with required fields)
        const itemsToScrape = rankedItems.map((item: any) => ({
          url: item.url,
          title: item.title || '',
          publisher: item.publisher || '',
          publishedDate: item.publishedDate || new Date().toISOString(),
          topicIds: item.topicIds || ['company-news'],
          entityIds: item.entityIds || [],
          scores: item.scores || { relevance: 0.5, recency: 0.5, authority: 0.5, expectedInfoGain: 0.5 },
          rankScore: item.rankScore || 0.5,
        }));

        const articleLimit = scrapeInput?.articleLimit || Math.min(itemsToScrape.length, 10);
        const limitedItems = itemsToScrape.slice(0, articleLimit);
        const topicTargets = scrapeInput?.topicTargets || {};

        // Save input BEFORE execution
        const scrapeInputToSave = {
          itemCount: limitedItems.length,
          articleLimit,
          topicTargets,
          sampleUrls: limitedItems.map((i: any) => i.url).slice(0, 3),
          totalRankedItems: rankedItems.length,
        };
        await saveStageInput(runId, 'scrape', scrapeInputToSave);

        const stage = new ScrapeStage(httpGateway);
        stageOutput = await stage.execute(
          limitedItems,
          topicTargets,
          'permissive', // robotsMode
          emitter
        );
        break;
      }

      case 'discover':
      case 'disambiguate':
      case 'rank':
      case 'prepare':
        return NextResponse.json({
          error: `Resume from ${fromStage} stage requires full pipeline context. Please resume from a later stage.`,
          suggestion: `Try resuming from: scrape, extract, summarize, contrast, outline, script, qa, tts, or package.`,
        }, { status: 400 });

      default:
        return NextResponse.json(
          { error: `Resume not yet implemented for stage: ${fromStage}` },
          { status: 400 }
        );
    }

    // Save stage output (format based on stage type)
    if (stageOutput) {
      let outputToSave = stageOutput;
      
      // Format output for specific stages to match orchestrator format
      if (fromStage === 'outline') {
        outputToSave = {
          theme: stageOutput.outline?.theme || stageOutput.theme,
          subThemes: stageOutput.outline?.subThemes || stageOutput.subThemes || [],
          segmentCount: stageOutput.outline?.segments?.length || 0,
          segments: stageOutput.outline?.segments || [],
          knowledgeGraph: stageOutput.knowledgeGraph || {},
        };
      } else if (fromStage === 'contrast') {
        outputToSave = {
          contrastCount: stageOutput.contrasts?.length || 0,
          stats: stageOutput.stats || {},
          contrasts: stageOutput.contrasts || [],
        };
      } else if (fromStage === 'script') {
        outputToSave = {
          script: {
            narrative: stageOutput.script?.narrative || stageOutput.narrative,
            narrativeLength: (stageOutput.script?.narrative || stageOutput.narrative || '').length,
            boundEvidence: stageOutput.script?.boundEvidence || {},
            durationEstimateSeconds: stageOutput.script?.durationEstimateSeconds || 0,
          },
          stats: stageOutput.stats || {},
        };
      } else if (fromStage === 'qa') {
        outputToSave = {
          scriptLength: stageOutput.script?.length || 0,
          finalScriptLength: stageOutput.finalScript?.length || 0,
          checkMarkers: stageOutput.checkMarkers?.length || 0,
          evidenceBindings: stageOutput.evidenceBindings?.length || 0,
          dateChecks: stageOutput.dateChecks || {},
          stats: stageOutput.stats || {},
        };
      } else if (fromStage === 'tts') {
        // Don't save audio buffer in JSON, just metadata
        outputToSave = {
          durationSeconds: stageOutput.durationSeconds || 0,
          metadata: stageOutput.metadata || {},
          audioSize: stageOutput.audioBuffer?.length || 0,
          audioSizeKB: Math.round((stageOutput.audioBuffer?.length || 0) / 1024),
        };
      } else if (fromStage === 'scrape') {
        outputToSave = {
          stats: stageOutput.stats || {},
          contentCount: stageOutput.contents?.length || 0,
          contents: stageOutput.contents?.map((c: any) => ({
            url: c.url,
            title: c.title,
            content: c.content, // Full content
            publisher: c.publisher,
            publishedDate: c.publishedDate,
            topicIds: c.topicIds,
            entityIds: c.entityIds,
            scrapedAt: c.scrapedAt,
            latencyMs: c.latencyMs,
          })) || [],
        };
      } else if (fromStage === 'extract') {
        outputToSave = {
          stats: stageOutput.stats || {},
          evidenceCount: stageOutput.units?.length || 0,
          units: stageOutput.units?.map((u: any) => ({
            id: u.id,
            type: u.type,
            topicId: u.topicId,
            span: u.span,
            context: u.context,
            sourceUrl: u.sourceUrl,
            publisher: u.publisher,
            authority: u.authority,
            publishedDate: u.publishedDate,
          })) || [],
        };
      } else if (fromStage === 'summarize') {
        outputToSave = {
          summaryCount: stageOutput.summaries?.length || 0,
          summaries: stageOutput.summaries?.map((s: any) => ({
            topicId: s.topicId,
            topicName: s.topicName,
            paragraph: s.paragraph,
            onAirStat: s.onAirStat,
            onAirQuote: s.onAirQuote,
          })) || [],
        };
      } else if (fromStage === 'package') {
        outputToSave = {
          showNotesPath: stageOutput.showNotesPath,
          transcriptVttPath: stageOutput.transcriptVttPath,
          transcriptTxtPath: stageOutput.transcriptTxtPath,
          sourcesJsonPath: stageOutput.sourcesJsonPath,
          rssItemLength: stageOutput.rssItem?.length || 0,
        };
      }
      
      await saveStageOutput(runId, fromStage, outputToSave);
      logger.info(`Saved ${fromStage} output`, { runId });
    }

    // Update run status
    run.progress.stages[fromStage] = {
      status: 'completed',
      startedAt: run.progress.stages[fromStage]?.startedAt || new Date().toISOString(),
      progress: 100,
    };
    run.progress.currentStage = STAGES[STAGES.indexOf(fromStage) + 1] || 'completed';
    
    // Check if pipeline is complete
    const allStagesComplete = STAGES.every(stage => 
      run.progress.stages[stage]?.status === 'completed'
    );
    if (allStagesComplete) {
      run.status = 'completed';
      run.completedAt = new Date().toISOString();
    }

    await saveRun(run);

    return NextResponse.json({
      success: true,
      runId,
      stage: fromStage,
      status: run.status,
      message: `Successfully executed ${fromStage} stage`,
    });

  } catch (error: any) {
    logger.error('Failed to resume pipeline', { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: 'Failed to resume pipeline', details: error.message },
      { status: 500 }
    );
  }
}

