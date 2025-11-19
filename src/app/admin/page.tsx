/**
 * Admin Console - Global runs monitoring with 13-stage pipeline visibility
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, CheckCircle, XCircle, Clock, TrendingUp, 
  ChevronDown, ChevronUp, Loader2, AlertCircle 
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
  const [activeView, setActiveView] = useState<'dashboard' | 'telemetry' | 'orgs'>('dashboard');
  const [stats, setStats] = useState<RunStats>({
    totalRuns: 0,
    activeRuns: 0,
    completedToday: 0,
    avgDuration: 0,
  });

  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>([]);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch real data from DynamoDB
    const fetchRuns = async () => {
      try {
        const { api } = await import('@/lib/api');
        const response = await api.get('/runs?status=running');
        
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats || {
            totalRuns: 0,
            activeRuns: 0,
            completedToday: 0,
            avgDuration: 0,
          });
          setActiveRuns(data.runs || []);
          
          // Auto-expand first run if any
          if (data.runs && data.runs.length > 0) {
            setExpandedRuns(new Set([data.runs[0].id]));
          }
        } else {
          console.error('Failed to fetch runs:', response.statusText);
          // Show empty state instead of fake data
          setStats({ totalRuns: 0, activeRuns: 0, completedToday: 0, avgDuration: 0 });
          setActiveRuns([]);
        }
      } catch (error) {
        console.error('Error fetching runs:', error);
        // Show empty state instead of fake data
        setStats({ totalRuns: 0, activeRuns: 0, completedToday: 0, avgDuration: 0 });
        setActiveRuns([]);
      }
    };

    fetchRuns();
    
    // Poll for updates every 5 seconds (reduced frequency for better performance)
    const interval = setInterval(fetchRuns, 5000);
    
    return () => clearInterval(interval);
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
    <ProtectedRoute>
      <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Console</h1>
          <p className="text-gray-400">System-wide monitoring and management</p>
        </div>

        {/* View Switcher */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeView === 'dashboard'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Pipeline Dashboard
          </button>
          <button
            onClick={() => setActiveView('telemetry')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeView === 'telemetry'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Domain Telemetry
          </button>
          <button
            onClick={() => setActiveView('orgs')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeView === 'orgs'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Orgs & Users
          </button>
        </div>

        {activeView === 'dashboard' && (
          <>
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
          </>
        )}

        {activeView === 'telemetry' && <DomainTelemetryView />}
        {activeView === 'orgs' && <OrgsUsersView />}
      </div>
    </div>
    </ProtectedRoute>
  );
}

function DomainTelemetryView() {
  const domainStats = [
    { domain: 'techcrunch.com', requests: 1245, blocked: 0, avgResponseTime: '245ms', status: 'healthy' },
    { domain: 'reuters.com', requests: 987, blocked: 0, avgResponseTime: '189ms', status: 'healthy' },
    { domain: 'bloomberg.com', requests: 654, blocked: 23, avgResponseTime: '412ms', status: 'throttled' },
    { domain: 'wsj.com', requests: 543, blocked: 543, avgResponseTime: 'N/A', status: 'blocked' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Domain Scrape Telemetry</h2>
        <p className="text-gray-400 mb-6">Monitor source domain health and compliance</p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left py-3 px-4 text-gray-400">Domain</th>
                <th className="text-left py-3 px-4 text-gray-400">Requests (24h)</th>
                <th className="text-left py-3 px-4 text-gray-400">Blocked</th>
                <th className="text-left py-3 px-4 text-gray-400">Avg Response</th>
                <th className="text-left py-3 px-4 text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {domainStats.map((stat) => (
                <tr key={stat.domain} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="py-3 px-4 font-medium">{stat.domain}</td>
                  <td className="py-3 px-4">{stat.requests.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    {stat.blocked > 0 ? (
                      <span className="text-red-500">{stat.blocked}</span>
                    ) : (
                      <span className="text-green-500">{stat.blocked}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">{stat.avgResponseTime}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        stat.status === 'healthy'
                          ? 'bg-green-900/50 text-green-400'
                          : stat.status === 'throttled'
                          ? 'bg-yellow-900/50 text-yellow-400'
                          : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      {stat.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-4xl font-bold text-green-500 mb-2">3,429</div>
          <div className="text-sm text-gray-400">Total Domains Scraped</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-4xl font-bold text-green-500 mb-2">97.2%</div>
          <div className="text-sm text-gray-400">Success Rate</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-4xl font-bold text-yellow-500 mb-2">23</div>
          <div className="text-sm text-gray-400">Throttled Domains</div>
        </div>
      </div>
    </div>
  );
}

function OrgsUsersView() {
  const organizations = [
    { id: 1, name: 'Acme Corp', users: 45, podcasts: 12, status: 'active', plan: 'Enterprise' },
    { id: 2, name: 'TechStartup Inc', users: 8, podcasts: 3, status: 'active', plan: 'Pro' },
    { id: 3, name: 'Media Co', users: 23, podcasts: 7, status: 'trial', plan: 'Trial' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Organizations</h2>
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all">
            + Add Organization
          </button>
        </div>

        <div className="space-y-4">
          {organizations.map((org) => (
            <div key={org.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-green-500/50 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-900/50 rounded-lg flex items-center justify-center">
                    <span className="text-xl font-bold text-green-400">
                      {org.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{org.name}</div>
                    <div className="text-sm text-gray-400">
                      {org.users} users • {org.podcasts} podcasts
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      org.status === 'active'
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-yellow-900/50 text-yellow-400'
                    }`}
                  >
                    {org.status}
                  </span>
                  <span className="px-3 py-1 bg-blue-900/50 text-blue-400 rounded-full text-xs font-medium">
                    {org.plan}
                  </span>
                  <button className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm transition-all">
                    Manage
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-4xl font-bold text-green-500 mb-2">127</div>
          <div className="text-sm text-gray-400">Total Organizations</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-4xl font-bold text-green-500 mb-2">1,432</div>
          <div className="text-sm text-gray-400">Total Users</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-4xl font-bold text-blue-500 mb-2">$127k</div>
          <div className="text-sm text-gray-400">Monthly Revenue (MRR)</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-4xl font-bold text-yellow-500 mb-2">23</div>
          <div className="text-sm text-gray-400">Trial Accounts</div>
        </div>
      </div>
    </div>
  );
}
