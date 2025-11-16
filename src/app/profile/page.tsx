/**
 * Profile Page
 */

'use client';

import { Calendar, Mail, Building } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-secondary border border-border rounded-lg p-8 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-6xl">
              👤
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">John Doe</h1>
              <p className="text-muted mb-4">Product Manager</p>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  john@example.com
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Acme Corp
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Joined Jan 2025
                </div>
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
  );
}

