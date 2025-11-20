'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle, Loader2, XCircle, Download, Play, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useToastContext } from '@/contexts/ToastContext';
import { confirmDialog } from '@/components/ui/confirm-dialog';

interface RunData {
  id: string;
  podcastId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  progress: {
    currentStage: string;
    stages: Record<string, { status: string; startedAt?: string; completedAt?: string }>;
  };
  output?: {
    episodeTitle?: string;
    audioS3Key?: string;
    audioPath?: string;
    transcriptS3Key?: string;
    error?: string;
  };
}

export default function RunProgressPage() {
  const params = useParams();
  const router = useRouter();
  const podcastId = params.id as string;
  const runId = params.runId as string;
  const toast = useToastContext();

  const [run, setRun] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumingStage, setResumingStage] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [stageSummaries, setStageSummaries] = useState<Record<string, string>>({});

  const fetchRun = async () => {
    try {
      const { api } = await import('@/lib/api');
      // Use direct get run endpoint instead of fetching all runs
      const response = await api.get(`/runs/${runId}`);
      
      if (response.ok) {
        const data = await response.json();
        // Ensure progress structure exists (for backward compatibility)
        if (data && !data.progress) {
          data.progress = {
            currentStage: 'prepare',
            stages: {
              prepare: { status: 'pending' },
              discover: { status: 'pending' },
              disambiguate: { status: 'pending' },
              rank: { status: 'pending' },
              scrape: { status: 'pending' },
              extract: { status: 'pending' },
              summarize: { status: 'pending' },
              contrast: { status: 'pending' },
              outline: { status: 'pending' },
              script: { status: 'pending' },
              qa: { status: 'pending' },
              tts: { status: 'pending' },
              package: { status: 'pending' },
            },
          };
        }
        setRun(data);
      } else {
        console.error('Failed to fetch run:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching run:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStageSummary = async (stageId: string) => {
    try {
      // Fetch the output JSON file directly
      const url = `/api/serve-file/runs/${runId}/debug/${stageId}_output.json`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const summary = getStageSummary(stageId, data);
        if (summary) {
          console.log(`✅ Stage summary for ${stageId}:`, summary);
        }
        return summary;
      } else {
        // Log non-OK responses for debugging
        const errorText = await response.text();
        console.warn(`⚠️ Failed to fetch stage summary for ${stageId}:`, response.status, errorText.substring(0, 100));
      }
    } catch (error: any) {
      // Output JSON might not exist yet - this is normal for stages that haven't completed
      console.debug(`Stage summary not available for ${stageId}:`, error.message);
    }
    return null;
  };

  const getStageSummary = (stageId: string, outputData: any): string | null => {
    try {
      switch (stageId) {
        case 'discover':
          // Use stats.totalItemsFound if available (more accurate), otherwise fallback to items.length
          if (outputData.stats?.totalItemsFound !== undefined) {
            return `${outputData.stats.totalItemsFound.toLocaleString()} articles discovered`;
          }
          if (outputData.items) {
            return `${outputData.items.length.toLocaleString()} articles discovered`;
          }
          return null;
        
        case 'disambiguate':
          if (outputData.items) {
            const passed = outputData.items.filter((i: any) => !i.blocked).length;
            const blocked = outputData.items.filter((i: any) => i.blocked).length;
            return `${passed.toLocaleString()} passed, ${blocked.toLocaleString()} blocked`;
          }
          return null;
        
        case 'rank':
          if (outputData.topicQueues) {
            const total = Object.values(outputData.topicQueues).reduce((sum: number, items: any) => sum + (Array.isArray(items) ? items.length : 0), 0);
            return `${total.toLocaleString()} articles ranked`;
          }
          if (outputData.rankedItems) {
            return `${outputData.rankedItems.length.toLocaleString()} articles ranked`;
          }
          return null;
        
        case 'scrape':
          if (outputData.stats) {
            const success = outputData.stats.successCount || 0;
            const failed = outputData.stats.failureCount || 0;
            if (failed > 0) {
              return `${success.toLocaleString()} scraped, ${failed.toLocaleString()} failed`;
            }
            return `${success.toLocaleString()} articles scraped`;
          }
          if (outputData.contents) {
            return `${outputData.contents.length.toLocaleString()} articles scraped`;
          }
          return null;
        
        case 'extract':
          if (outputData.units) {
            const stats = outputData.units.reduce((acc: any, unit: any) => {
              acc[unit.type] = (acc[unit.type] || 0) + 1;
              return acc;
            }, {});
            const parts = [];
            if (stats.stat) parts.push(`${stats.stat.toLocaleString()} facts`);
            if (stats.quote) parts.push(`${stats.quote.toLocaleString()} quotes`);
            if (stats.claim) parts.push(`${stats.claim.toLocaleString()} claims`);
            if (parts.length > 0) {
              return parts.join(', ');
            }
            return `${outputData.units.length.toLocaleString()} evidence units`;
          }
          if (outputData.stats?.totalUnits) {
            return `${outputData.stats.totalUnits.toLocaleString()} evidence units`;
          }
          return null;
        
        case 'summarize':
          if (outputData.summaries) {
            return `${outputData.summaries.length} topic summaries`;
          }
          return null;
        
        case 'contrast':
          if (outputData.contrasts) {
            return `${outputData.contrasts.length} competitor contrasts`;
          }
          return null;
        
        case 'outline':
          if (outputData.outline) {
            const sections = outputData.outline.sections?.length || 0;
            const themes = outputData.outline.subThemes?.length || 0;
            if (sections > 0 && themes > 0) {
              return `${sections} sections, ${themes} themes`;
            }
            if (sections > 0) {
              return `${sections} sections`;
            }
          }
          return null;
        
        case 'script':
          if (outputData.script?.narrative) {
            const wordCount = outputData.script.narrative.split(/\s+/).filter((w: string) => w.length > 0).length;
            // Estimate reading time: average 200 words per minute
            const readingMinutes = Math.ceil(wordCount / 200);
            return `${wordCount.toLocaleString()} words (~${readingMinutes} min read)`;
          }
          if (outputData.stats?.wordCount) {
            const readingMinutes = Math.ceil(outputData.stats.wordCount / 200);
            return `${outputData.stats.wordCount.toLocaleString()} words (~${readingMinutes} min read)`;
          }
          return null;
        
        case 'qa':
          if (outputData.script) {
            const scriptText = typeof outputData.script === 'string' ? outputData.script : outputData.script.narrative || '';
            if (scriptText) {
              const wordCount = scriptText.split(/\s+/).filter((w: string) => w.length > 0).length;
              return `${wordCount.toLocaleString()} words (QA verified)`;
            }
          }
          return null;
        
        case 'tts':
          if (outputData.durationSeconds) {
            const minutes = Math.floor(outputData.durationSeconds / 60);
            const seconds = Math.floor(outputData.durationSeconds % 60);
            const fileSizeMB = outputData.audioSizeKB ? (outputData.audioSizeKB / 1024).toFixed(1) : null;
            if (fileSizeMB) {
              return `${minutes}m ${seconds}s audio (${fileSizeMB} MB)`;
            }
            return `${minutes}m ${seconds}s audio`;
          }
          return null;
        
        case 'package':
          const files = [];
          if (outputData.showNotesPath) files.push('show notes');
          if (outputData.transcriptTxtPath) files.push('transcript');
          if (outputData.transcriptVttPath) files.push('captions');
          if (outputData.rssItem) files.push('RSS item');
          if (files.length > 0) {
            return `${files.length} file${files.length > 1 ? 's' : ''} generated`;
          }
          return null;
        
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    fetchRun();
    
    // Poll every 5 seconds if still running, otherwise stop polling
    const interval = setInterval(() => {
      if (run?.status === 'running' || run?.status === 'pending') {
        fetchRun();
      }
      // Stop polling if run is completed or failed
    }, 5000);

    return () => clearInterval(interval);
  }, [runId, run?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch stage summaries when run data changes
  useEffect(() => {
    if (!run) return;

    const fetchSummaries = async () => {
      const summaries: Record<string, string> = {};
      
      for (const stage of stages) {
        const stageProgress = run.progress.stages[stage.id];
        // Fetch summaries for completed stages, and also try for running stages (may have partial output)
        if (stageProgress?.status === 'completed' || stageProgress?.status === 'running') {
          const summary = await fetchStageSummary(stage.id);
          if (summary) {
            summaries[stage.id] = summary;
          }
        }
      }
      
      setStageSummaries(summaries);
    };

    fetchSummaries();
    
    // Poll for summaries while run is active (to catch updates as stages complete)
    if (run.status === 'running' || run.status === 'pending') {
      const interval = setInterval(() => {
        fetchSummaries();
      }, 5000); // Poll every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [run, runId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResume = async (stageId: string) => {
    const confirmed = await confirmDialog({
      title: 'Resume Pipeline',
      message: `Resume pipeline from ${stageId} stage? This will re-execute the stage using saved inputs.`,
      confirmText: 'Resume',
      cancelText: 'Cancel',
    });

    if (!confirmed) {
      return;
    }

    setResumingStage(stageId);
    try {
      const { api } = await import('@/lib/api');
      const response = await api.post(`/podcasts/${podcastId}/runs/${runId}/resume`, {
        fromStage: stageId,
      });

      if (response.ok) {
        toast.success('Pipeline Resumed', `Resuming from ${stageId} stage...`);
        // Refresh run data
        await fetchRun();
        // Start polling again
        const interval = setInterval(() => {
          fetchRun();
        }, 3000);
        setTimeout(() => clearInterval(interval), 60000); // Poll for 1 minute
      } else {
        const error = await response.json();
        toast.error('Failed to Resume', error.error || error.details || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error resuming pipeline:', error);
      toast.error('Failed to Resume Pipeline', error.message);
    } finally {
      setResumingStage(null);
    }
  };

  const handleStop = async () => {
    const confirmed = await confirmDialog({
      title: 'Stop Pipeline',
      message: 'Are you sure you want to stop this pipeline execution? This action cannot be undone.',
      confirmText: 'Stop',
      cancelText: 'Cancel',
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    setStopping(true);
    try {
      const { api } = await import('@/lib/api');
      const response = await api.post(`/podcasts/${podcastId}/runs/${runId}/stop`);

      if (response.ok) {
        const data = await response.json();
        toast.success('Pipeline Stopped', 'The pipeline execution has been stopped');
        // Immediately refresh run data to see the updated status
        await fetchRun();
        // Force a re-render by updating state
        setRun((prev) => prev ? { ...prev, status: 'failed' } : null);
      } else {
        const error = await response.json();
        toast.error('Failed to Stop Pipeline', error.error || error.details || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error stopping pipeline:', error);
      toast.error('Failed to Stop Pipeline', error.message);
    } finally {
      setStopping(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!run) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen p-8">
          <p>Run not found</p>
        </div>
      </ProtectedRoute>
    );
  }

  // Use audioPath from run output if available, otherwise fallback to serve-file endpoint
  const audioPath = run.output?.audioPath || `/api/serve-file/episodes/${runId}/audio.mp3`;

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push(`/podcasts/${podcastId}`)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Podcast
          </Button>

          <h1 className="text-3xl font-bold mb-8">Pipeline Run Progress</h1>

          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Run ID: {runId}</h2>
                <p className="text-muted text-sm">Podcast ID: {podcastId}</p>
                {run.completedAt && (
                  <p className="text-sm text-muted">
                    Completed: {new Date(run.completedAt).toLocaleString()}
                    {run.duration && ` (${Math.floor(run.duration / 60)}m ${run.duration % 60}s)`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  run.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                  run.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                  'bg-blue-500/20 text-blue-500'
                }`}>
                  {run.status}
                </span>
                {run.status === 'running' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleStop}
                    disabled={stopping}
                    className="gap-2"
                  >
                    {stopping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Stopping...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Stop Pipeline
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {run.status === 'running' && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span className="text-blue-500 font-medium">Running</span>
                  </>
                )}
                {run.status === 'completed' && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-green-500 font-medium">Completed</span>
                  </>
                )}
                {run.status === 'failed' && (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-medium">Failed</span>
                  </>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">Pipeline Stages</h3>
            <div className="space-y-4">
              {stages.map((stage) => {
                const stageProgress = run.progress.stages[stage.id];
                const isCompleted = stageProgress?.status === 'completed';
                const isFailed = stageProgress?.status === 'failed';
                const isRunning = run.status === 'running' && (run.progress.currentStage === stage.id || stageProgress?.status === 'running');
                const hasStarted = isRunning || isCompleted || isFailed || stageProgress?.status === 'running' || stageProgress?.startedAt;
                // Show resume button for all stages (except when currently running)
                // This allows re-running any stage from the latest input JSON
                const canResume = !isRunning && run.status !== 'running';
                
                return (
                  <div key={stage.name} className="flex items-center gap-4">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : isFailed ? (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    ) : isRunning ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{stage.name}</div>
                      <div className="text-sm text-muted">{stage.description}</div>
                      
                      {/* Show stage summary if available */}
                      {stageSummaries[stage.id] && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                          {stageSummaries[stage.id]}
                        </div>
                      )}
                      
                      {/* Show Input JSON as soon as stage starts */}
                      {hasStarted && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => window.open(`/api/serve-file/runs/${runId}/debug/${stage.id}_input.json`, '_blank')}
                          >
                            📥 Input JSON
                          </Button>
                          {/* Show Output JSON only when completed */}
                          {isCompleted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => window.open(`/api/serve-file/runs/${runId}/debug/${stage.id}_output.json`, '_blank')}
                            >
                              📤 Output JSON
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {canResume && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleResume(stage.id)}
                            disabled={resumingStage === stage.id}
                          >
                            {resumingStage === stage.id ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Resuming...
                              </>
                            ) : (
                              <>
                                <RotateCw className="w-3 h-3 mr-1" />
                                Resume from here
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {(run.status === 'completed' || (run.status === 'failed' && run.output?.audioPath)) && (
            <>
              <Card className="p-6 mb-6">
                <h3 className="font-semibold mb-4">🎙️ Generated Podcast</h3>
                <div className="space-y-4">
                  {run.output?.audioPath && (
                    <div>
                      <p className="text-sm text-muted mb-2">Audio Player:</p>
                      <AudioPlayerWithDuration src={audioPath} />
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(audioPath, '_blank')}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Open Audio
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/api/serve-file/episodes/${runId}/${runId}_transcript.txt`, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Transcript
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/api/serve-file/episodes/${runId}/${runId}_show_notes.md`, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Show Notes
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="mt-6 flex gap-4">
                {run.output?.episodeId && (
                  <Button onClick={() => router.push(`/podcasts/${podcastId}/episodes/${run.output.episodeId}`)}>
                    <Play className="w-4 h-4 mr-2" />
                    View Episode
                  </Button>
                )}
                <Button variant="outline" onClick={() => router.push(`/podcasts/${podcastId}`)}>
                  View Podcast
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/podcasts')}
                >
                  Back to All Podcasts
                </Button>
              </div>
          </>
        )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Audio Player component that properly handles duration loading
function AudioPlayerWithDuration({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setIsLoading(false);
      }
    };

    const handleCanPlay = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setIsLoading(false);
      }
    };

    const handleError = (e: any) => {
      console.error('Audio loading error:', e);
      setIsLoading(false);
    };

    // Set up event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    // Force load metadata
    audio.load();

    // Check if duration is already available
    if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
      setIsLoading(false);
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [src]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      <audio 
        ref={audioRef}
        controls 
        className="w-full"
        preload="metadata"
        crossOrigin="anonymous"
      >
        <source src={src} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
      {duration !== null && duration > 0 && (
        <p className="text-xs text-muted-foreground">
          Duration: {formatDuration(duration)}
        </p>
      )}
      {isLoading && duration === null && (
        <p className="text-xs text-muted-foreground">
          Loading audio metadata...
        </p>
      )}
    </div>
  );
}

const stages = [
  { id: 'prepare', name: 'Prepare', description: 'Computing budgets and targets' },
  { id: 'discover', name: 'Discover', description: 'Finding news articles' },
  { id: 'disambiguate', name: 'Disambiguate', description: 'Filtering relevant articles' },
  { id: 'rank', name: 'Rank', description: 'Ranking articles by relevance' },
  { id: 'scrape', name: 'Scrape', description: 'Downloading article content' },
  { id: 'extract', name: 'Extract', description: 'Extracting evidence units' },
  { id: 'summarize', name: 'Summarize', description: 'Creating topic summaries' },
  { id: 'contrast', name: 'Contrast', description: 'Competitor analysis' },
  { id: 'outline', name: 'Outline', description: 'Generating episode outline' },
  { id: 'script', name: 'Script', description: 'Writing podcast script' },
  { id: 'qa', name: 'QA', description: 'Quality assurance checks' },
  { id: 'tts', name: 'TTS', description: 'Converting to audio' },
  { id: 'package', name: 'Package', description: 'Creating output files' },
];
