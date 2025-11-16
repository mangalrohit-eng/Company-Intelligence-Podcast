/**
 * My Podcasts Page - Dashboard view of all user's podcasts
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Play, Settings, Share2, Calendar, MoreVertical, Rss, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    fetchPodcasts();
  }, []);

  const fetchPodcasts = async () => {
    try {
      setLoading(true);
      // Call real API endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/podcasts`);
      
      if (response.ok) {
        const data = await response.json();
        setPodcasts(data.podcasts || []);
      } else {
        console.error('Failed to fetch podcasts:', response.statusText);
        // Show empty state on error
        setPodcasts([]);
      }
    } catch (error) {
      console.error('Error fetching podcasts:', error);
      // Show empty state on error
      setPodcasts([]);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Podcasts</h1>
              <p className="text-muted">Manage and monitor your AI-generated podcasts</p>
            </div>
            <Link href="/podcasts/new">
              <Button size="lg" className="gap-2 w-full md:w-auto">
                <Plus className="w-5 h-5" />
                New Podcast
              </Button>
            </Link>
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-md">
            <input
              type="search"
              placeholder="Search podcasts..."
              className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Podcasts Grid */}
        {podcasts.length === 0 ? (
          <Card className="text-center py-24">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Play className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">No podcasts yet</h2>
            <p className="text-muted mb-8 max-w-md mx-auto">
              Create your first AI-powered podcast and start generating episodes automatically
            </p>
            <Link href="/podcasts/new">
              <Button size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                Create Your First Podcast
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
  const [showMenu, setShowMenu] = useState(false);

  const handleRunNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm(`Start a new run for "${podcast.title}"?`)) {
      alert('🚀 Starting pipeline...\n\nIn production, this would:\n1. Call API: POST /podcasts/' + podcast.id + '/runs\n2. Start Step Functions execution\n3. Navigate to live progress view\n\nFor now, try running a stage manually:\nnpm run run-stage -- --stage summarize --in fixtures/summarize/in.json --out output.json');
    }
  };

  const getCadenceColor = (cadence: string) => {
    switch (cadence.toLowerCase()) {
      case 'daily': return 'success';
      case 'weekly': return 'default';
      case 'monthly': return 'warning';
      default: return 'outline';
    }
  };

  return (
    <Card className="group hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all">
      <Link href={`/podcasts/${podcast.id}`} className="block p-4">
        {/* Cover Art */}
        <div className="relative aspect-square bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-lg mb-4 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
          <div className="text-6xl group-hover:scale-110 transition-transform">🎙️</div>
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button
              size="icon"
              className="w-12 h-12"
              onClick={handleRunNow}
            >
              <Play className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-primary transition-colors">
            {podcast.title}
          </h3>
          <p className="text-sm text-muted truncate">{podcast.subtitle}</p>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant={getCadenceColor(podcast.cadence)}>
            <Calendar className="w-3 h-3 mr-1" />
            {podcast.cadence}
          </Badge>
          <Badge variant="success">
            {podcast.status}
          </Badge>
        </div>
      </Link>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2 border-t border-border pt-4">
        <Button
          size="sm"
          className="flex-1 gap-2"
          onClick={handleRunNow}
        >
          <Play className="w-4 h-4" />
          Run Now
        </Button>
        
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              setShowMenu(!showMenu);
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-secondary border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-border transition-colors flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Edit Settings
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-border transition-colors flex items-center gap-2">
                  <Rss className="w-4 h-4" />
                  Copy RSS URL
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-border transition-colors flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <div className="border-t border-border my-1" />
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/10 text-red-500 transition-colors flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

