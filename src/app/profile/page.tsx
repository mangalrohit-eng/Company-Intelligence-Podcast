/**
 * Profile Page
 */

'use client';

import { Calendar, Mail, Building } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted">Loading profile...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.charAt(0).toUpperCase() + (displayName.split(' ')[1]?.charAt(0) || '').toUpperCase();

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-secondary border border-border rounded-lg p-8 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-4xl font-bold text-primary-foreground">
              {initials || '👤'}
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{displayName}</h1>
              <p className="text-muted mb-4">{user?.email || 'No email'}</p>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user?.email || 'No email'}
                </div>
                {user?.emailVerified && (
                  <div className="flex items-center gap-2 text-green-500">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-secondary border border-border rounded-lg p-6">
            <div className="text-3xl font-bold mb-2">12</div>
            <div className="text-muted">Podcasts Created</div>
          </div>
          <div className="bg-secondary border border-border rounded-lg p-6">
            <div className="text-3xl font-bold mb-2">156</div>
            <div className="text-muted">Episodes Published</div>
          </div>
          <div className="bg-secondary border border-border rounded-lg p-6">
            <div className="text-3xl font-bold mb-2">2.4k</div>
            <div className="text-muted">Total Listens</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-secondary border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { action: 'Created new podcast', title: 'Tech Weekly', time: '2 hours ago' },
              { action: 'Published episode', title: 'AI Trends 2025', time: '1 day ago' },
              { action: 'Updated settings', title: 'Tech Industry Insights', time: '3 days ago' },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-background rounded-lg">
                <div>
                  <div className="font-medium">{activity.action}</div>
                  <div className="text-sm text-muted">{activity.title}</div>
                </div>
                <div className="text-sm text-muted">{activity.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}

