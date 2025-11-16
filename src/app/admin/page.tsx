/**
 * Admin Console - Global runs monitoring with 13-stage pipeline visibility
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, CheckCircle, XCircle, Clock, TrendingUp, 
  ChevronDown, ChevronUp, Loader2, AlertCircle 
} from 'lucide-react';

interface RunStats {
  totalRuns: number;
  activeRuns: number;
  completedToday: number;
  avgDuration: number;
}

// All 13 stages per requirements
const PIPELINE_STAGES = [
  { id: 'prepare', name: 'Stage 1: Prepare', description: 'Freeze config, compute budgets (~150 wpm)' },
  { id: 'discover', name: 'Stage 2: Discover', description: 'RSS/news APIs, embeddings, zero-shot' },
  { id: 'disambiguate', name: 'Stage 3: Disambiguate', description: 'Entity linking ≥0.85 confidence' },
  { id: 'rank', name: 'Stage 4: Rank', description: 'Expected Info Gain/Cost (R,F,A,D,S,C)' },
  { id: 'scrape', name: 'Stage 5: Scrape', description: 'Per-domain concurrency, stop conditions' },
  { id: 'extract', name: 'Stage 6: Extract', description: '≤10-word quotes, dedupe, breadth' },
  { id: 'summarize', name: 'Stage 7: Summarize', description: 'Exactly 1 stat + 1 quote, mark [CHECK]' },
  { id: 'contrast', name: 'Stage 8: Contrast', description: 'Competitor analysis with bound evidence' },
  { id: 'outline', name: 'Stage 9: Outline', description: 'Knowledge graph → theme → 5 sections' },
  { id: 'script', name: 'Stage 10: Script', description: 'Length-scaled narrative with bridges' },
  { id: 'qa', name: 'Stage 11: QA & Bind', description: 'Resolve [CHECK], bind evidence, date sanity' },
  { id: 'tts', name: 'Stage 12: TTS', description: 'OpenAI voice, duration ±10% target' },
  { id: 'package', name: 'Stage 13: Package', description: 'show_notes.md, VTT+TXT, sources.json, RSS' },
] as const;

interface StageStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
  durationMs?: number;
  error?: string;
}

interface ActiveRun {
  id: string;
  podcastName: string;
  overallStatus: string;
  overallProgress: number;
  startedAt: string;
  stages: Record<string, StageStatus>;
}

export default function AdminPage() {
  const [stats, setStats] = useState<RunStats>({
    totalRuns: 0,
    activeRuns: 0,
    completedToday: 0,
    avgDuration: 0,
  });

  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>([]);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Stub data - in production, fetch from API
    setStats({
      totalRuns: 1247,
      activeRuns: 2,
      completedToday: 42,
      avgDuration: 8.5,
    });

    // Sample active runs with all 13 stages
    setActiveRuns([
      {
        id: 'run-001',
        podcastName: 'Tech Weekly',
        overallStatus: 'running',
        overallProgress: 38,
        startedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        stages: {
          prepare: { status: 'completed', progress: 100, durationMs: 1200 },
          discover: { status: 'completed', progress: 100, durationMs: 8500 },
          disambiguate: { status: 'completed', progress: 100, durationMs: 3200 },
          rank: { status: 'completed', progress: 100, durationMs: 2100 },
          scrape: { status: 'in_progress', progress: 45, startTime: new Date().toISOString() },
          extract: { status: 'pending', progress: 0 },
          summarize: { status: 'pending', progress: 0 },
          contrast: { status: 'pending', progress: 0 },
          outline: { status: 'pending', progress: 0 },
          script: { status: 'pending', progress: 0 },
          qa: { status: 'pending', progress: 0 },
          tts: { status: 'pending', progress: 0 },
          package: { status: 'pending', progress: 0 },
        },
      },
      {
        id: 'run-002',
        podcastName: 'Finance Insights',
        overallStatus: 'running',
        overallProgress: 85,
        startedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        stages: {
          prepare: { status: 'completed', progress: 100, durationMs: 1100 },
          discover: { status: 'completed', progress: 100, durationMs: 9200 },
          disambiguate: { status: 'completed', progress: 100, durationMs: 3500 },
          rank: { status: 'completed', progress: 100, durationMs: 2300 },
          scrape: { status: 'completed', progress: 100, durationMs: 45000 },
          extract: { status: 'completed', progress: 100, durationMs: 12000 },
          summarize: { status: 'completed', progress: 100, durationMs: 8500 },
          contrast: { status: 'completed', progress: 100, durationMs: 6200 },
          outline: { status: 'completed', progress: 100, durationMs: 7800 },
          script: { status: 'completed', progress: 100, durationMs: 15000 },
          qa: { status: 'completed', progress: 100, durationMs: 9500 },
          tts: { status: 'in_progress', progress: 75, startTime: new Date().toISOString() },
          package: { status: 'pending', progress: 0 },
        },
      },
    ]);

    // Auto-expand first run
    setExpandedRuns(new Set(['run-001']));
  }, []);

  const toggleExpanded = (runId: string) => {
    setExpandedRuns(prev => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  const getStageIcon = (status: StageStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStageColor = (status: StageStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'in_progress':
        return 'text-yellow-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Console</h1>
          <p className="text-gray-400">13-Stage Pipeline Monitoring</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Total Runs</span>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold">{stats.totalRuns}</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Active Now</span>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-yellow-500">{stats.activeRuns}</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Completed Today</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-500">{stats.completedToday}</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Avg Duration</span>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold">{stats.avgDuration}m</div>
          </div>
        </div>

        {/* Active Runs with All 13 Stages */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Active Runs - 13-Stage Pipeline</h2>
          
          <div className="space-y-4">
            {activeRuns.map((run) => {
              const isExpanded = expandedRuns.has(run.id);
              
              return (
                <div key={run.id} className="bg-zinc-800 rounded-lg p-4">
                  {/* Run Header */}
                  <div 
                    className="flex items-center justify-between mb-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleExpanded(run.id)}
                  >
                    <div className="flex items-center space-x-3">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      <div>
                        <h3 className="font-semibold text-lg">{run.podcastName}</h3>
                        <p className="text-sm text-gray-400">Run ID: {run.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Overall Progress</div>
                      <div className="font-semibold text-xl">{run.overallProgress}%</div>
                    </div>
                  </div>

                  {/* Overall Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-zinc-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${run.overallProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* All 13 Stages (Expanded View) */}
                  {isExpanded && (
                    <div className="mt-6 space-y-3 border-t border-zinc-700 pt-4">
                      <h4 className="font-semibold text-sm text-gray-400 mb-3">PIPELINE STAGES (1-13)</h4>
                      
                      {PIPELINE_STAGES.map((stage) => {
                        const stageStatus = run.stages[stage.id] || { status: 'pending', progress: 0 };
                        
                        return (
                          <div 
                            key={stage.id} 
                            className="bg-zinc-900 rounded-lg p-3 border border-zinc-700"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                {getStageIcon(stageStatus.status)}
                                <div>
                                  <div className="font-semibold">{stage.name}</div>
                                  <div className="text-xs text-gray-500">{stage.description}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-semibold capitalize ${getStageColor(stageStatus.status)}`}>
                                  {stageStatus.status.replace('_', ' ')}
                                </div>
                                {stageStatus.durationMs && (
                                  <div className="text-xs text-gray-500">
                                    {(stageStatus.durationMs / 1000).toFixed(1)}s
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Stage Progress Bar */}
                            {stageStatus.status !== 'pending' && (
                              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    stageStatus.status === 'completed' ? 'bg-green-500' :
                                    stageStatus.status === 'in_progress' ? 'bg-yellow-500' :
                                    stageStatus.status === 'failed' ? 'bg-red-500' :
                                    'bg-gray-500'
                                  }`}
                                  style={{ width: `${stageStatus.progress}%` }}
                                />
                              </div>
                            )}
                            
                            {stageStatus.error && (
                              <div className="mt-2 flex items-start space-x-2 text-xs text-red-400">
                                <AlertCircle className="w-4 h-4 mt-0.5" />
                                <span>{stageStatus.error}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-3">
                    Started {new Date(run.startedAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>

          {activeRuns.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No active runs at the moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
