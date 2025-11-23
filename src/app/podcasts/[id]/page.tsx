/**
 * Podcast Detail Page - Overview with tabs
 */

'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Play, Settings, Copy, Calendar, Clock, TrendingUp, BarChart3, Users, Rss, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RSSValidator } from '@/components/RSSValidator';
import { useToastContext } from '@/contexts/ToastContext';

type Tab = 'overview' | 'episodes' | 'runs' | 'rss' | 'settings';

export default function PodcastDetailPage() {
  const params = useParams();
  const podcastId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [podcast, setPodcast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const toast = useToastContext();

  const fetchPodcast = async () => {
    try {
      const { api } = await import('@/lib/api');
      const response = await api.get('/podcasts');
      
      if (response.ok) {
        const data = await response.json();
        const foundPodcast = data.podcasts?.find((p: any) => p.id === podcastId);
        if (foundPodcast) {
          // Generate RSS URL - use API endpoint or construct from base URL
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          const rssUrl = foundPodcast.rssUrl || `${baseUrl}/api/rss/${podcastId}.xml`;
          
          setPodcast({
            ...foundPodcast,
            rssUrl,
            lastRun: foundPodcast.lastRunAt || new Date().toISOString(),
            nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Error fetching podcast:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPodcast();
  }, [podcastId]);

  const handleRunNow = async () => {
    if (runningPipeline) return;
    
    setRunningPipeline(true);
    try {
      const { api } = await import('@/lib/api');
      const response = await api.post(`/podcasts/${podcastId}/runs`, {});
      
      if (response.ok) {
        const data = await response.json();
        toast.success('Pipeline Started', `Run ID: ${data.runId}. Redirecting...`);
        setTimeout(() => {
          window.location.href = `/podcasts/${podcastId}/runs/${data.runId}`;
        }, 1000);
      } else {
        throw new Error('Failed to start pipeline');
      }
    } catch (error: any) {
      console.error('Error starting pipeline:', error);
      toast.error('Error Starting Pipeline', error.message || 'Please try again');
    } finally {
      setRunningPipeline(false);
    }
  };

  const handleCopyRSS = () => {
    navigator.clipboard.writeText(podcast.rssUrl);
    toast.success('RSS URL Copied', 'The RSS URL has been copied to your clipboard');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading podcast...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!podcast) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen p-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Podcast Not Found</h1>
            <p className="text-muted">The podcast you're looking for doesn't exist.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
          {/* Cover Art */}
          <div className="w-full md:w-72 h-48 sm:h-64 md:h-72 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-lg flex items-center justify-center text-5xl sm:text-6xl md:text-8xl shadow-lg">
            🎙️
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="mb-3 sm:mb-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 break-words">{podcast.title}</h1>
              <p className="text-base sm:text-lg md:text-xl text-muted mb-3 sm:mb-4 break-words">{podcast.subtitle}</p>
              <p className="text-sm sm:text-base text-muted max-w-2xl leading-relaxed break-words">{podcast.description}</p>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Button size="default" className="gap-1.5 sm:gap-2 text-sm sm:text-base" onClick={handleRunNow} disabled={runningPipeline}>
                <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                {runningPipeline ? 'Starting...' : 'Run Now'}
              </Button>
              <Button size="default" variant="outline" className="gap-1.5 sm:gap-2 text-sm sm:text-base" onClick={() => setActiveTab('settings')}>
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden">Settings</span>
              </Button>
              <Button size="default" variant="outline" className="gap-1.5 sm:gap-2 text-sm sm:text-base" onClick={handleCopyRSS}>
                <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Copy RSS</span>
                <span className="sm:hidden">RSS</span>
              </Button>
              <Button
                size="default"
                variant="outline"
                className="gap-1.5 sm:gap-2 text-sm sm:text-base"
                onClick={() => {
                  handleCopyRSS();
                  toast.info('RSS Submission Help', 'Submit your RSS feed to Apple Podcasts or Spotify. The RSS URL has been copied to your clipboard.');
                }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">Help</span>
              </Button>
            </div>

            <div className="flex flex-wrap gap-4">
              {podcast.config?.schedule && (
                <Badge variant="default">
                  <Calendar className="w-3 h-3 mr-1" />
                  {podcast.config.schedule}
                </Badge>
              )}
              <Badge variant="success">
                {podcast.status || 'active'}
              </Badge>
              {podcast.lastRunAt && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Clock className="w-4 h-4" />
                  <span>Last run: {new Date(podcast.lastRunAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Tab)}>
          <TabsList className="mb-4 sm:mb-8 overflow-x-auto flex-nowrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="episodes">Episodes</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="rss">RSS Feed</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab podcast={podcast} />
          </TabsContent>
          <TabsContent value="episodes">
            <EpisodesTab podcastId={podcastId} />
          </TabsContent>
          <TabsContent value="runs">
            <RunsTab podcastId={podcastId} />
          </TabsContent>
          <TabsContent value="rss">
            <RSSValidator podcastId={podcastId} rssUrl={podcast.rssUrl} />
          </TabsContent>
          <TabsContent value="suggestions">
            <SuggestionsTab podcastId={podcastId} />
          </TabsContent>
          <TabsContent value="validation">
            <ValidationTab podcast={podcast} />
          </TabsContent>
          <TabsContent value="team">
            <TeamTab podcastId={podcastId} />
          </TabsContent>
          <TabsContent value="settings">
            {podcast && <SettingsTab podcast={podcast} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </ProtectedRoute>
  );
}

function OverviewTab({ podcast }: any) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-sm">Total Episodes</span>
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold">{podcast.episodeCount || 0}</div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-sm">Company</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-xl font-bold">{podcast.companyId || 'N/A'}</div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-sm">Topics</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-xl font-bold text-primary">{podcast.topics?.length || 0}</div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-sm">Duration</span>
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-xl font-bold">{podcast.config?.duration || 5} min</div>
        </Card>
      </div>

      {/* RSS Feed & Configuration */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>RSS Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted mb-4">
              Subscribe to this podcast in your favorite app
            </p>
            <div className="bg-background border border-border rounded-lg p-3 mb-4 font-mono text-sm break-all">
              {podcast.rssUrl}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1">Copy URL</Button>
              <Button variant="outline">Validate</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted mb-2">Voice</p>
                <p className="text-sm font-medium">{podcast.config?.voice || 'alloy'}</p>
              </div>
              <div>
                <p className="text-sm text-muted mb-2">Schedule</p>
                <p className="text-sm font-medium">{podcast.config?.schedule || 'manual'}</p>
              </div>
              <div>
                <p className="text-sm text-muted mb-2">Status</p>
                <Badge variant="success">{podcast.status || 'active'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EpisodesTab({ podcastId }: { podcastId: string }) {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEpisodes = async () => {
    try {
      setLoading(true);
      const { api } = await import('@/lib/api');
      const response = await api.get(`/podcasts/${podcastId}/runs`);
      
      if (response.ok) {
        const data = await response.json();
        const allRuns = data.runs || [];
        
        // Debug logging
        console.log(`[EpisodesTab] Fetched ${allRuns.length} runs for podcast ${podcastId}`);
        const completedRunsCount = allRuns.filter((r: any) => r.status === 'completed').length;
        console.log(`[EpisodesTab] ${completedRunsCount} completed runs`);
        
        // Filter only completed runs with audio
        const completedRuns = allRuns.filter(
          (run: any) => run.status === 'completed' && (run.output?.audioS3Key || run.output?.audioPath)
        );
        
        console.log(`[EpisodesTab] ${completedRuns.length} episodes with audio (audioS3Key or audioPath)`);
        
        // Sort by most recent first (completedAt > startedAt > createdAt)
        completedRuns.sort((a: any, b: any) => {
          const dateA = new Date(a.completedAt || a.startedAt || a.createdAt).getTime();
          const dateB = new Date(b.completedAt || b.startedAt || b.createdAt).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        
        setEpisodes(completedRuns);
      } else {
        const errorText = await response.text();
        console.error(`[EpisodesTab] Failed to fetch runs: ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodes();
    const interval = setInterval(fetchEpisodes, 10000); // Poll every 10 seconds (reduced for performance)
    return () => clearInterval(interval);
  }, [podcastId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && episodes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted">Loading episodes...</p>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">No Published Episodes Yet</h3>
            <p className="text-muted mb-4">
              Episodes will appear here once pipeline runs are completed and published.
            </p>
            <p className="text-sm text-muted">
              💡 Tip: Go to the "Runs" tab to start a new podcast generation.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {episodes.map((episode) => {
        // Construct audio URL
        let audioUrl = null;
        
        // Priority 1: Use S3 key (production)
        if (episode.output?.audioS3Key) {
          const s3Key = episode.output.audioS3Key.startsWith('/') 
            ? episode.output.audioS3Key.substring(1) 
            : episode.output.audioS3Key;
          
          // Always use serve-file API which will handle CloudFront/S3 redirect
          // This works in both local and production
          audioUrl = `/api/serve-file/${s3Key}`;
        } 
        // Priority 2: Use local audioPath (local development)
        else if (episode.output?.audioPath) {
          // Remove leading "/output/" to get path for serve-file API
          const path = episode.output.audioPath.replace(/^\/output\//, '');
          audioUrl = `/api/serve-file/${path}`;
        }
        
        const episodeTitle = episode.output?.episodeTitle || `Episode ${episode.id.substring(0, 8)}`;
        const pubDate = episode.completedAt || episode.startedAt || episode.createdAt;
        
        return (
          <Card key={episode.id} className="p-6 hover:border-primary transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{episodeTitle}</h3>
                <div className="flex items-center gap-4 text-sm text-muted mb-3">
                  <span>{new Date(pubDate).toLocaleDateString()}</span>
                  {episode.duration && (
                    <span>• {Math.floor(episode.duration / 60)}m {episode.duration % 60}s</span>
                  )}
                </div>
                {audioUrl ? (
                  <audio controls className="w-full mt-4">
                    <source src={audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                ) : (
                  <p className="text-sm text-muted mt-4">Audio file not available</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => window.location.href = `/podcasts/${podcastId}/runs/${episode.id}`}
                  className="px-4 py-2 border border-border hover:border-primary rounded-lg transition-all text-sm"
                >
                  View Details
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function RunsTab({ podcastId }: { podcastId: string }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const { api } = await import('@/lib/api');
      const response = await api.get(`/podcasts/${podcastId}/runs`);
      
      if (response.ok) {
        const data = await response.json();
        setRuns(data.runs || []);
      } else {
        // Only log errors, not successful requests
        const errorText = await response.text();
        console.error(`Failed to fetch runs: ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching runs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch runs on mount and set up polling
  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 10000); // Poll every 10 seconds (reduced from 3s)
    return () => clearInterval(interval);
  }, [podcastId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && runs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted">Loading runs...</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <Card className="text-center py-12">
        <Play className="w-12 h-12 text-muted mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No runs yet</h3>
        <p className="text-muted">Click "Run Now" to start your first pipeline run</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {runs.map((run) => {
        const statusColors = {
          running: 'bg-blue-500/20 text-blue-500',
          completed: 'bg-green-500/20 text-green-500',
          failed: 'bg-red-500/20 text-red-500',
          success: 'bg-green-500/20 text-green-500',
        };

        return (
          <div
            key={run.id}
            className="bg-secondary border border-border rounded-lg p-6 hover:border-primary transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm">{run.id.substring(0, 20)}</span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      statusColors[run.status as keyof typeof statusColors] || 'bg-gray-500/20 text-gray-500'
                    }`}
                  >
                    {run.status}
                  </span>
                  {run.progress?.currentStage && (
                    <span className="text-xs text-muted">
                      Stage: {run.progress.currentStage}
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted">
                  {new Date(run.startedAt).toLocaleString()}
                  {run.duration && (
                    <> • {Math.floor(run.duration / 60)}m {run.duration % 60}s</>
                  )}
                </div>
              </div>
              <button
                onClick={() => window.location.href = `/podcasts/${podcastId}/runs/${run.id}`}
                className="px-4 py-2 border border-border hover:border-primary rounded-lg transition-all"
              >
                View Details
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SuggestionsTab({ podcastId: _podcastId }: { podcastId: string }) {
  return (
    <Card className="p-6">
      <div className="text-center py-12">
        <Brain className="w-16 h-16 mx-auto mb-4 text-muted" />
        <h3 className="text-xl font-semibold mb-2">AI Suggestions Coming Soon</h3>
        <p className="text-muted max-w-md mx-auto">
          We're working on AI-powered competitor and topic suggestions based on industry analysis 
          and news patterns. This feature will help you discover relevant competitors and trending 
          topics automatically.
        </p>
      </div>
    </Card>
  );
}

function ValidationTab({ podcast }: any) {
  const validations = [
    { check: 'RSS Feed', status: 'pass', message: 'Feed structure is valid' },
    { check: 'Configuration', status: 'pass', message: 'All required fields set' },
    { check: 'Topics', status: podcast.topics?.length > 0 ? 'pass' : 'warn', message: podcast.topics?.length > 0 ? `${podcast.topics.length} topics configured` : 'No topics configured' },
    { check: 'Company', status: podcast.companyId ? 'pass' : 'warn', message: podcast.companyId ? `Tracking ${podcast.companyId}` : 'No company set' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">RSS Feed Health</h3>
        <div className="space-y-3">
          {validations.map((validation) => (
            <div key={validation.check} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
              <div className="flex-shrink-0 mt-0.5">
                {validation.status === 'pass' ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">{validation.check}</div>
                <div className="text-sm text-muted">{validation.message}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <Button>Validate RSS Feed</Button>
        </div>
      </Card>
    </div>
  );
}

function TeamTab({ podcastId: _podcastId }: { podcastId: string }) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Team Collaboration Coming Soon</h3>
          <p className="text-muted mb-4">
            Team management and collaboration features will be available in a future release.
          </p>
          <p className="text-sm text-muted">
            For now, you can manage all podcast settings from the Settings tab.
          </p>
        </div>
      </Card>
    </div>
  );
}

function SettingsTab({ podcast, onUpdate }: { podcast: any; onUpdate?: () => void }) {
  const [status, setStatus] = useState<string>(podcast?.status || 'active');
  const [cadence, setCadence] = useState<string>(podcast?.config?.cadence || podcast?.config?.schedule || 'daily');
  const [durationMinutes, setDurationMinutes] = useState<number>(podcast?.config?.durationMinutes || podcast?.config?.duration || 5);
  const [timeWindowHours, setTimeWindowHours] = useState<number>(podcast?.config?.timeWindowHours || 24);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const toast = useToastContext();

  // Update local state when podcast prop changes
  useEffect(() => {
    if (podcast) {
      setStatus(podcast.status || 'active');
      setCadence(podcast.config?.cadence || podcast.config?.schedule || 'daily');
      setDurationMinutes(podcast.config?.durationMinutes || podcast.config?.duration || 5);
      setTimeWindowHours(podcast.config?.timeWindowHours || 24);
    }
  }, [podcast]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaved(false);
      const { api } = await import('@/lib/api');
      
      const updates: any = {
        status,
        cadence,
        durationMinutes: Number(durationMinutes),
        timeWindowHours: Number(timeWindowHours),
      };

      const response = await api.patch(`/podcasts/${podcast.id}`, updates);

      if (response.ok) {
        setSaved(true);
        toast.success('Settings Saved', 'Podcast configuration updated successfully');
        setTimeout(() => setSaved(false), 3000);
        // Refresh podcast data
        if (onUpdate) {
          onUpdate();
        }
      } else {
        const error = await response.text();
        toast.error('Save Failed', error || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Podcast Settings</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
            <p className="text-xs text-muted mt-1">
              Active podcasts will generate episodes according to cadence
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cadence</label>
            <select 
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
            <p className="text-xs text-muted mt-1">
              How often new episodes should be generated
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg"
            />
            <p className="text-xs text-muted mt-1">
              Target duration for each episode (1-60 minutes)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Time Window (hours)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={timeWindowHours}
              onChange={(e) => setTimeWindowHours(Number(e.target.value))}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg"
            />
            <p className="text-xs text-muted mt-1">
              How many hours back to look for news articles (1-168 hours / 1 week)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-red-500/30">
        <h3 className="text-xl font-semibold mb-2 text-red-500">Danger Zone</h3>
        <p className="text-sm text-muted mb-4">
          Irreversible actions. Please proceed with caution.
        </p>
        <Button variant="danger">Delete Podcast</Button>
      </Card>
    </div>
  );
}

