'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle, Loader2, XCircle, Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
    transcriptS3Key?: string;
    error?: string;
  };
}

export default function RunProgressPage() {
  const params = useParams();
  const router = useRouter();
  const podcastId = params.id as string;
  const runId = params.runId as string;

  const [run, setRun] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRun = async () => {
    try {
      const { api } = await import('@/lib/api');
      const response = await api.get(`/podcasts/${podcastId}/runs`);
      
      if (response.ok) {
        const data = await response.json();
        const foundRun = data.runs?.find((r: any) => r.id === runId);
        if (foundRun) {
          setRun(foundRun);
        }
      }
    } catch (error) {
      console.error('Error fetching run:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRun();
    
    // Poll every 3 seconds if still running
    const interval = setInterval(() => {
      if (run?.status === 'running') {
        fetchRun();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [runId, run?.status]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const audioPath = `/api/serve-file/episodes/${runId}/audio.mp3`;

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
                const isRunning = run.progress.currentStage === stage.id;
                
                return (
                  <div key={stage.name} className="flex items-center gap-4">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : isRunning ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{stage.name}</div>
                      <div className="text-sm text-muted">{stage.description}</div>
                      
                      {isCompleted && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => window.open(`/api/serve-file/episodes/${runId}/debug/${stage.id}_input.json`, '_blank')}
                          >
                            📥 Input JSON
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => window.open(`/api/serve-file/episodes/${runId}/debug/${stage.id}_output.json`, '_blank')}
                          >
                            📤 Output JSON
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {run.status === 'completed' && (
            <>
              <Card className="p-6 mb-6">
                <h3 className="font-semibold mb-4">🎙️ Generated Podcast</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted mb-2">Audio Player:</p>
                    <audio controls className="w-full">
                      <source src={audioPath} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                  
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
                <Button onClick={() => router.push(`/podcasts/${podcastId}`)}>
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
  { id: 'publish', name: 'Package', description: 'Creating output files' },
];
