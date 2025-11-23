/**
 * Profile Page
 */

'use client';

import { useState, useEffect } from 'react';
import { Calendar, Mail, Building } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    podcastsCreated: 0,
    episodesPublished: 0,
    totalListens: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    // Fetch user stats
    const fetchStats = async () => {
      try {
        const { api } = await import('@/lib/api');
        const podcastsResponse = await api.get('/podcasts');
        
        if (podcastsResponse.ok) {
          const podcastsData = await podcastsResponse.json();
          const podcasts = podcastsData.podcasts || [];
          
          // Count episodes from all podcasts
          let totalEpisodes = 0;
          for (const podcast of podcasts) {
            const runsResponse = await api.get(`/podcasts/${podcast.id}/runs`);
            if (runsResponse.ok) {
              const runsData = await runsResponse.json();
              const completedRuns = (runsData.runs || []).filter(
                (run: any) => run.status === 'completed' && run.output?.audioS3Key
              );
              totalEpisodes += completedRuns.length;
            }
          }
          
          setStats({
            podcastsCreated: podcasts.length,
            episodesPublished: totalEpisodes,
            totalListens: 0, // TODO: Implement listen tracking
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || 'No email';
  const joinedDate = user?.userId ? new Date(parseInt(user.userId.split('-')[0]) || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-secondary border border-border rounded-lg p-8 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-6xl">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{displayName}</h1>
              <p className="text-muted mb-4">{user?.emailVerified ? 'Verified User' : 'User'}</p>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {displayEmail}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Joined {joinedDate}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-secondary border border-border rounded-lg p-6">
            <div className="text-3xl font-bold mb-2">{stats.podcastsCreated}</div>
            <div className="text-muted">Podcasts Created</div>
          </div>
          <div className="bg-secondary border border-border rounded-lg p-6">
            <div className="text-3xl font-bold mb-2">{stats.episodesPublished}</div>
            <div className="text-muted">Episodes Published</div>
          </div>
          <div className="bg-secondary border border-border rounded-lg p-6">
            <div className="text-3xl font-bold mb-2">{stats.totalListens}</div>
            <div className="text-muted">Total Listens</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-secondary border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-background rounded-lg">
                  <div>
                    <div className="font-medium">{activity.action}</div>
                    <div className="text-sm text-muted">{activity.title}</div>
                  </div>
                  <div className="text-sm text-muted">{activity.time}</div>
                </div>
              ))
            ) : (
              <p className="text-muted text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}

