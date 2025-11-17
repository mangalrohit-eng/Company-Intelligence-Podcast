'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminSettings, PipelineSettings, ModelSettings, calculateArticlesNeeded, OpenAIModel } from '@/types/admin-settings';
import { AlertCircle, CheckCircle2, Settings, Save, RotateCcw, Cpu } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [localSettings, setLocalSettings] = useState<PipelineSettings | null>(null);
  const [localModels, setLocalModels] = useState<ModelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Example podcast durations for preview
  const exampleDurations = [5, 10, 15, 20, 30];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      setSettings(data);
      setLocalSettings(data.pipeline);
      setLocalModels(data.models);
    } catch (error: any) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!localSettings || !localModels) return;

    try {
      setSaving(true);
      setMessage(null);
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pipeline: localSettings,
          models: localModels,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      const updated = await response.json();
      setSettings(updated);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setLocalSettings(settings.pipeline);
      setLocalModels(settings.models);
      setMessage(null);
    }
  };

  const updateSetting = (key: keyof PipelineSettings, value: number) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      [key]: value,
    });
  };

  const updateModel = (key: keyof ModelSettings, value: OpenAIModel) => {
    if (!localModels) return;
    setLocalModels({
      ...localModels,
      [key]: value,
    });
  };

  const availableModels: OpenAIModel[] = [
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
    'gpt-4',
    'gpt-4-turbo-preview',
  ];

  const getModelCost = (model: OpenAIModel): string => {
    switch (model) {
      case 'gpt-3.5-turbo':
        return '💰 Cheapest (~$0.002/1K tokens)';
      case 'gpt-3.5-turbo-16k':
        return '💰 Cheap (~$0.003/1K tokens)';
      case 'gpt-4':
        return '💰💰 Expensive (~$0.06/1K tokens)';
      case 'gpt-4-turbo-preview':
        return '💰💰 Expensive (~$0.02/1K tokens)';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!localSettings || !localModels) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-600">Failed to load settings</div>
      </div>
    );
  }

  const hasChanges = 
    JSON.stringify(localSettings) !== JSON.stringify(settings?.pipeline) ||
    JSON.stringify(localModels) !== JSON.stringify(settings?.models);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold">Admin Settings</h1>
        </div>
        <p className="text-gray-600">
          Configure global pipeline parameters for podcast generation
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pipeline Settings</CardTitle>
          <CardDescription>
            Configure parameters that affect article scraping and content generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Words Per Minute */}
          <div className="space-y-2">
            <Label htmlFor="wordsPerMinute">Words Per Minute</Label>
            <Input
              id="wordsPerMinute"
              type="number"
              min="100"
              max="200"
              step="10"
              value={localSettings.wordsPerMinute}
              onChange={(e) => updateSetting('wordsPerMinute', parseInt(e.target.value))}
            />
            <p className="text-sm text-gray-600">
              Average speaking rate for podcast narration (typical: 130-170 WPM)
            </p>
          </div>

          {/* Words Per Article */}
          <div className="space-y-2">
            <Label htmlFor="wordsPerArticle">Average Words Per Article</Label>
            <Input
              id="wordsPerArticle"
              type="number"
              min="300"
              max="1000"
              step="50"
              value={localSettings.wordsPerArticle}
              onChange={(e) => updateSetting('wordsPerArticle', parseInt(e.target.value))}
            />
            <p className="text-sm text-gray-600">
              Expected average length of news articles (typical: 400-600 words)
            </p>
          </div>

          {/* Scrape Success Rate */}
          <div className="space-y-2">
            <Label htmlFor="scrapeSuccessRate">Scrape Success Rate</Label>
            <div className="flex items-center gap-4">
              <Input
                id="scrapeSuccessRate"
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.scrapeSuccessRate}
                onChange={(e) => updateSetting('scrapeSuccessRate', parseFloat(e.target.value))}
                className="max-w-xs"
              />
              <span className="text-sm text-gray-600">
                ({Math.round(localSettings.scrapeSuccessRate * 100)}%)
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Expected percentage of articles successfully scraped (0.0 - 1.0)
            </p>
          </div>

          {/* Relevant Text Rate */}
          <div className="space-y-2">
            <Label htmlFor="relevantTextRate">Relevant Text Rate</Label>
            <div className="flex items-center gap-4">
              <Input
                id="relevantTextRate"
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.relevantTextRate}
                onChange={(e) => updateSetting('relevantTextRate', parseFloat(e.target.value))}
                className="max-w-xs"
              />
              <span className="text-sm text-gray-600">
                ({Math.round(localSettings.relevantTextRate * 100)}%)
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Expected percentage of article text that is relevant (0.0 - 1.0)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Formula Explanation */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Article Limit Formula</CardTitle>
          <CardDescription>
            How the number of articles to scrape is calculated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm mb-4">
            <div className="mb-2">Articles Needed =</div>
            <div className="ml-4 text-indigo-600">
              (Duration × Words/Min) / (Success Rate × Relevant % × Words/Article)
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p className="mb-2">With current settings:</p>
            <div className="font-mono bg-white p-3 rounded border">
              Articles = (Duration × {localSettings.wordsPerMinute}) / ({localSettings.scrapeSuccessRate} × {localSettings.relevantTextRate} × {localSettings.wordsPerArticle})
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Preview: Articles Needed</CardTitle>
          <CardDescription>
            Number of articles to scrape for different podcast durations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Duration</th>
                  <th className="text-left py-2 px-4">Total Words</th>
                  <th className="text-left py-2 px-4">Articles Needed</th>
                </tr>
              </thead>
              <tbody>
                {exampleDurations.map((duration) => {
                  const articlesNeeded = calculateArticlesNeeded(duration, localSettings);
                  const totalWords = duration * localSettings.wordsPerMinute;
                  return (
                    <tr key={duration} className="border-b">
                      <td className="py-2 px-4 font-medium">{duration} min</td>
                      <td className="py-2 px-4 text-gray-600">{totalWords.toLocaleString()} words</td>
                      <td className="py-2 px-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                          {articlesNeeded} articles
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Model Settings */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-purple-600" />
            <div>
              <CardTitle>OpenAI Model Selection</CardTitle>
              <CardDescription>
                Choose which AI model to use for different stages (balance cost vs quality)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Competitor Identification */}
          <div className="space-y-2">
            <Label htmlFor="model-competitor">Competitor Identification</Label>
            <select
              id="model-competitor"
              value={localModels.competitorIdentification}
              onChange={(e) => updateModel('competitorIdentification', e.target.value as OpenAIModel)}
              className="w-full px-3 py-2 border rounded-md"
            >
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-600">
              Used when suggesting competitors for a company • {getModelCost(localModels.competitorIdentification)}
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-4 text-sm text-gray-700">Pipeline Stages</h4>
            <div className="space-y-4">
              {/* Extract */}
              <div className="space-y-2">
                <Label htmlFor="model-extract">Stage 6: Extract Evidence</Label>
                <select
                  id="model-extract"
                  value={localModels.extract}
                  onChange={(e) => updateModel('extract', e.target.value as OpenAIModel)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600">
                  Extracts facts, stats, and quotes from articles • {getModelCost(localModels.extract)}
                  {localModels.extract === 'gpt-3.5-turbo' && <span className="text-green-600"> ✅ Recommended for this task</span>}
                </p>
              </div>

              {/* Summarize */}
              <div className="space-y-2">
                <Label htmlFor="model-summarize">Stage 7: Summarize Topics</Label>
                <select
                  id="model-summarize"
                  value={localModels.summarize}
                  onChange={(e) => updateModel('summarize', e.target.value as OpenAIModel)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600">
                  Creates 1-paragraph summaries per topic • {getModelCost(localModels.summarize)}
                  {localModels.summarize === 'gpt-3.5-turbo' && <span className="text-green-600"> ✅ Recommended for this task</span>}
                </p>
              </div>

              {/* Contrast */}
              <div className="space-y-2">
                <Label htmlFor="model-contrast">Stage 8: Competitor Contrasts</Label>
                <select
                  id="model-contrast"
                  value={localModels.contrast}
                  onChange={(e) => updateModel('contrast', e.target.value as OpenAIModel)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600">
                  Generates competitor comparisons • {getModelCost(localModels.contrast)}
                  {localModels.contrast === 'gpt-3.5-turbo' && <span className="text-green-600"> ✅ Recommended for this task</span>}
                </p>
              </div>

              {/* Outline */}
              <div className="space-y-2">
                <Label htmlFor="model-outline">Stage 9: Thematic Outline</Label>
                <select
                  id="model-outline"
                  value={localModels.outline}
                  onChange={(e) => updateModel('outline', e.target.value as OpenAIModel)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600">
                  Identifies themes and creates outline • {getModelCost(localModels.outline)}
                  {localModels.outline.includes('gpt-4') && <span className="text-blue-600"> 🎯 GPT-4 recommended for thematic thinking</span>}
                </p>
              </div>

              {/* Script */}
              <div className="space-y-2">
                <Label htmlFor="model-script">Stage 10: Generate Script</Label>
                <select
                  id="model-script"
                  value={localModels.script}
                  onChange={(e) => updateModel('script', e.target.value as OpenAIModel)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600">
                  Writes the podcast narrative • {getModelCost(localModels.script)}
                  {localModels.script.includes('gpt-4') && <span className="text-blue-600"> 🎯 GPT-4 recommended for creative writing</span>}
                </p>
              </div>

              {/* QA */}
              <div className="space-y-2">
                <Label htmlFor="model-qa">Stage 11: QA & Verification</Label>
                <select
                  id="model-qa"
                  value={localModels.qa}
                  onChange={(e) => updateModel('qa', e.target.value as OpenAIModel)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600">
                  Verifies [CHECK] markers and binds evidence • {getModelCost(localModels.qa)}
                  {localModels.qa === 'gpt-3.5-turbo' && <span className="text-green-600"> ✅ Recommended for this task</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Cost Optimization Tip:</strong> GPT-3.5 is 90% cheaper than GPT-4 and works great for structured tasks (extract, summarize, contrast, QA). 
              Use GPT-4 only for creative/thematic tasks (outline, script) where quality matters most.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        {settings && (
          <span className="text-sm text-gray-600 ml-auto">
            Last updated: {new Date(settings.updatedAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

