/**
 * User Dashboard - Control center for podcasts, runs, and publishing
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Mic, Play, TrendingUp, AlertCircle, CheckCircle, Clock, 
  Plus, ArrowRight, RefreshCw, Activity, BarChart3, 
  Radio, Zap, FileText, AlertTriangle, Headphones
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Podcast {
  id: string;
  title: string;
  status: string;
  cadence?: string;
  lastRun?: string;
  episodeCount?: number;
}

interface Run {
  id: string;
  podcastId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  progress?: {
    currentStage?: string;
    stages?: Record<string, any>;
  };
  output?: {
    episodeTitle?: string;
    audioS3Key?: string;
    audioPath?: string;
  };
}

interface DashboardData {
  podcasts: Podcast[];
  allRuns: Run[];
  recentRuns: Run[];
  activeRuns: Run[];
  failedRuns: Run[];
  completedRuns: Run[];
  recentEpisodes: Run[];
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    podcasts: [],
    allRuns: [],
    recentRuns: [],
    activeRuns: [],
    failedRuns: [],
    completedRuns: [],
    recentEpisodes: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch all podcasts
      const podcastsResponse = await api.get('/podcasts');
      const podcastsData = podcastsResponse.ok ? await podcastsResponse.json() : { podcasts: [] };
      const podcasts = podcastsData.podcasts || [];

      // Fetch runs for all podcasts
      const allRuns: Run[] = [];
      if (podcasts.length > 0) {
        for (const podcast of podcasts) {
          try {
            const runsResponse = await api.get(`/podcasts/${podcast.id}/runs`);
            if (runsResponse.ok) {
              const runsData = await runsResponse.json();
              const podcastRuns = (runsData.runs || []).map((run: any) => ({
                ...run,
                podcastId: podcast.id,
              }));
              allRuns.push(...podcastRuns);
            }
          } catch (error) {
            console.error(`Error fetching runs for podcast ${podcast.id}:`, error);
          }
        }
      }

      // Sort runs by creation date (newest first)
      allRuns.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Categorize runs
      const activeRuns = allRuns.filter(r => r.status === 'running' || r.status === 'pending');
      const failedRuns = allRuns.filter(r => r.status === 'failed').slice(0, 5);
      const completedRuns = allRuns.filter(r => r.status === 'completed').slice(0, 5);
      const recentRuns = allRuns.slice(0, 10);
      
      // Filter completed runs with audio (episodes)
      const recentEpisodes = allRuns
        .filter(r => 
          r.status === 'completed' && 
          (r.output?.audioS3Key || r.output?.audioPath)
        )
        .slice(0, 5);

      setData({
        podcasts,
        allRuns,
        recentRuns,
        activeRuns,
        failedRuns,
        completedRuns,
        recentEpisodes,
      });
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 45 seconds if enabled and there are active runs
  useEffect(() => {
    if (!autoRefreshEnabled || data.activeRuns.length === 0) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 45000); // 45 seconds

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, data.activeRuns.length, fetchDashboardData]);

  // Calculate metrics
  const metrics = {
    totalPodcasts: data.podcasts.length,
    activePodcasts: data.podcasts.filter(p => p.status === 'active').length,
    totalRuns: data.allRuns.length,
    activeRuns: data.activeRuns.length,
    completedRuns: data.completedRuns.length,
    failedRuns: data.failedRuns.length,
    totalEpisodes: data.completedRuns.length,
  };

  const getPodcastTitle = (podcastId: string) => {
    return data.podcasts.find(p => p.id === podcastId)?.title || 'Unknown Podcast';
  };

  const getStageProgress = (run: Run) => {
    if (!run.progress?.stages) return 0;
    const stages = Object.keys(run.progress.stages);
    const completed = stages.filter(s => run.progress?.stages[s]?.status === 'completed').length;
    return stages.length > 0 ? Math.round((completed / stages.length) * 100) : 0;
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted">
            Control center for your podcasts, runs, and publishing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${autoRefreshEnabled ? 'animate-spin' : ''}`} />
            {autoRefreshEnabled ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          {lastRefresh && (
            <span className="text-xs text-muted">
              Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Mic className="w-5 h-5" />}
          label="Total Podcasts"
          value={metrics.totalPodcasts}
          change={`${metrics.activePodcasts} active`}
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          label="Active Runs"
          value={metrics.activeRuns}
          change={metrics.activeRuns > 0 ? 'In progress' : 'None'}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <MetricCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Completed"
          value={metrics.completedRuns}
          change={`${metrics.totalEpisodes} episodes`}
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
        <MetricCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="Failed"
          value={metrics.failedRuns}
          change={metrics.failedRuns > 0 ? 'Needs attention' : 'All good'}
          color="text-red-500"
          bgColor="bg-red-500/10"
        />
      </div>

      {/* Active Runs */}
      {data.activeRuns.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Active Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.activeRuns.map((run) => (
                <ActiveRunCard
                  key={run.id}
                  run={run}
                  podcastTitle={getPodcastTitle(run.podcastId)}
                  progress={getStageProgress(run)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : metrics.totalPodcasts === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={<Mic className="w-12 h-12" />}
              title="No podcasts yet"
              description="Create your first podcast to start generating episodes automatically"
              action={
                <Link href="/podcasts/new">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Your First Podcast
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Quick Actions & Next Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/podcasts/new" className="block">
              <Button className="w-full justify-start gap-2" size="lg">
                <Plus className="w-4 h-4" />
                Create New Podcast
              </Button>
            </Link>
            {data.podcasts.length > 0 && (
              <Link href="/podcasts" className="block">
                <Button variant="outline" className="w-full justify-start gap-2" size="lg">
                  <Mic className="w-4 h-4" />
                  View All Podcasts
                </Button>
              </Link>
            )}
            {data.failedRuns.length > 0 && (
              <Link href={`/podcasts/${data.failedRuns[0].podcastId}/runs/${data.failedRuns[0].id}`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2 text-red-500 hover:text-red-500 hover:bg-red-500/10" size="lg">
                  <AlertTriangle className="w-4 h-4" />
                  Retry Failed Run
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Health Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <HealthItem
              label="Podcasts"
              status={metrics.totalPodcasts > 0 ? 'healthy' : 'empty'}
              message={metrics.totalPodcasts > 0 ? `${metrics.totalPodcasts} configured` : 'No podcasts yet'}
            />
            <HealthItem
              label="Active Runs"
              status={metrics.activeRuns > 0 ? 'active' : 'idle'}
              message={metrics.activeRuns > 0 ? `${metrics.activeRuns} running` : 'No active runs'}
            />
            <HealthItem
              label="Failed Runs"
              status={metrics.failedRuns > 0 ? 'error' : 'healthy'}
              message={metrics.failedRuns > 0 ? `${metrics.failedRuns} need attention` : 'All runs successful'}
            />
            <HealthItem
              label="Episodes"
              status={metrics.totalEpisodes > 0 ? 'healthy' : 'empty'}
              message={metrics.totalEpisodes > 0 ? `${metrics.totalEpisodes} published` : 'No episodes yet'}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Episodes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              Recent Episodes
            </CardTitle>
            {data.recentEpisodes.length > 0 && (
              <Link href="/podcasts">
                <Button variant="ghost" size="sm" className="gap-2">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data.recentEpisodes.length > 0 ? (
            <div className="space-y-3">
              {data.recentEpisodes.map((episode) => (
                <EpisodeItem 
                  key={episode.id} 
                  episode={episode} 
                  podcastTitle={getPodcastTitle(episode.podcastId)} 
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Headphones className="w-12 h-12" />}
              title="No episodes yet"
              description="Complete your first pipeline run to see published episodes here"
              action={
                data.podcasts.length > 0 ? (
                  <Link href="/podcasts">
                    <Button variant="outline" className="gap-2">
                      <Play className="w-4 h-4" />
                      Start a Run
                    </Button>
                  </Link>
                ) : (
                  <Link href="/podcasts/new">
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create Your First Podcast
                    </Button>
                  </Link>
                )
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
            <Link href="/podcasts">
              <Button variant="ghost" size="sm" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentRuns.length > 0 ? (
            <div className="space-y-3">
              {data.recentRuns.slice(0, 5).map((run) => (
                <ActivityItem key={run.id} run={run} podcastTitle={getPodcastTitle(run.podcastId)} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Radio className="w-12 h-12" />}
              title="No runs yet"
              description="Start your first pipeline run to see activity here"
              action={
                <Link href="/podcasts/new">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Your First Podcast
                  </Button>
                </Link>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Failed Runs (if any) */}
      {data.failedRuns.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Failed Runs (Needs Attention)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.failedRuns.map((run) => (
                <FailedRunCard
                  key={run.id}
                  run={run}
                  podcastTitle={getPodcastTitle(run.podcastId)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Skeleton Loader
function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="h-12 skeleton rounded mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 skeleton rounded" />
        ))}
      </div>
      <div className="h-64 skeleton rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-48 skeleton rounded" />
        <div className="h-48 skeleton rounded" />
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  icon, 
  label, 
  value, 
  change, 
  color, 
  bgColor 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  change: string; 
  color: string; 
  bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg ${bgColor}`}>
            <div className={color}>{icon}</div>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-2xl sm:text-3xl font-bold">{value}</p>
          <p className="text-xs sm:text-sm text-muted mt-1">{label}</p>
          <p className="text-xs text-muted mt-1">{change}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Active Run Card
function ActiveRunCard({ run, podcastTitle, progress }: { run: Run; podcastTitle: string; progress: number }) {
  const currentStage = run.progress?.currentStage || 'starting';
  
  return (
    <Link href={`/podcasts/${run.podcastId}/runs/${run.id}`}>
      <div className="p-4 border border-border rounded-lg hover:border-primary transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm sm:text-base mb-1">{podcastTitle}</h3>
            <p className="text-xs text-muted">Stage: {currentStage}</p>
          </div>
          <Badge variant="default" className="bg-blue-500/20 text-blue-500">
            <Clock className="w-3 h-3 mr-1" />
            Running
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Activity Item
function ActivityItem({ run, podcastTitle }: { run: Run; podcastTitle: string }) {
  const getStatusIcon = () => {
    switch (run.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-muted" />;
    }
  };

  const getStatusColor = () => {
    switch (run.status) {
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'running':
        return 'text-blue-500';
      default:
        return 'text-muted';
    }
  };

  return (
    <Link href={`/podcasts/${run.podcastId}/runs/${run.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-border transition-colors">
        <div className="flex-shrink-0">{getStatusIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{podcastTitle}</p>
          <p className="text-xs text-muted">
            {run.output?.episodeTitle || `Run ${run.id.slice(-8)}`}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`text-xs font-medium ${getStatusColor()}`}>
            {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
          </p>
          <p className="text-xs text-muted">
            {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Link>
  );
}

// Failed Run Card
function FailedRunCard({ run, podcastTitle }: { run: Run; podcastTitle: string }) {
  return (
    <Link href={`/podcasts/${run.podcastId}/runs/${run.id}`}>
      <div className="p-4 border border-red-500/20 rounded-lg hover:border-red-500/40 transition-all bg-red-500/5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-sm sm:text-base mb-1">{podcastTitle}</h3>
            <p className="text-xs text-muted mb-2">
              {run.error || 'Run failed'}
            </p>
          </div>
          <Badge variant="danger" className="bg-red-500/20 text-red-500">
            Failed
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" variant="outline" className="gap-2 text-xs">
            <RefreshCw className="w-3 h-3" />
            Retry
          </Button>
          <span className="text-xs text-muted">
            {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Health Item
function HealthItem({ label, status, message }: { label: string; status: string; message: string }) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'active':
        return 'text-blue-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-muted';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4" />;
      case 'active':
        return <Activity className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-border/50 transition-colors">
      <div className="flex items-center gap-2">
        <div className={getStatusColor()}>{getStatusIcon()}</div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-xs text-muted">{message}</span>
    </div>
  );
}

// Episode Item Component
function EpisodeItem({ episode, podcastTitle }: { episode: Run; podcastTitle: string }) {
  // Construct audio URL
  let audioUrl = null;
  if (episode.output?.audioS3Key) {
    const s3Key = episode.output.audioS3Key.startsWith('/') 
      ? episode.output.audioS3Key.substring(1) 
      : episode.output.audioS3Key;
    audioUrl = `/api/serve-file/${s3Key}`;
  } else if (episode.output?.audioPath) {
    const path = episode.output.audioPath.replace(/^\/output\//, '');
    audioUrl = `/api/serve-file/${path}`;
  }

  const episodeTitle = episode.output?.episodeTitle || `Episode ${episode.id.slice(-8)}`;
  const pubDate = episode.completedAt || episode.startedAt || episode.createdAt;
  const duration = episode.duration ? `${Math.round(episode.duration / 60)} min` : null;

  return (
    <Link href={`/podcasts/${episode.podcastId}/episodes/${episode.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-border transition-colors group">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/10 rounded-lg flex items-center justify-center">
          <Radio className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {episodeTitle}
          </p>
          <p className="text-xs text-muted truncate">{podcastTitle}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted">
              {formatDistanceToNow(new Date(pubDate), { addSuffix: true })}
            </span>
            {duration && (
              <>
                <span className="text-xs text-muted">•</span>
                <span className="text-xs text-muted">{duration}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          {audioUrl && (
            <Link
              href={audioUrl}
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-full hover:bg-primary/20 transition-colors"
              aria-label="Play episode"
            >
              <Play className="w-4 h-4 text-primary" />
            </Link>
          )}
          <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// Empty State
function EmptyState({ 
  icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <div className="text-muted mb-4 flex justify-center">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted mb-6">{description}</p>
      {action}
    </div>
  );
}

