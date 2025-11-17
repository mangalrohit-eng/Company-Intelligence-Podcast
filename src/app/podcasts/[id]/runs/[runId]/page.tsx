'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function RunProgressPage() {
  const params = useParams();
  const router = useRouter();
  const podcastId = params.id as string;
  const runId = params.runId as string;

  const [runStatus, setRunStatus] = useState<'running' | 'completed' | 'failed'>('running');

  useEffect(() => {
    // Simulate run progress
    const timer = setTimeout(() => {
      setRunStatus('completed');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push(`/podcasts/${podcastId}`)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Podcast
          </Button>

          <h1 className="text-3xl font-bold mb-8">Pipeline Run Progress</h1>

          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Run ID: {runId}</h2>
                <p className="text-muted text-sm">Podcast ID: {podcastId}</p>
              </div>
              <div className="flex items-center gap-2">
                {runStatus === 'running' && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span className="text-blue-500 font-medium">Running</span>
                  </>
                )}
                {runStatus === 'completed' && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-green-500 font-medium">Completed</span>
                  </>
                )}
                {runStatus === 'failed' && (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-medium">Failed</span>
                  </>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Pipeline Stages</h3>
            <div className="space-y-4">
              {stages.map((stage, index) => (
                <div key={stage.name} className="flex items-center gap-4">
                  {runStatus === 'completed' || index < stages.length - 1 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : runStatus === 'running' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{stage.name}</div>
                    <div className="text-sm text-muted">{stage.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {runStatus === 'completed' && (
            <div className="mt-6 flex gap-4">
              <Button onClick={() => router.push(`/podcasts/${podcastId}`)}>
                View Podcast
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/podcasts')}
              >
                Back to All Podcasts
              </Button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

const stages = [
  { name: 'Extract', description: 'Gathering content from sources' },
  { name: 'Prepare', description: 'Processing and structuring content' },
  { name: 'Outline', description: 'Creating episode outline' },
  { name: 'Script', description: 'Generating podcast script' },
  { name: 'Speak', description: 'Converting script to audio' },
  { name: 'Publish', description: 'Publishing episode' },
];
