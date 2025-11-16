/**
 * Live Run View - Real-time progress tracking
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

interface RunEvent {
  id: string;
  ts: string;
  stage: string;
  substage?: string;
  pct: number;
  level: string;
  message: string;
}

export default function RunDetailPage() {
  const params = useParams();
  const runId = params.runId as string;
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch run events from API
    // Poll for updates every 2 seconds
    const interval = setInterval(() => {
      // Stub: Add mock events
      setEvents((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          ts: new Date().toISOString(),
          stage: 'discover',
          pct: Math.min(100, prev.length * 10),
          level: 'info',
          message: `Processing step ${prev.length + 1}`,
        },
      ]);
    }, 2000);

    setLoading(false);

    return () => clearInterval(interval);
  }, [runId]);

  const stages = [
    { key: 'prepare', label: 'Prepare', pct: 100 },
    { key: 'discover', label: 'Discover', pct: 75 },
    { key: 'scrape', label: 'Scrape', pct: 50 },
    { key: 'extract', label: 'Extract', pct: 25 },
    { key: 'summarize', label: 'Summarize', pct: 0 },
    { key: 'script', label: 'Script', pct: 0 },
    { key: 'tts', label: 'TTS', pct: 0 },
    { key: 'package', label: 'Package', pct: 0 },
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Run #{runId.substring(0, 8)}</h1>
          <div className="flex items-center gap-4 text-muted">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Started {new Date().toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              Running...
            </div>
          </div>
        </div>

        {/* Segmented Progress Bar */}
        <div className="bg-secondary border border-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Pipeline Progress</h2>
          <div className="space-y-4">
            {stages.map((stage) => (
              <div key={stage.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{stage.label}</span>
                  <span className="text-sm text-muted">{stage.pct}%</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${stage.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Timeline */}
        <div className="bg-secondary border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Live Events</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 bg-background rounded border border-border"
              >
                {event.level === 'info' && <CheckCircle className="w-5 h-5 text-primary mt-0.5" />}
                {event.level === 'error' && <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                <div className="flex-1">
                  <div className="text-sm font-medium">{event.message}</div>
                  <div className="text-xs text-muted">
                    {new Date(event.ts).toLocaleTimeString()} • {event.stage}
                    {event.substage && ` / ${event.substage}`}
                  </div>
                </div>
                <div className="text-sm text-muted">{event.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

