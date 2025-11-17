'use client';

import { useState } from 'react';

export default function TestRunsPage() {
  const [result, setResult] = useState<string>('');
  const [runs, setRuns] = useState<any[]>([]);

  const testCreateRun = async () => {
    try {
      const { api } = await import('@/lib/api');
      const response = await api.post('/podcasts/test-podcast-123/runs');
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      alert('Run created! Check console and refresh to see it in the list.');
    } catch (error) {
      setResult(`Error: ${error}`);
    }
  };

  const testGetRuns = async () => {
    try {
      const { api } = await import('@/lib/api');
      const response = await api.get('/podcasts/test-podcast-123/runs');
      const data = await response.json();
      setRuns(data.runs || []);
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Runs API</h1>
        
        <div className="space-y-4 mb-8">
          <button 
            onClick={testCreateRun}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-4"
          >
            Create Test Run
          </button>
          <button 
            onClick={testGetRuns}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Get Runs
          </button>
        </div>

        {runs.length > 0 && (
          <div className="p-6 mb-6 bg-white border border-gray-200 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Runs ({runs.length}):</h2>
            <div className="space-y-2">
              {runs.map((run) => (
                <div key={run.id} className="p-3 bg-secondary rounded-lg">
                  <div className="font-mono text-sm">{run.id}</div>
                  <div className="text-xs text-muted">Status: {run.status}</div>
                  <div className="text-xs text-muted">Created: {run.createdAt}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">API Response:</h2>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

