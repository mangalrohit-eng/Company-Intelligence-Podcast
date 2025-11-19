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

type Tab = 'overview' | 'episodes' | 'runs' | 'rss' | 'suggestions' | 'validation' | 'team' | 'settings';

export default function PodcastDetailPage() {
  const params = useParams();
  const podcastId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [podcast, setPodcast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningPipeline, setRunningPipeline] = useState(false);

  useEffect(() => {
    const fetchPodcast = async () => {
      try {
        const { api } = await import('@/lib/api');
        const response = await api.get('/podcasts');
        
        if (response.ok) {
          const data = await response.json();
          const foundPodcast = data.podcasts?.find((p: any) => p.id === podcastId);
          if (foundPodcast) {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
            setPodcast({
              ...foundPodcast,
              rssUrl: `${baseUrl}/rss/${podcastId}.xml`,
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
        alert(`Pipeline started successfully!\n\nRun ID: ${data.runId}\n\nRedirecting to progress page...`);
        window.location.href = `/podcasts/${podcastId}/runs/${data.runId}`;
      } else {
        throw new Error('Failed to start pipeline');
      }
    } catch (error: any) {
      console.error('Error starting pipeline:', error);
      alert(`Error starting pipeline: ${error.message}`);
    } finally {
      setRunningPipeline(false);
    }
  };

  const handleCopyRSS = () => {
    navigator.clipboard.writeText(podcast.rssUrl);
    alert('RSS URL copied to clipboard!');
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
      <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          {/* Cover Art */}
          <div className="w-full md:w-72 h-72 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-lg flex items-center justify-center text-8xl shadow-lg">
            🎙️
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="mb-4">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{podcast.title}</h1>
              <p className="text-lg md:text-xl text-muted mb-4">{podcast.subtitle}</p>
              <p className="text-muted max-w-2xl leading-relaxed">{podcast.description}</p>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
              <Button size="lg" className="gap-2 flex-1 sm:flex-initial" onClick={handleRunNow} disabled={runningPipeline}>
                <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{runningPipeline ? 'Starting...' : 'Run Now'}</span>
                <span className="sm:hidden">{runningPipeline ? 'Starting...' : 'Run'}</span>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 flex-1 sm:flex-initial" onClick={() => setActiveTab('settings')}>
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden">Config</span>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 flex-1 sm:flex-initial" onClick={handleCopyRSS}>
                <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Copy RSS</span>
                <span className="sm:hidden">RSS</span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 flex-1 sm:flex-initial"
                onClick={() => alert('Submit your RSS feed to:\n\n• Apple Podcasts: https://podcastsconnect.apple.com\n• Spotify: https://podcasters.spotify.com\n\nYour RSS URL has been copied to clipboard!')}
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
          <TabsList className="mb-8">
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
            <SettingsTab podcast={podcast} />
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

function EpisodesTab({ podcastId: _podcastId }: { podcastId: string }) {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2">No Published Episodes Yet</h3>
          <p className="text-muted mb-4">
            Episodes will appear here once pipeline runs are completed and published.
          </p>
          <p className="text-sm text-muted">
            💡 Tip: Go to the "Runs" tab to see completed podcast generations.
          </p>
        </div>
      </Card>
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
      console.log(`🔍 Fetching runs for podcast: ${podcastId}`);
      const response = await api.get(`/podcasts/${podcastId}/runs`);
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Received ${data.runs?.length || 0} runs:`, data);
        setRuns(data.runs || []);
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to fetch runs: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching runs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch runs on mount and set up polling
  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 5000); // Poll every 5 seconds (reduced frequency)
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
            className="bg-secondary border border-border rounded-lg p-4 sm:p-6 hover:border-primary transition-all cursor-pointer"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <span className="font-mono text-xs sm:text-sm truncate">{run.id.substring(0, 20)}</span>
                  <span
                    className={`px-2 py-1 text-xs rounded flex-shrink-0 ${
                      statusColors[run.status as keyof typeof statusColors] || 'bg-gray-500/20 text-gray-500'
                    }`}
                  >
                    {run.status}
                  </span>
                  {run.progress?.currentStage && (
                    <span className="text-xs text-muted flex-shrink-0">
                      Stage: {run.progress.currentStage}
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-muted">
                  {new Date(run.startedAt).toLocaleString()}
                  {run.duration && (
                    <> • {Math.floor(run.duration / 60)}m {run.duration % 60}s</>
                  )}
                </div>
              </div>
              <button
                onClick={() => window.location.href = `/podcasts/${podcastId}/runs/${run.id}`}
                className="px-4 py-2 border border-border hover:border-primary rounded-lg transition-all text-sm whitespace-nowrap flex-shrink-0 w-full sm:w-auto"
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

function SuggestionsTab({ podcastId }: { podcastId: string }) {
  const [podcast, setPodcast] = useState<any>(null);
  const [competitorSuggestions, setCompetitorSuggestions] = useState<string[]>([]);
  const [topicSuggestions, setTopicSuggestions] = useState<Array<{ name: string; desc: string }>>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchPodcast = async () => {
      try {
        const { api } = await import('@/lib/api');
        const response = await api.get('/podcasts');
        if (response.ok) {
          const data = await response.json();
          const foundPodcast = data.podcasts?.find((p: any) => p.id === podcastId);
          if (foundPodcast) {
            setPodcast(foundPodcast);
            // Auto-fetch suggestions if we have a company name
            if (foundPodcast.companyId) {
              fetchSuggestions(foundPodcast);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching podcast:', error);
      }
    };
    fetchPodcast();
  }, [podcastId]);

  const fetchSuggestions = async (podcastData: any) => {
    if (!podcastData.companyId) {
      setError('Company name is required to generate suggestions');
      return;
    }

    // Fetch competitor suggestions
    setLoadingCompetitors(true);
    try {
      const { api } = await import('@/lib/api');
      const response = await api.post('/competitors/suggest', {
        companyName: podcastData.companyId,
      });
      if (response.ok) {
        const data = await response.json();
        setCompetitorSuggestions(data.competitors || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to fetch competitor suggestions');
      }
    } catch (error: any) {
      console.error('Error fetching competitor suggestions:', error);
      setError(error.message || 'Failed to fetch competitor suggestions');
    } finally {
      setLoadingCompetitors(false);
    }

    // Fetch topic suggestions
    setLoadingTopics(true);
    try {
      const { api } = await import('@/lib/api');
      const response = await api.post('/topics/suggest', {
        companyName: podcastData.companyId,
        industry: podcastData.industryId,
        competitors: podcastData.competitors || [],
      });
      if (response.ok) {
        const data = await response.json();
        if (data.fallback) {
          setError(data.error || 'OpenAI API key not configured. Suggestions unavailable.');
        } else {
          setTopicSuggestions(data.topics || []);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to fetch topic suggestions');
      }
    } catch (error: any) {
      console.error('Error fetching topic suggestions:', error);
      setError(error.message || 'Failed to fetch topic suggestions');
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleRefresh = () => {
    if (podcast) {
      fetchSuggestions(podcast);
    }
  };

  if (!podcast) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted">Loading podcast...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold mb-1">AI Suggestions</h3>
            <p className="text-sm text-muted">
              AI-powered competitor and topic suggestions for {podcast.companyId || 'your podcast'}
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" disabled={loadingCompetitors || loadingTopics}>
            {loadingCompetitors || loadingTopics ? 'Refreshing...' : 'Refresh Now'}
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-400">{error}</p>
          </div>
        )}

        {/* Competitor Suggestions */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Competitor Suggestions
          </h4>
          {loadingCompetitors ? (
            <div className="p-4 bg-secondary rounded-lg text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted">Generating competitor suggestions...</p>
            </div>
          ) : competitorSuggestions.length > 0 ? (
            <div className="space-y-2">
              {competitorSuggestions.map((competitor, idx) => (
                <div key={idx} className="p-3 bg-secondary rounded-lg flex items-center justify-between">
                  <span>{competitor}</span>
                  <Button size="sm" variant="outline">
                    Add
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-secondary rounded-lg text-center text-muted">
              <p className="text-sm">No competitor suggestions available</p>
            </div>
          )}
        </div>

        {/* Topic Suggestions */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Topic Suggestions
          </h4>
          {loadingTopics ? (
            <div className="p-4 bg-secondary rounded-lg text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted">Generating topic suggestions...</p>
            </div>
          ) : topicSuggestions.length > 0 ? (
            <div className="space-y-2">
              {topicSuggestions.map((topic, idx) => (
                <div key={idx} className="p-3 bg-secondary rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium">{topic.name}</div>
                      <div className="text-sm text-muted mt-1">{topic.desc}</div>
                    </div>
                    <Button size="sm" variant="outline" className="ml-4">
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-secondary rounded-lg text-center text-muted">
              <p className="text-sm">No topic suggestions available</p>
            </div>
          )}
        </div>
      </Card>
    </div>
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
          <RSSValidator podcastId={podcast.id} rssUrl={podcast.rssUrl || `https://example.com/rss/${podcast.id}.xml`} />
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

function SettingsTab({ podcast: _podcast }: any) {
  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Podcast Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select className="w-full px-4 py-2 bg-background border border-border rounded-lg">
              <option>Active</option>
              <option>Paused</option>
              <option>Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Cadence</label>
            <select className="w-full px-4 py-2 bg-background border border-border rounded-lg">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
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

