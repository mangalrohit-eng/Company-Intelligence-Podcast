/**
 * React hook for polling run status
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface RunStatus {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  progress: number;
  events: any[];
  error?: string;
}

export function useRunStatus(runId: string | null, pollInterval = 2000) {
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRunStatus = useCallback(async () => {
    if (!runId) return;

    try {
      const [run, eventsData] = await Promise.all([
        apiClient.getRun(runId),
        apiClient.getRunEvents(runId, 50),
      ]) as [any, any];

      const latestEvent = eventsData.events[0];
      const progress = latestEvent?.pct || 0;

      setRunStatus({
        id: run.id,
        status: run.status,
        progress,
        events: eventsData.events,
        error: run.errorMessage,
      });

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch run status');
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    if (!runId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchRunStatus();

    // Poll for updates if run is active
    const interval = setInterval(() => {
      if (runStatus?.status === 'running' || runStatus?.status === 'pending') {
        fetchRunStatus();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [runId, runStatus?.status, pollInterval, fetchRunStatus]);

  return { runStatus, loading, error, refetch: fetchRunStatus };
}

