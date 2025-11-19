/**
 * Episode Detail Page - Audio player, transcript, show notes
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Share2, ExternalLink, ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function EpisodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const podcastId = params.id as string;
  const episodeId = params.episodeId as string;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [episode, setEpisode] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchEpisode();
  }, [podcastId, episodeId]);

  const fetchEpisode = async () => {
    try {
      setLoading(true);
      // First, try to get episode from runs
      const { api } = await import('@/lib/api');
      const runsResponse = await api.get(`/podcasts/${podcastId}/runs`);
      
      if (runsResponse.ok) {
        const runsData = await runsResponse.json();
        const runs = runsData.runs || [];
        
        // Find the run that created this episode
        const run = runs.find((r: any) => 
          r.output?.episodeId === episodeId || r.id === episodeId
        );
        
        if (run && run.status === 'completed' && run.output) {
          // Construct episode from run data
          const audioPath = `/api/serve-file/episodes/${run.id}/${run.id}.mp3`;
          const transcriptPath = `/api/serve-file/episodes/${run.id}/${run.id}_transcript.txt`;
          const showNotesPath = `/api/serve-file/episodes/${run.id}/${run.id}_show_notes.md`;
          
          // Fetch transcript and show notes
          let transcript = '';
          let showNotes = '';
          
          try {
            const transcriptResponse = await fetch(transcriptPath);
            if (transcriptResponse.ok) {
              transcript = await transcriptResponse.text();
            }
          } catch (e) {
            console.error('Error fetching transcript:', e);
          }
          
          try {
            const showNotesResponse = await fetch(showNotesPath);
            if (showNotesResponse.ok) {
              showNotes = await showNotesResponse.text();
            }
          } catch (e) {
            console.error('Error fetching show notes:', e);
          }
          
          setEpisode({
            id: episodeId,
            title: run.output.episodeTitle || `Episode from ${new Date(run.startedAt).toLocaleDateString()}`,
            description: run.output.episodeDescription || '',
            pubDate: run.completedAt || run.startedAt,
            duration: run.output.durationSeconds || 0,
            audioUrl: audioPath,
            transcript,
            showNotes,
            runId: run.id,
          });
          
          setDuration(run.output.durationSeconds || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching episode:', error);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [episode]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted">Loading episode...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!episode) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen p-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Episode Not Found</h1>
            <p className="text-muted mb-4">The episode you're looking for doesn't exist.</p>
            <Button onClick={() => router.push(`/podcasts/${podcastId}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Podcast
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push(`/podcasts/${podcastId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Podcast
          </Button>
          <div className="text-sm text-muted mb-2">
            {new Date(episode.pubDate).toLocaleDateString()}
          </div>
          <h1 className="text-4xl font-bold mb-4">{episode.title}</h1>
          {episode.description && (
            <p className="text-lg text-muted">{episode.description}</p>
          )}
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
                  {Math.floor(duration / 60)}:{(duration % 60)
                    .toString()
                    .padStart(2, '0')}
                </span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
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

          <audio 
            ref={audioRef} 
            src={episode.audioUrl} 
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onEnded={() => setIsPlaying(false)}
          />
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
              {episode.transcript ? (
                <div className="prose prose-invert max-w-none">
                  {episode.transcript.split('\n\n').map((paragraph: string, idx: number) => (
                    <p key={idx} className="mb-4 text-muted leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-muted">Transcript not available</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="shownotes">
            <Card className="p-8">
              <h2 className="text-2xl font-semibold mb-6">Show Notes</h2>
              {episode.showNotes ? (
                <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                  {episode.showNotes}
                </div>
              ) : (
                <p className="text-muted">Show notes not available</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Sources</h2>
              {episode.runId && (
                <div className="text-sm text-muted mb-4">
                  Sources are available in the run details. 
                  <Button
                    variant="link"
                    onClick={() => router.push(`/podcasts/${podcastId}/runs/${episode.runId}`)}
                    className="p-0 h-auto"
                  >
                    View Run Details
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </ProtectedRoute>
  );
}

