/**
 * Episode Detail Page - Audio player, transcript, show notes
 */

'use client';

import { useParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Share2, ExternalLink } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

export default function EpisodeDetailPage() {
  const params = useParams();
  const episodeId = params.episodeId as string;
  const podcastId = params.id as string;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [episode, setEpisode] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        setLoading(true);
        const { api } = await import('@/lib/api');
        
        // Fetch run data (episode is a completed run)
        const response = await api.get(`/podcasts/${podcastId}/runs/${episodeId}`);
        
        if (response.ok) {
          const runData = await response.json();
          const run = runData.run || runData;
          
          // Construct audio URL
          let audioUrl = null;
          if (run.output?.audioPath) {
            const path = run.output.audioPath.replace(/^\/output\//, '');
            audioUrl = `/api/serve-file/${path}`;
          } else if (run.output?.audioS3Key) {
            const path = run.output.audioS3Key.replace(/^\/output\//, '');
            audioUrl = `/api/serve-file/${path}`;
          }
          
          // Load transcript and show notes from files if available
          let transcript = run.output?.transcript || run.output?.script || '';
          let showNotes = run.output?.showNotes || '';
          let sources: any[] = [];
          
          // Try to load sources from JSON file
          if (run.output?.sourcesJsonPath) {
            try {
              const sourcesResponse = await fetch(`/api/serve-file/${run.output.sourcesJsonPath.replace(/^\/output\//, '')}`);
              if (sourcesResponse.ok) {
                sources = await sourcesResponse.json();
              }
            } catch (e) {
              console.error('Error loading sources:', e);
            }
          }
          
          setEpisode({
            id: episodeId,
            title: run.output?.episodeTitle || `Episode ${episodeId.substring(0, 8)}`,
            description: run.output?.description || run.output?.script?.substring(0, 200) || '',
            pubDate: run.completedAt || run.startedAt || run.createdAt,
            duration: run.duration || 0,
            audioUrl,
            transcript: transcript || 'Transcript not available',
            showNotes: showNotes || 'Show notes not available',
            sources: sources.length > 0 ? sources.map((s: any) => ({
              title: s.title || s.url,
              url: s.url,
              publisher: s.publisher || s.domain || 'Unknown',
              date: s.publishedAt || s.date || '',
            })) : [],
          });
        }
      } catch (error) {
        console.error('Error fetching episode:', error);
      } finally {
        setLoading(false);
      }
    };

    if (episodeId && podcastId) {
      fetchEpisode();
    }
  }, [episodeId, podcastId]);

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted">Loading episode...</p>
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Episode Not Found</h1>
          <p className="text-muted">The episode you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="text-sm text-muted mb-2">
            {new Date(episode.pubDate).toLocaleDateString()}
          </div>
          <h1 className="text-4xl font-bold mb-4">{episode.title}</h1>
          <p className="text-lg text-muted">{episode.description}</p>
        </div>

        {/* Audio Player */}
        <div className="bg-secondary border border-border rounded-lg p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={togglePlay}
              className="w-16 h-16 bg-primary hover:bg-accent text-background rounded-full flex items-center justify-center transition-all"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>

            <div className="flex-1">
              <div className="flex justify-between text-sm text-muted mb-2">
                <span>
                  {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}
                </span>
                <span>
                  {Math.floor(episode.duration / 60)}:{(episode.duration % 60)
                    .toString()
                    .padStart(2, '0')}
                </span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(currentTime / episode.duration) * 100}%` }}
                />
              </div>
            </div>

            <button className="p-3 hover:bg-border rounded-full transition-all">
              <Download className="w-5 h-5" />
            </button>
            <button className="p-3 hover:bg-border rounded-full transition-all">
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          <audio ref={audioRef} src={episode.audioUrl} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transcript">
          <TabsList className="mb-8">
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="shownotes">Show Notes</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="transcript">
            <Card className="p-8">
              <h2 className="text-2xl font-semibold mb-6">Transcript</h2>
              <div className="prose prose-invert max-w-none">
                {episode.transcript.split('\n\n').map((paragraph: string, idx: number) => (
                  <p key={idx} className="mb-4 text-muted leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="shownotes">
            <Card className="p-8">
              <h2 className="text-2xl font-semibold mb-6">Show Notes</h2>
              <div className="prose prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: episode.showNotes.replace(/\n/g, '<br/>') }} />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Sources</h2>
              <div className="space-y-3">
                {episode.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-background border border-border rounded-lg hover:border-primary transition-all group"
                  >
                    <div>
                      <div className="font-medium group-hover:text-primary transition-colors">
                        {source.title}
                      </div>
                      <div className="text-sm text-muted">
                        {source.publisher} • {source.date}
                      </div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

