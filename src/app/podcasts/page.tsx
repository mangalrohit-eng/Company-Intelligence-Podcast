/**
 * My Podcasts Page - Dashboard view of all user's podcasts
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Play, Settings, Share2, Calendar } from 'lucide-react';

interface Podcast {
  id: string;
  title: string;
  subtitle: string;
  coverArtUrl: string;
  cadence: string;
  status: string;
  updatedAt: string;
}

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch podcasts from API
    // Stub data for now
    setTimeout(() => {
      setPodcasts([
        {
          id: '1',
          title: 'Tech Industry Insights',
          subtitle: 'Daily AI and tech news',
          coverArtUrl: '',
          cadence: 'daily',
          status: 'active',
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Finance Weekly',
          subtitle: 'Market analysis and trends',
          coverArtUrl: '',
          cadence: 'weekly',
          status: 'active',
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          title: 'Startup Stories',
          subtitle: 'Founder interviews',
          coverArtUrl: '',
          cadence: 'monthly',
          status: 'active',
          updatedAt: new Date().toISOString(),
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-12 w-64 skeleton rounded mb-8" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-80 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">My Podcasts</h1>
          <Link
            href="/podcasts/new"
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-accent text-background font-semibold rounded-full transition-all"
          >
            <Plus className="w-5 h-5" />
            New Podcast
          </Link>
        </div>

        {/* Podcasts Grid */}
        {podcasts.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🎙️</div>
            <h2 className="text-2xl font-semibold mb-4">No podcasts yet</h2>
            <p className="text-muted mb-8">Create your first AI-powered podcast</p>
            <Link
              href="/podcasts/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-accent text-background font-semibold rounded-full transition-all"
            >
              <Plus className="w-5 h-5" />
              Create Podcast
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {podcasts.map((podcast) => (
              <PodcastCard key={podcast.id} podcast={podcast} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PodcastCard({ podcast }: { podcast: Podcast }) {
  const handleRunNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm(`Start a new run for "${podcast.title}"?`)) {
      alert('🚀 Starting pipeline...\n\nIn production, this would:\n1. Call API: POST /podcasts/' + podcast.id + '/runs\n2. Start Step Functions execution\n3. Navigate to live progress view\n\nFor now, try running a stage manually:\nnpm run run-stage -- --stage summarize --in fixtures/summarize/in.json --out output.json');
    }
  };

  return (
    <Link href={`/podcasts/${podcast.id}`}>
      <div className="group relative bg-secondary hover:bg-secondary/80 p-4 rounded-lg border border-border hover:border-primary transition-all cursor-pointer">
        {/* Cover Art */}
        <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg mb-4 flex items-center justify-center text-6xl">
          🎙️
        </div>

        {/* Info */}
        <h3 className="font-semibold text-lg mb-1 truncate">{podcast.title}</h3>
        <p className="text-sm text-muted mb-3 truncate">{podcast.subtitle}</p>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-muted mb-4">
          <Calendar className="w-4 h-4" />
          <span className="capitalize">{podcast.cadence}</span>
          <span className="ml-auto px-2 py-1 bg-primary/20 text-primary rounded">
            {podcast.status}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button 
            onClick={handleRunNow}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-accent text-background rounded-full text-sm font-medium transition-all"
          >
            <Play className="w-4 h-4" />
            Run Now
          </button>
          <button className="p-2 hover:bg-border rounded-full transition-all">
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-border rounded-full transition-all">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </Link>
  );
}

