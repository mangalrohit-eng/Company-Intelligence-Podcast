/**
 * Podcast Detail Page - Overview with tabs
 */

'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Play, Settings, Copy, Calendar, Clock } from 'lucide-react';

type Tab = 'overview' | 'episodes' | 'runs' | 'settings';

export default function PodcastDetailPage() {
  const params = useParams();
  const podcastId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // TODO: Fetch podcast data
  const podcast = {
    id: podcastId,
    title: 'Tech Industry Insights',
    subtitle: 'Daily AI and tech news',
    description: 'Stay updated with the latest developments in AI and technology.',
    coverArtUrl: '',
    cadence: 'daily',
    status: 'active',
    rssUrl: `https://example.com/rss/${podcastId}.xml`,
    lastRun: '2025-01-15T10:00:00Z',
    nextRun: '2025-01-16T10:00:00Z',
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-8 mb-8">
          {/* Cover Art */}
          <div className="w-64 h-64 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center text-8xl">
            🎙️
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-5xl font-bold mb-2">{podcast.title}</h1>
            <p className="text-xl text-muted mb-4">{podcast.subtitle}</p>
            <p className="text-muted mb-6 max-w-2xl">{podcast.description}</p>

            <div className="flex gap-4 mb-6">
              <button className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-accent text-background font-semibold rounded-full transition-all">
                <Play className="w-5 h-5" />
                Run Now
              </button>
              <button className="flex items-center gap-2 px-6 py-3 border border-border hover:border-primary rounded-full transition-all">
                <Settings className="w-5 h-5" />
                Settings
              </button>
              <button className="flex items-center gap-2 px-6 py-3 border border-border hover:border-primary rounded-full transition-all">
                <Copy className="w-5 h-5" />
                Copy RSS
              </button>
            </div>

            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted" />
                <span className="text-muted">Cadence:</span>
                <span className="font-medium capitalize">{podcast.cadence}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted" />
                <span className="text-muted">Last run:</span>
                <span className="font-medium">{new Date(podcast.lastRun).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-8">
          <div className="flex gap-8">
            {(['overview', 'episodes', 'runs', 'settings'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && <OverviewTab podcast={podcast} />}
          {activeTab === 'episodes' && <EpisodesTab podcastId={podcastId} />}
          {activeTab === 'runs' && <RunsTab podcastId={podcastId} />}
          {activeTab === 'settings' && <SettingsTab podcast={podcast} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ podcast }: any) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-secondary border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Statistics</h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted">Total Episodes</span>
            <span className="font-semibold">42</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Total Runs</span>
            <span className="font-semibold">45</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Success Rate</span>
            <span className="font-semibold text-primary">93.3%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Avg Duration</span>
            <span className="font-semibold">4:32</span>
          </div>
        </div>
      </div>

      <div className="bg-secondary border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">RSS Feed</h3>
        <p className="text-sm text-muted mb-4">
          Subscribe to this podcast in your favorite app
        </p>
        <div className="bg-background border border-border rounded p-3 mb-4 font-mono text-sm break-all">
          {podcast.rssUrl}
        </div>
        <div className="flex gap-2">
          <button className="flex-1 px-4 py-2 bg-primary hover:bg-accent text-background rounded-lg transition-all">
            Copy URL
          </button>
          <button className="px-4 py-2 border border-border hover:border-primary rounded-lg transition-all">
            Validate
          </button>
        </div>
      </div>
    </div>
  );
}

function EpisodesTab({ podcastId: _podcastId }: { podcastId: string }) {
  // TODO: Fetch episodes
  const episodes = [
    {
      id: '1',
      title: 'Episode 42: AI Chip Breakthrough',
      pubDate: '2025-01-15T10:00:00Z',
      duration: 272,
      status: 'published',
    },
  ];

  return (
    <div className="space-y-4">
      {episodes.map((episode) => (
        <div
          key={episode.id}
          className="bg-secondary border border-border rounded-lg p-6 hover:border-primary transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">{episode.title}</h3>
              <div className="text-sm text-muted">
                {new Date(episode.pubDate).toLocaleDateString()} •{' '}
                {Math.floor(episode.duration / 60)}:{(episode.duration % 60)
                  .toString()
                  .padStart(2, '0')}
              </div>
            </div>
            <button className="p-3 bg-primary hover:bg-accent text-background rounded-full transition-all">
              <Play className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RunsTab({ podcastId: _podcastId }: { podcastId: string }) {
  // TODO: Fetch runs
  const runs = [
    {
      id: 'run-1',
      status: 'success',
      startedAt: '2025-01-15T09:00:00Z',
      duration: 420,
      episodeId: 'ep-1',
    },
  ];

  return (
    <div className="space-y-4">
      {runs.map((run) => (
        <div
          key={run.id}
          className="bg-secondary border border-border rounded-lg p-6 hover:border-primary transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-sm">{run.id.substring(0, 8)}</span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    run.status === 'success'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-red-500/20 text-red-500'
                  }`}
                >
                  {run.status}
                </span>
              </div>
              <div className="text-sm text-muted">
                {new Date(run.startedAt).toLocaleString()} • {Math.floor(run.duration / 60)}m{' '}
                {run.duration % 60}s
              </div>
            </div>
            <button className="px-4 py-2 border border-border hover:border-primary rounded-lg transition-all">
              View Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab({ podcast: _podcast }: any) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-secondary border border-border rounded-lg p-6">
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
      </div>

      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-2 text-red-500">Danger Zone</h3>
        <p className="text-sm text-muted mb-4">
          Irreversible actions. Please proceed with caution.
        </p>
        <button className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all">
          Delete Podcast
        </button>
      </div>
    </div>
  );
}

