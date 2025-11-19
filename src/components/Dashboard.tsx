/**
 * Dashboard Component - Functional workspace for authenticated users
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Mic, Radio, TrendingUp, Plus, Clock, Calendar, ArrowRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface DashboardStats {
  totalPodcasts: number;
  activeRuns: number;
  episodesThisMonth: number;
  totalEpisodes: number;
}

interface Podcast {
  id: string;
  title: string;
  status: string;
  lastRunAt?: string;
  episodeCount?: number;
  config?: {
    schedule?: string;
  };
}

interface Run {
  id: string;
  status: string;
  startedAt: string;
  podcastId: string;
}

interface ActivityItem {
  type: 'run_completed' | 'episode_published' | 'podcast_created' | 'run_started';
  message: string;
  timestamp: string;
  link?: string;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPodcasts: 0,
    activeRuns: 0,
    episodesThisMonth: 0,
    totalEpisodes: 0,
  });
  const [recentPodcasts, setRecentPodcasts] = useState<Podcast[]>([]);
  const [activeRuns, setActiveRuns] = useState<Run[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { api } = await import('@/lib/api');
      
      // Fetch podcasts
      const podcastsResponse = await api.get('/podcasts');
      if (podcastsResponse.ok) {
        const podcastsData = await podcastsResponse.json();
        const podcasts = podcastsData.podcasts || [];
        
        // Calculate stats
        const totalPodcasts = podcasts.length;
        const activePodcasts = podcasts.filter((p: Podcast) => p.status === 'active');
        const totalEpisodes = podcasts.reduce((sum: number, p: Podcast) => sum + (p.episodeCount || 0), 0);
        
        // Get recent podcasts (sorted by lastRunAt or updatedAt)
        const sortedPodcasts = [...podcasts].sort((a: Podcast, b: Podcast) => {
          const aTime = a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0;
          const bTime = b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0;
          return bTime - aTime;
        });
        
        setRecentPodcasts(sortedPodcasts.slice(0, 5));
        setStats({
          totalPodcasts,
          activeRuns: 0, // Will be calculated from runs
          episodesThisMonth: 0, // Would need episode data
          totalEpisodes,
        });

        // Fetch runs for active runs count
        let activeRunsCount = 0;
        const allActiveRuns: Run[] = [];
        const runsPromises = podcasts.slice(0, 10).map(async (podcast: Podcast) => {
          try {
            const runsResponse = await api.get(`/podcasts/${podcast.id}/runs`);
            if (runsResponse.ok) {
              const runsData = await runsResponse.json();
              const runs = runsData.runs || [];
              const active = runs.filter((r: Run) => r.status === 'running' || r.status === 'pending');
              activeRunsCount += active.length;
              
              // Collect active runs for display
              active.forEach((run: Run) => {
                allActiveRuns.push({ ...run, podcastId: podcast.id });
              });
            }
          } catch (error) {
            console.error(`Error fetching runs for podcast ${podcast.id}:`, error);
          }
        });
        
        await Promise.all(runsPromises);
        
        setActiveRuns(allActiveRuns);
        setStats(prev => ({
          ...prev,
          activeRuns: activeRunsCount,
        }));

        // Generate activity feed from podcasts and runs
        const activityItems: ActivityItem[] = [];
        
        podcasts.slice(0, 10).forEach((podcast: Podcast) => {
          if (podcast.lastRunAt) {
            activityItems.push({
              type: 'run_completed',
              message: `Run completed for "${podcast.title}"`,
              timestamp: podcast.lastRunAt,
              link: `/podcasts/${podcast.id}`,
            });
          }
        });
        
        // Sort by timestamp and take most recent
        activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setActivity(activityItems.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted">Welcome back! Here's what's happening with your podcasts.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
          <StatCard
            label="Total Podcasts"
            value={stats.totalPodcasts}
            icon={<Mic className="w-5 h-5" />}
            link="/podcasts"
            color="primary"
          />
          <StatCard
            label="Active Runs"
            value={stats.activeRuns}
            icon={<Play className="w-5 h-5" />}
            link="/podcasts?filter=running"
            color="blue"
          />
          <StatCard
            label="Episodes This Month"
            value={stats.episodesThisMonth}
            icon={<Radio className="w-5 h-5" />}
            link="/episodes"
            color="green"
          />
          <StatCard
            label="Total Episodes"
            value={stats.totalEpisodes}
            icon={<TrendingUp className="w-5 h-5" />}
            link="/episodes"
            color="purple"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link href="/podcasts/new" className="flex-1 sm:flex-initial min-w-[140px]">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">Create New Podcast</span>
              </Button>
            </Link>
            <Link href="/podcasts" className="flex-1 sm:flex-initial min-w-[140px]">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">View All Podcasts</span>
              </Button>
            </Link>
            {stats.activeRuns > 0 && (
              <Link href="/podcasts?filter=running" className="flex-1 sm:flex-initial min-w-[140px]">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">Active Runs ({stats.activeRuns})</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Recent Podcasts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Podcasts</CardTitle>
                <Link href="/podcasts">
                  <Button variant="ghost" size="sm" className="gap-2">
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentPodcasts.length === 0 ? (
                <div className="text-center py-8">
                  <Mic className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-muted mb-4">No podcasts yet</p>
                  <Link href="/podcasts/new">
                    <Button>Create Your First Podcast</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPodcasts.map((podcast) => (
                    <PodcastListItem key={podcast.id} podcast={podcast} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Activity className="w-5 h-5 text-muted" />
              </div>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-muted">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activity.map((item, idx) => (
                    <ActivityItem key={idx} item={item} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Runs Section */}
        {activeRuns.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Active Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeRuns.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <div>
                        <div className="font-medium text-sm">Run {run.id.substring(0, 20)}...</div>
                        <div className="text-xs text-muted">
                          Started {new Date(run.startedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Link href={`/podcasts/${run.podcastId}/runs/${run.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State for New Users */}
        {stats.totalPodcasts === 0 && (
          <Card className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">Get Started</h2>
              <p className="text-muted mb-6">
                Create your first AI-powered podcast and start generating episodes automatically
              </p>
              <Link href="/podcasts/new">
                <Button size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Create Your First Podcast
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  link,
  color = 'primary',
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  link?: string;
  color?: 'primary' | 'blue' | 'green' | 'purple';
}) {
  const colorClasses = {
    primary: 'text-primary',
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
  };

  const content = (
    <Card className="hover:border-primary transition-all cursor-pointer h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted">{label}</span>
          <div className={colorClasses[color]}>{icon}</div>
        </div>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}

function PodcastListItem({ podcast }: { podcast: Podcast }) {
  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Link href={`/podcasts/${podcast.id}`}>
      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {podcast.title}
            </h3>
            <Badge variant={podcast.status === 'active' ? 'success' : 'outline'}>
              {podcast.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted">
            {podcast.lastRunAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last run: {getTimeAgo(podcast.lastRunAt)}
              </span>
            )}
            {podcast.episodeCount !== undefined && (
              <span>{podcast.episodeCount} episodes</span>
            )}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

function ActivityItem({ item }: { item: ActivityItem }) {
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getIcon = () => {
    switch (item.type) {
      case 'run_completed':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'episode_published':
        return <Radio className="w-4 h-4 text-blue-500" />;
      case 'podcast_created':
        return <Mic className="w-4 h-4 text-primary" />;
      case 'run_started':
        return <Activity className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted" />;
    }
  };

  const content = (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">{item.message}</div>
        <div className="text-xs text-muted mt-1">{getTimeAgo(item.timestamp)}</div>
      </div>
    </div>
  );

  if (item.link) {
    return <Link href={item.link}>{content}</Link>;
  }

  return content;
}

