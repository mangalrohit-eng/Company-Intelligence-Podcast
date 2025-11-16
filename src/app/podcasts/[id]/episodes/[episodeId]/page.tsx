/**
 * Episode Detail Page - Audio player, transcript, show notes
 */

'use client';

import { useParams } from 'next/navigation';
import { useState, useRef } from 'react';
import { Play, Pause, Download, Share2, ExternalLink } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

export default function EpisodeDetailPage() {
  const params = useParams();
  const episodeId = params.episodeId as string;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // TODO: Fetch episode data
  const episode = {
    id: episodeId,
    title: 'Episode 42: AI Chip Breakthrough',
    description:
      'In this episode, we dive into the latest breakthrough in AI chip technology...',
    pubDate: '2025-01-15T10:00:00Z',
    duration: 272,
    audioUrl: 'https://example.com/audio.mp3',
    transcript: `Welcome to Tech Industry Insights.

Today, we're discussing a major breakthrough in AI chip technology. The company unveiled their latest AI chip which delivers a remarkable 30% improvement in processing speed over the previous generation.

Industry analysts are calling it "transformative for the industry," with potential to redefine competitive benchmarks in the semiconductor space.`,
    showNotes: `## Key Takeaways

- 30% performance improvement in new AI chip
- Transformative impact on the industry
- Sets new competitive benchmarks

## Sources

1. [Tech News - AI Chip Announcement](https://example.com/news/1)
2. [Industry Analysis Report](https://example.com/report)`,
    sources: [
      {
        title: 'AI Chip Announcement',
        url: 'https://example.com/news/1',
        publisher: 'Tech News',
        date: '2025-01-15',
      },
    ],
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
                {episode.transcript.split('\n\n').map((paragraph, idx) => (
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

