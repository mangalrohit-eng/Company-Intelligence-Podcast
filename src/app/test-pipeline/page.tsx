/**
 * Test Pipeline Page - Interactive UI to run individual stages
 */

'use client';

import { useState } from 'react';
import { 
  Play, Loader2, CheckCircle, XCircle, Terminal, 
  FileText, Settings, Copy, ChevronRight 
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// All 13 stages
const PIPELINE_STAGES = [
  { 
    id: 'prepare', 
    name: 'Stage 1: Prepare',
    description: 'Freeze config, compute budgets (~150 wpm)',
    defaultInput: 'fixtures/prepare/in.json',
    hasFixtures: false,
  },
  { 
    id: 'discover', 
    name: 'Stage 2: Discover',
    description: 'RSS/news APIs, embeddings, zero-shot',
    defaultInput: 'fixtures/discover/in.json',
    hasFixtures: false,
  },
  { 
    id: 'disambiguate', 
    name: 'Stage 3: Disambiguate',
    description: 'Entity linking ≥0.85 confidence',
    defaultInput: 'fixtures/disambiguate/in.json',
    hasFixtures: false,
  },
  { 
    id: 'rank', 
    name: 'Stage 4: Rank',
    description: 'Expected Info Gain/Cost (R,F,A,D,S,C)',
    defaultInput: 'fixtures/rank/in.json',
    hasFixtures: false,
  },
  { 
    id: 'scrape', 
    name: 'Stage 5: Scrape',
    description: 'Per-domain concurrency, stop conditions',
    defaultInput: 'fixtures/scrape/in.json',
    hasFixtures: false,
  },
  { 
    id: 'extract', 
    name: 'Stage 6: Extract',
    description: '≤10-word quotes, dedupe, breadth',
    defaultInput: 'fixtures/extract/in.json',
    hasFixtures: false,
  },
  { 
    id: 'summarize', 
    name: 'Stage 7: Summarize',
    description: 'Exactly 1 stat + 1 quote, mark [CHECK]',
    defaultInput: 'fixtures/summarize/in.json',
    hasFixtures: true,
  },
  { 
    id: 'contrast', 
    name: 'Stage 8: Contrast',
    description: 'Competitor analysis with bound evidence',
    defaultInput: 'fixtures/contrast/in.json',
    hasFixtures: false,
  },
  { 
    id: 'outline', 
    name: 'Stage 9: Outline',
    description: 'Knowledge graph → theme → 5 sections',
    defaultInput: 'fixtures/outline/in.json',
    hasFixtures: false,
  },
  { 
    id: 'script', 
    name: 'Stage 10: Script',
    description: 'Length-scaled narrative with bridges',
    defaultInput: 'fixtures/script/in.json',
    hasFixtures: false,
  },
  { 
    id: 'qa', 
    name: 'Stage 11: QA & Bind',
    description: 'Resolve [CHECK], bind evidence, date sanity',
    defaultInput: 'fixtures/qa/in.json',
    hasFixtures: false,
  },
  { 
    id: 'tts', 
    name: 'Stage 12: TTS',
    description: 'OpenAI voice, duration ±10% target',
    defaultInput: 'fixtures/tts/in.json',
    hasFixtures: false,
  },
  { 
    id: 'package', 
    name: 'Stage 13: Package',
    description: 'show_notes.md, VTT+TXT, sources.json, RSS',
    defaultInput: 'fixtures/package/in.json',
    hasFixtures: false,
  },
] as const;

type ProviderMode = 'replay' | 'openai' | 'stub';
type RunMode = 'free' | 'real';

interface RunResult {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
  outputFile?: string;
}

export default function TestPipelinePage() {
  const [selectedStage, setSelectedStage] = useState<string>('summarize');
  const [runMode, setRunMode] = useState<RunMode>('free');
  const [llmProvider, setLlmProvider] = useState<ProviderMode>('replay');
  const [ttsProvider, setTtsProvider] = useState<ProviderMode>('stub');
  const [httpProvider, setHttpProvider] = useState<ProviderMode>('replay');
  const [inputFile, setInputFile] = useState<string>('fixtures/summarize/in.json');
  const [outputFile, setOutputFile] = useState<string>('output.json');
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);

  const selectedStageInfo = PIPELINE_STAGES.find(s => s.id === selectedStage);

  const handleStageChange = (stageId: string) => {
    setSelectedStage(stageId);
    const stage = PIPELINE_STAGES.find(s => s.id === stageId);
    if (stage) {
      setInputFile(stage.defaultInput);
      setOutputFile(`output/${stageId}-out.json`);
    }
    setRunResult(null);
  };

  const handleModeChange = (mode: RunMode) => {
    setRunMode(mode);
    if (mode === 'free') {
      // Free mode: replay/stub (no cost)
      setLlmProvider('replay');
      setTtsProvider('stub');
      setHttpProvider('replay');
    } else {
      // Real AI mode: OpenAI (costs money)
      setLlmProvider('openai');
      setTtsProvider('openai');
      setHttpProvider('replay'); // Keep HTTP as replay to save on scraping
    }
  };

  // Generate command as derived value (not state) to avoid infinite loop
  const commandToRun = `npm run run-stage -- --stage ${selectedStage} --in ${inputFile} --out ${outputFile} --llm ${llmProvider} --tts ${ttsProvider} --http ${httpProvider}`;

  const handleFileOpen = (filePath: string) => {
    // Build absolute path
    const workspacePath = 'C:/Users/rohit.m.mangal/OneDrive - Accenture/Work/Cursor/Company Intelligence Podcast';
    const absolutePath = `${workspacePath}/${filePath}`.replace(/\\/g, '/');
    
    // Copy absolute path to clipboard
    navigator.clipboard.writeText(absolutePath);
    
    // Try multiple methods to open the file
    try {
      // Method 1: Try vscode-insiders:// if using Insiders
      // Method 2: Try cursor:// if using Cursor
      // Method 3: Try vscode:// for standard VS Code
      const protocols = ['cursor://file/', 'vscode://file/', 'vscode-insiders://file/'];
      
      // Encode each path segment properly
      const encodedPath = absolutePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
      
      // Try the first protocol (Cursor since you're using it)
      window.open(`${protocols[0]}${encodedPath}`, '_blank');
      
      // Show success message
      alert(`📋 File path copied to clipboard!\n\n✨ Trying to open:\n${absolutePath}\n\n💡 If the file doesn't open automatically:\n1. The path is copied to your clipboard\n2. Press Ctrl+P in your editor\n3. Paste the path and press Enter`);
    } catch (err) {
      alert(`📋 Path copied to clipboard:\n${absolutePath}\n\n💡 Use Ctrl+P in your editor and paste to open.`);
    }
  };

  const handleRunStage = async () => {
    setIsRunning(true);
    setRunResult(null);
    
    const startTime = Date.now();

    try {
      // Call real API endpoint to execute the pipeline stage
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/pipeline/execute-stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: selectedStage,
          llmProvider,
          ttsProvider,
          httpProvider,
          inputFile,
          outputFile,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRunResult({
          success: true,
          output: data.output || `✅ Stage "${selectedStage}" completed successfully!`,
          duration: Date.now() - startTime,
          outputFile: outputFile,
        });
      } else {
        const errorText = await response.text();
        setRunResult({
          success: false,
          error: errorText || 'Failed to execute stage',
          duration: Date.now() - startTime,
        });
      }
    } catch (error) {
      setRunResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(commandToRun);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Test Pipeline</h1>
          <p className="text-gray-400">Run individual pipeline stages interactively</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Stage Selection */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
                <span>Select Stage</span>
                <span className="text-sm text-gray-400 font-normal">All 13 Stages</span>
              </h2>
              <div className="space-y-2 max-h-[700px] overflow-y-auto pr-2">
                {PIPELINE_STAGES.map((stage, index) => (
                  <button
                    key={stage.id}
                    onClick={() => handleStageChange(stage.id)}
                    className={`w-full text-left p-4 rounded-lg transition-all border-2 ${
                      selectedStage === stage.id
                        ? 'bg-green-600 text-white border-green-400'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-base">{stage.name}</div>
                        <div className="text-xs mt-1 opacity-90">{stage.description}</div>
                      </div>
                      {stage.hasFixtures && (
                        <div className="ml-2">
                          <div className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                            ✓ Ready
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-700 text-xs text-gray-500">
                💡 Tip: Stages with &quot;Ready&quot; indicator have test fixtures available
              </div>
            </div>
          </div>

          {/* Right: Configuration & Execution */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stage Info */}
            {selectedStageInfo && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">{selectedStageInfo.name}</h2>
                    <p className="text-gray-400 mb-3">{selectedStageInfo.description}</p>
                    
                    {/* Input File */}
                    <div className="flex items-center space-x-2 text-sm mb-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-500">Input:</span>
                      <button
                        onClick={() => handleFileOpen(inputFile)}
                        className="bg-zinc-800 px-2 py-1 rounded text-blue-400 font-mono text-xs hover:bg-zinc-700 hover:text-blue-300 transition-all cursor-pointer"
                        title="Click to open in editor"
                      >
                        {inputFile}
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(inputFile)}
                        className="p-1 hover:bg-zinc-700 rounded transition-all"
                        title="Copy path"
                      >
                        <Copy className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>

                    {/* Output File */}
                    <div className="flex items-center space-x-2 text-sm">
                      <FileText className="w-4 h-4 text-green-400" />
                      <span className="text-gray-500">Output:</span>
                      <button
                        onClick={() => handleFileOpen(outputFile)}
                        className="bg-zinc-800 px-2 py-1 rounded text-green-400 font-mono text-xs hover:bg-zinc-700 hover:text-green-300 transition-all cursor-pointer"
                        title="Click to open in editor"
                      >
                        {outputFile}
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(outputFile)}
                        className="p-1 hover:bg-zinc-700 rounded transition-all"
                        title="Copy path"
                      >
                        <Copy className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  {selectedStageInfo.hasFixtures && (
                    <div className="flex items-center space-x-2 text-sm bg-green-600/20 text-green-400 px-3 py-1 rounded-full">
                      <CheckCircle className="w-4 h-4" />
                      <span>Ready to run</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Mode Toggle */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">🚀 Quick Mode Selection</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Free Mode */}
                <button
                  onClick={() => handleModeChange('free')}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    runMode === 'free'
                      ? 'border-green-500 bg-green-600/20'
                      : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-2xl">🆓</div>
                    {runMode === 'free' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div className="font-bold text-lg mb-2">Free Mode</div>
                  <div className="text-sm text-gray-400 mb-3">
                    Uses replay & stub providers
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-400">Zero cost</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-400">Fast execution</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-400">No API keys needed</span>
                    </div>
                  </div>
                </button>

                {/* Real AI Mode */}
                <button
                  onClick={() => handleModeChange('real')}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    runMode === 'real'
                      ? 'border-blue-500 bg-blue-600/20'
                      : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-2xl">🤖</div>
                    {runMode === 'real' && (
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="font-bold text-lg mb-2">Real AI Mode</div>
                  <div className="text-sm text-gray-400 mb-3">
                    Uses OpenAI GPT-4 & TTS
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400">⚠️</span>
                      <span className="text-gray-400">Costs ~$1.55/episode</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-400">✓</span>
                      <span className="text-gray-400">Real AI generation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-400">✓</span>
                      <span className="text-gray-400">Production quality</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Provider Configuration */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-bold">Provider Configuration</h3>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* LLM Provider */}
                <div>
                  <label className="block text-sm font-semibold mb-2">LLM Provider</label>
                  <select
                    value={llmProvider}
                    onChange={(e) => setLlmProvider(e.target.value as ProviderMode)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
                  >
                    <option value="replay">Replay (Free)</option>
                    <option value="openai">OpenAI (Costs $)</option>
                    <option value="stub">Stub (Mock)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {llmProvider === 'replay' && '✓ Uses cassettes, zero cost'}
                    {llmProvider === 'openai' && '⚠️ Real API calls, costs money'}
                    {llmProvider === 'stub' && '✓ Mock data, instant'}
                  </p>
                </div>

                {/* TTS Provider */}
                <div>
                  <label className="block text-sm font-semibold mb-2">TTS Provider</label>
                  <select
                    value={ttsProvider}
                    onChange={(e) => setTtsProvider(e.target.value as ProviderMode)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
                  >
                    <option value="stub">Stub (Mock)</option>
                    <option value="openai">OpenAI (Costs $)</option>
                    <option value="replay">Replay (Free)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {ttsProvider === 'stub' && '✓ Mock audio, instant'}
                    {ttsProvider === 'openai' && '⚠️ Real TTS, costs money'}
                    {ttsProvider === 'replay' && '✓ Uses cassettes'}
                  </p>
                </div>

                {/* HTTP Provider */}
                <div>
                  <label className="block text-sm font-semibold mb-2">HTTP Provider</label>
                  <select
                    value={httpProvider}
                    onChange={(e) => setHttpProvider(e.target.value as ProviderMode)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
                  >
                    <option value="replay">Replay (Free)</option>
                    <option value="stub">Stub (Mock)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {httpProvider === 'replay' && '✓ Uses cassettes, no requests'}
                    {httpProvider === 'stub' && '✓ Mock responses'}
                  </p>
                </div>
              </div>
            </div>

            {/* File Configuration */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-bold">Input/Output Files</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Input File</label>
                  <input
                    type="text"
                    value={inputFile}
                    onChange={(e) => setInputFile(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-green-500"
                    placeholder="fixtures/summarize/in.json"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Output File</label>
                  <input
                    type="text"
                    value={outputFile}
                    onChange={(e) => setOutputFile(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-green-500"
                    placeholder="output.json"
                  />
                </div>
              </div>
            </div>

            {/* Command Preview */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-bold">Command</h3>
                </div>
                <button
                  onClick={copyCommand}
                  className="flex items-center space-x-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-all"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </button>
              </div>
              <div className="bg-black border border-zinc-700 rounded-lg p-4 font-mono text-sm text-green-400 overflow-x-auto">
                {commandToRun}
              </div>
            </div>

            {/* Run Button */}
            <div className="flex space-x-4">
              <button
                onClick={handleRunStage}
                disabled={isRunning}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-bold text-lg transition-all ${
                  isRunning
                    ? 'bg-yellow-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Running Stage...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    <span>Run Stage</span>
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {runResult && (
              <div className={`border rounded-lg p-6 ${
                runResult.success
                  ? 'bg-green-950/50 border-green-800'
                  : 'bg-red-950/50 border-red-800'
              }`}>
                <div className="flex items-start space-x-3 mb-3">
                  {runResult.success ? (
                    <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 mt-1" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">
                      {runResult.success ? 'Stage Completed Successfully!' : 'Stage Failed'}
                    </h3>
                    {runResult.duration && (
                      <p className="text-sm text-gray-400">
                        Duration: {(runResult.duration / 1000).toFixed(2)}s
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-black/50 border border-zinc-700 rounded-lg p-4 mt-3">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {runResult.success ? runResult.output : runResult.error}
                  </pre>
                </div>

                {/* Input & Output File Links */}
                {runResult.success && (
                  <div className="mt-4 pt-4 border-t border-zinc-700 space-y-3">
                    {/* Input File */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <span className="font-semibold">Input File:</span>
                      </div>
                      <div className="flex items-center space-x-3">
          <button
            onClick={() => handleFileOpen(inputFile)}
                          className="bg-zinc-900 px-3 py-2 rounded text-blue-400 font-mono text-sm hover:bg-zinc-800 hover:text-blue-300 transition-all flex items-center space-x-2 border border-blue-500/30 cursor-pointer"
                        >
                          <span>{inputFile}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(inputFile)}
                          className="flex items-center space-x-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition-all"
                          title="Copy path"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Output File */}
                    {runResult.outputFile && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-green-400" />
                          <span className="font-semibold">Output File:</span>
                        </div>
                        <div className="flex items-center space-x-3">
            <button
              onClick={() => handleFileOpen(runResult.outputFile || '')}
                            className="bg-zinc-900 px-3 py-2 rounded text-green-400 font-mono text-sm hover:bg-zinc-800 hover:text-green-300 transition-all flex items-center space-x-2 border border-green-500/30 cursor-pointer"
                          >
                            <span>{runResult.outputFile}</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigator.clipboard.writeText(runResult.outputFile || '')}
                            className="flex items-center space-x-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition-all"
                            title="Copy path"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start space-x-2 text-xs text-gray-500 bg-zinc-800/50 p-3 rounded">
                      <Terminal className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold mb-1">💡 How to open files:</p>
                        <ul className="space-y-1 list-disc list-inside ml-2">
                          <li>Click the file path to open in VS Code</li>
                          <li>Or use copy button and open manually</li>
                          <li>Files are relative to project root</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-6">
              <h3 className="font-bold mb-3 flex items-center space-x-2">
                <ChevronRight className="w-5 h-5" />
                <span>How to Run in Terminal</span>
              </h3>
              <ol className="space-y-2 text-sm text-gray-300">
                <li>1. Copy the command above</li>
                <li>2. Open your terminal in the project directory</li>
                <li>3. Paste and run the command</li>
                <li>4. Check the output file for results</li>
              </ol>
              <div className="mt-4 pt-4 border-t border-blue-800">
                <p className="text-xs text-gray-400">
                  <strong>Note:</strong> The &quot;Run Stage&quot; button simulates execution. 
                  For actual pipeline execution, copy the command and run it in your terminal, 
                  or deploy to AWS for full automation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
