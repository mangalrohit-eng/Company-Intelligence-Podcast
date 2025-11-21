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
          // Use the correct audio path - audio is stored as audio.mp3 in S3
          // Prefer audioPath from run.output (presigned URL) or fallback to serve-file endpoint
          const audioPath = run.output?.audioPath || run.output?.audioS3Key 
            ? `/api/serve-file/runs/${run.id}/audio.mp3`
            : `/api/serve-file/runs/${run.id}/audio.mp3`;
          const transcriptPath = `/api/serve-file/runs/${run.id}/${run.id}_transcript.txt`;
          const showNotesPath = `/api/serve-file/runs/${run.id}/${run.id}_show_notes.md`;
          
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
    if (!audio || !episode?.audioUrl) return;

    // Reset duration when episode changes
    setDuration(0);
    setCurrentTime(0);

    const updateTime = () => setCurrentTime(audio.currentTime);
    
    const handleLoadedMetadata = () => {
      const duration = audio.duration;
      console.log('Episode audio metadata loaded', { duration, src: audio.src, readyState: audio.readyState });
      if (duration && isFinite(duration) && duration > 0) {
        setDuration(duration);
      } else {
        console.warn('Episode audio duration is invalid', { duration, readyState: audio.readyState });
      }
    };

    const handleCanPlay = () => {
      const duration = audio.duration;
      console.log('Episode audio can play', { duration, readyState: audio.readyState });
      if (duration && isFinite(duration) && duration > 0) {
        setDuration(duration);
      }
    };

    const handleLoadedData = () => {
      const duration = audio.duration;
      console.log('Episode audio data loaded', { duration });
      if (duration && isFinite(duration) && duration > 0) {
        setDuration(duration);
      }
    };

    const handleError = (e: any) => {
      console.error('Episode audio loading error', {
        error: e,
        errorCode: audio.error?.code,
        errorMessage: audio.error?.message,
        src: audio.src,
        networkState: audio.networkState,
      });
    };

    const handleEnded = () => setIsPlaying(false);

    // Set up event listeners
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    // Force load metadata
    audio.load();

    // Fallback: check duration after a delay
    const checkDuration = setTimeout(() => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else if (audio.readyState >= 2) {
        console.warn('Episode audio metadata loaded but duration is 0', {
          duration: audio.duration,
          readyState: audio.readyState,
          src: audio.src,
        });
      }
    }, 2000);

    return () => {
      clearTimeout(checkDuration);
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
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
    <div className="min-h-screen p-3 sm:p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push(`/podcasts/${podcastId}`)}
            className="mb-3 sm:mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Podcast
          </Button>
          <div className="text-xs sm:text-sm text-muted mb-2">
            {new Date(episode.pubDate).toLocaleDateString()}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 break-words">{episode.title}</h1>
          {episode.description && (
            <p className="text-sm sm:text-base md:text-lg text-muted break-words">{episode.description}</p>
          )}
        </div>

        {/* Audio Player */}
        <div className="bg-secondary border border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <button
              onClick={togglePlay}
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-primary hover:bg-accent text-background rounded-full flex items-center justify-center transition-all flex-shrink-0"
            >
              {isPlaying ? <Pause className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" /> : <Play className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ml-0.5 sm:ml-1" />}
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
            crossOrigin="anonymous"
            preload="metadata"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              const duration = e.currentTarget.duration;
              console.log('Audio metadata loaded', { duration, src: e.currentTarget.src });
              if (duration && isFinite(duration) && duration > 0) {
                setDuration(duration);
              }
            }}
            onCanPlay={(e) => {
              const duration = e.currentTarget.duration;
              console.log('Audio can play', { duration });
              if (duration && isFinite(duration) && duration > 0) {
                setDuration(duration);
              }
            }}
            onLoadedData={(e) => {
              const duration = e.currentTarget.duration;
              console.log('Audio data loaded', { duration });
              if (duration && isFinite(duration) && duration > 0) {
                setDuration(duration);
              }
            }}
            onError={(e) => {
              console.error('Audio loading error', {
                error: e,
                errorCode: audioRef.current?.error?.code,
                errorMessage: audioRef.current?.error?.message,
                src: episode.audioUrl,
              });
            }}
            onEnded={() => setIsPlaying(false)}
          />
        </div>

        {/* Tabs */}
              <Tabs defaultValue="transcript">
                <TabsList className="mb-4 sm:mb-6 md:mb-8">
                  <TabsTrigger value="transcript">Transcript</TabsTrigger>
                  <TabsTrigger value="shownotes">Show Notes</TabsTrigger>
                  <TabsTrigger value="sources">Sources</TabsTrigger>
                </TabsList>

          <TabsContent value="transcript">
            <Card className="p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Transcript</h2>
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
            <Card className="p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Show Notes</h2>
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
            <Card className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Sources</h2>
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

