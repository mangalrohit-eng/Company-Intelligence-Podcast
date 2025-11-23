/**
 * My Podcasts Page - Dashboard view of all user's podcasts
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Play, Settings, Share2, Calendar, MoreVertical, Rss, Trash2, Search, Filter, Grid, List, Pause, Edit, Copy, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToastContext } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/components/ui/dialog';

interface Podcast {
  id: string;
  title: string;
  subtitle: string;
  coverArtUrl: string;
  cadence: string;
  status: string;
  updatedAt: string;
  lastRun?: string;
  nextRun?: string;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'title' | 'lastRun' | 'nextRun' | 'created';

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cadenceFilter, setCadenceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('lastRun');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const toast = useToastContext();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    fetchPodcasts();
  }, []);

  const fetchPodcasts = async () => {
    try {
      setLoading(true);
      // Call real AWS Lambda API endpoint with auth token
      const { api } = await import('@/lib/api');
      const response = await api.get('/podcasts');
      
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

  // Filter and sort podcasts
  const filteredPodcasts = podcasts
    .filter(podcast => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        podcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        podcast.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || podcast.status === statusFilter;
      
      // Cadence filter
      const matchesCadence = cadenceFilter === 'all' || podcast.cadence === cadenceFilter;
      
      return matchesSearch && matchesStatus && matchesCadence;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'lastRun':
          return (b.lastRun || '').localeCompare(a.lastRun || '');
        case 'nextRun':
          return (a.nextRun || '').localeCompare(b.nextRun || '');
        case 'created':
          return b.updatedAt.localeCompare(a.updatedAt);
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <ProtectedRoute>
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
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
    <div className="min-h-screen p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {ConfirmDialog}
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">My Podcasts</h1>
              <p className="text-sm sm:text-base text-muted">Manage and monitor your AI-generated podcasts</p>
            </div>
            <Link href="/podcasts/new" className="w-full md:w-auto">
              <Button size="lg" className="gap-2 w-full md:w-auto">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">New Podcast</span>
                <span className="sm:hidden">New</span>
              </Button>
            </Link>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted" />
              <Input
                type="text"
                placeholder="Search podcasts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap lg:flex-nowrap">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-w-[120px] sm:min-w-[140px] text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="error">Error</option>
              </Select>

              <Select
                value={cadenceFilter}
                onChange={(e) => setCadenceFilter(e.target.value)}
                className="min-w-[120px] sm:min-w-[140px] text-sm"
              >
                <option value="all">All Cadence</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>

              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-w-[120px] sm:min-w-[140px] text-sm"
              >
                <option value="lastRun">Last Run</option>
                <option value="nextRun">Next Run</option>
                <option value="title">Title</option>
                <option value="created">Created</option>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex gap-1 border border-border rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 sm:p-2 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-border'
                  }`}
                  title="Grid view"
                >
                  <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 sm:p-2 rounded transition-colors ${
                    viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-border'
                  }`}
                  title="List view"
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results Count */}
          {(searchQuery || statusFilter !== 'all' || cadenceFilter !== 'all') && (
            <div className="text-sm text-muted mt-4">
              Showing {filteredPodcasts.length} of {podcasts.length} podcasts
            </div>
          )}
        </div>

        {/* Podcasts Grid/List */}
        {filteredPodcasts.length === 0 && podcasts.length > 0 ? (
          <Card className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No podcasts found</h2>
            <p className="text-muted mb-6">
              Try adjusting your search or filters
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setCadenceFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </Card>
        ) : podcasts.length === 0 ? (
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
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredPodcasts.map((podcast) => (
              <PodcastCard key={podcast.id} podcast={podcast} onUpdate={fetchPodcasts} />
            ))}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredPodcasts.map((podcast) => (
              <PodcastListItem key={podcast.id} podcast={podcast} onUpdate={fetchPodcasts} />
            ))}
          </div>
        )}
      </div>
    </div>
    </ProtectedRoute>
  );
}

