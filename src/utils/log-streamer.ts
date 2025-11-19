/**
 * Log Streamer - Streams logs to S3 for real-time monitoring
 */

import { writeToS3, readFromS3, getDebugFileKey } from '@/lib/s3-storage';
import { logger } from './logger';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
}

class LogStreamer {
  private runId: string;
  private logs: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 2000; // Flush every 2 seconds
  private readonly MAX_LOGS_IN_MEMORY = 1000; // Keep last 1000 logs in memory

  constructor(runId: string) {
    this.runId = runId;
    this.startFlushInterval();
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush().catch(error => {
        logger.error('Failed to flush logs to S3', { runId: this.runId, error });
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  addLog(level: string, message: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
    };

    this.logs.push(entry);

    // Keep only last N logs in memory
    if (this.logs.length > this.MAX_LOGS_IN_MEMORY) {
      this.logs = this.logs.slice(-this.MAX_LOGS_IN_MEMORY);
    }
  }

  async flush(): Promise<void> {
    if (this.logs.length === 0) {
      return;
    }

    try {
      const logContent = this.logs
        .map(log => {
          let line = `${log.timestamp} [${log.level.toUpperCase()}] ${log.message}`;
          if (log.metadata && Object.keys(log.metadata).length > 0) {
            line += ` | ${JSON.stringify(log.metadata)}`;
          }
          return line;
        })
        .join('\n');

      const s3Key = getDebugFileKey(this.runId, 'pipeline.log');
      await writeToS3(s3Key, logContent, 'text/plain');
      
      // Clear flushed logs (keep last 100 for continuity)
      if (this.logs.length > 100) {
        this.logs = this.logs.slice(-100);
      }
    } catch (error) {
      // Don't throw - logging failures shouldn't break the pipeline
      logger.error('Failed to write logs to S3', { runId: this.runId, error });
    }
  }

  async finalFlush(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }
}

// Global log streamers per run
const logStreamers = new Map<string, LogStreamer>();

export function getLogStreamer(runId: string): LogStreamer {
  if (!logStreamers.has(runId)) {
    logStreamers.set(runId, new LogStreamer(runId));
  }
  return logStreamers.get(runId)!;
}

export function removeLogStreamer(runId: string) {
  const streamer = logStreamers.get(runId);
  if (streamer) {
    streamer.finalFlush().catch(error => {
      logger.error('Failed to final flush logs', { runId, error });
    });
    logStreamers.delete(runId);
  }
}

// Create a Winston transport that streams to S3
export function createS3LogTransport(runId: string) {
  const streamer = getLogStreamer(runId);
  
  return {
    log: (info: any) => {
      streamer.addLog(info.level, info.message, {
        ...info,
        level: undefined,
        message: undefined,
        timestamp: undefined,
      });
    },
  };
}