function PodcastCard({ podcast, onUpdate }: { 
  podcast: Podcast; 
  onUpdate: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const toast = useToastContext();
  const { confirm } = useConfirmDialog();

  const handleRunNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    confirm(
      'Start Pipeline Run',
      `Start a new pipeline run for "${podcast.title}"?`,
      async () => {
        try {
          const { api } = await import('@/lib/api');
          const response = await api.post(`/podcasts/${podcast.id}/runs`);

          if (response.ok) {
            const data = await response.json();
            toast.success('Pipeline Started', `Run ID: ${data.runId}. Redirecting...`);
            setTimeout(() => {
              window.location.href = `/podcasts/${podcast.id}/runs/${data.runId}`;
            }, 1000);
          } else {
            const error = await response.text();
            toast.error('Failed to Start Pipeline', error);
          }
        } catch (error) {
          console.error('Error starting pipeline:', error);
          toast.error('Error Starting Pipeline', error instanceof Error ? error.message : 'Network error');
        }
      }
    );
  };

  const handlePauseResume = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    
    const action = podcast.status === 'active' ? 'pause' : 'resume';
    confirm(
      `${action === 'pause' ? 'Pause' : 'Resume'} Podcast`,
      `${action === 'pause' ? 'Pause' : 'Resume'} "${podcast.title}"?`,
      async () => {
        try {
          const { api } = await import('@/lib/api');
          const response = await api.patch(`/podcasts/${podcast.id}`, {
            status: action === 'pause' ? 'paused' : 'active'
          });

          if (response.ok) {
            toast.success('Success', `Podcast ${action}d successfully!`);
            onUpdate();
          } else {
            toast.error('Failed', `Failed to ${action} podcast`);
          }
        } catch (error) {
          console.error(`Error ${action}ing podcast:`, error);
          toast.error('Error', `Error ${action}ing podcast`);
        }
      }
    );
  };

  const handleClone = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    
    confirm(
      'Clone Podcast',
      `Clone "${podcast.title}"?`,
      async () => {
        try {
          const { api } = await import('@/lib/api');
          const response = await api.post(`/podcasts/${podcast.id}/clone`);

          if (response.ok) {
            const data = await response.json();
            toast.success('Podcast Cloned', 'Redirecting to edit...');
            setTimeout(() => {
              window.location.href = `/podcasts/${data.id}/edit`;
            }, 1000);
          } else {
            toast.error('Failed to Clone', 'Please try again');
          }
        } catch (error) {
          console.error('Error cloning podcast:', error);
          toast.error('Error Cloning', 'Please try again');
        }
      }
    );
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    
    confirm(
      'Archive Podcast',
      `Archive "${podcast.title}"? It will be hidden but can be restored later.`,
      async () => {
        try {
          const { api } = await import('@/lib/api');
          const response = await api.patch(`/podcasts/${podcast.id}`, {
            status: 'archived'
          });

          if (response.ok) {
            toast.success('Podcast Archived', 'The podcast has been archived');
            onUpdate();
          } else {
            toast.error('Failed to Archive', 'Please try again');
          }
        } catch (error) {
          console.error('Error archiving podcast:', error);
          toast.error('Error Archiving', 'Please try again');
        }
      },
      { variant: 'default' }
    );
  };

  const getCadenceColor = (cadence: string) => {
    if (!cadence) return 'outline';
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
            {podcast.cadence || 'Not Set'}
          </Badge>
          <Badge variant="success">
            {podcast.status}
          </Badge>
        </div>
      </Link>

      {/* Actions */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex gap-2 border-t border-border pt-3 sm:pt-4">
        <Button
          size="sm"
          className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm"
          onClick={handleRunNow}
        >
          <Play className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Run Now</span>
          <span className="sm:hidden">Run</span>
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
            <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-secondary border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                <Link 
                  href={`/podcasts/${podcast.id}/edit`}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-border transition-colors flex items-center gap-2 block"
                  onClick={() => setShowMenu(false)}
                >
                  <Edit className="w-4 h-4" />
                  Edit Settings
                </Link>
                
                <button 
                  onClick={handlePauseResume}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-border transition-colors flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  {podcast.status === 'active' ? 'Pause' : 'Resume'} Podcast
                </button>
                
                <button 
                  onClick={handleClone}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-border transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Clone Podcast
                </button>
                
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(false);
                    navigator.clipboard.writeText(`${window.location.origin}/rss/${podcast.id}.xml`);
                    toast.success('RSS URL Copied', 'The RSS URL has been copied to your clipboard');
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-border transition-colors flex items-center gap-2"
                >
                  <Rss className="w-4 h-4" />
                  Copy RSS URL
                </button>
                
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-border transition-colors flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                
                <div className="border-t border-border my-1" />
                
                <button 
                  onClick={handleArchive}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-500/10 text-yellow-500 transition-colors flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
                
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

function PodcastListItem({ podcast, onUpdate }: { 
  podcast: Podcast; 
  onUpdate: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const toast = useToastContext();
  const { confirm } = useConfirmDialog();

  const handleRunNow = async () => {
    confirm(
      'Start Pipeline Run',
      `Start a new pipeline run for "${podcast.title}"?`,
      async () => {
        try {
          const { api } = await import('@/lib/api');
          const response = await api.post(`/podcasts/${podcast.id}/runs`);

          if (response.ok) {
            const data = await response.json();
            toast.success('Pipeline Started', `Run ID: ${data.runId}. Redirecting...`);
            setTimeout(() => {
              window.location.href = `/podcasts/${podcast.id}/runs/${data.runId}`;
            }, 1000);
          } else {
            toast.error('Failed to Start Pipeline', 'Please try again');
          }
        } catch (error) {
          console.error('Error starting pipeline:', error);
          toast.error('Error Starting Pipeline', 'Please try again');
        }
      }
    );
  };

  const handlePauseResume = async () => {
    const action = podcast.status === 'active' ? 'pause' : 'resume';
    confirm(
      `${action === 'pause' ? 'Pause' : 'Resume'} Podcast`,
      `${action === 'pause' ? 'Pause' : 'Resume'} "${podcast.title}"?`,
      async () => {
        try {
          const { api } = await import('@/lib/api');
          const response = await api.patch(`/podcasts/${podcast.id}`, {
            status: action === 'pause' ? 'paused' : 'active'
          });

          if (response.ok) {
            toast.success('Success', `Podcast ${action}d successfully!`);
            onUpdate();
          } else {
            toast.error('Failed', `Failed to ${action} podcast`);
          }
        } catch (error) {
          toast.error('Error', `Error ${action}ing podcast`);
        }
      }
    );
  };

  const getCadenceColor = (cadence: string) => {
    if (!cadence) return 'outline';
    switch (cadence.toLowerCase()) {
      case 'daily': return 'success';
      case 'weekly': return 'default';
      case 'monthly': return 'warning';
      default: return 'outline';
    }
  };

  return (
    <Card className="hover:border-primary transition-all">
      <Link href={`/podcasts/${podcast.id}`} className="block">
        <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
          {/* Cover Art */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <div className="text-2xl sm:text-3xl">🎙️</div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg mb-1 truncate">{podcast.title}</h3>
            <p className="text-xs sm:text-sm text-muted truncate mb-2">{podcast.subtitle}</p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant={getCadenceColor(podcast.cadence)}>
                {podcast.cadence || 'Not Set'}
              </Badge>
              <Badge variant="success">
                {podcast.status}
              </Badge>
              {podcast.lastRun && (
                <span className="text-xs text-muted flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Last: {new Date(podcast.lastRun).toLocaleDateString()}
                </span>
              )}
              {podcast.nextRun && (
                <span className="text-xs text-muted flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Next: {new Date(podcast.nextRun).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1.5 sm:gap-2 items-center flex-shrink-0">
            <Button
              size="sm"
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
              onClick={(e) => {
                e.preventDefault();
                handleRunNow();
              }}
            >
              <Play className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Run</span>
            </Button>

            {podcast.status === 'active' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  handlePauseResume();
                }}
              >
                <Pause className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  handlePauseResume();
                }}
              >
                <Play className="w-4 h-4" />
              </Button>
            )}

            <Link href={`/podcasts/${podcast.id}/edit`}>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => e.stopPropagation()}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </Link>

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
                    <button 
                      onClick={() => {
                        setShowMenu(false);
                        navigator.clipboard.writeText(`${window.location.origin}/rss/${podcast.id}.xml`);
                        toast.success('RSS URL Copied', 'The RSS URL has been copied to your clipboard');
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-border transition-colors flex items-center gap-2"
                    >
                      <Rss className="w-4 h-4" />
                      Copy RSS
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
        </div>
      </Link>
    </Card>
  );
}
