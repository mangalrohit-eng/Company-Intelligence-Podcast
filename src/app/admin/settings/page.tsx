'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminSettings, PipelineSettings, DiscoverySettings, ModelSettings, RankingWeights, calculateArticlesNeeded } from '@/types/admin-settings';
import { AlertCircle, CheckCircle2, Settings, Save, RotateCcw, StopCircle, Trash2 } from 'lucide-react';
import { RssFeedManager } from './RssFeedManager';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [localSettings, setLocalSettings] = useState<PipelineSettings | null>(null);
  const [localDiscovery, setLocalDiscovery] = useState<DiscoverySettings | null>(null);
  const [localModels, setLocalModels] = useState<ModelSettings | null>(null);
  const [localRanking, setLocalRanking] = useState<RankingWeights | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Example podcast durations for preview
  const exampleDurations = [5, 10, 15, 20, 30];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('📥 Loading admin settings...');
      const response = await fetch('/api/admin/settings');
      console.log('📊 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Failed to load settings:', errorData);
        setMessage({ type: 'error', text: `Failed to load settings: ${errorData.error || response.statusText}` });
        return;
      }
      
      const data = await response.json();
      console.log('✅ Settings loaded:', data);
      
      // Validate data structure
      if (!data.pipeline || !data.discovery || !data.models || !data.ranking) {
        console.error('❌ Invalid settings structure:', data);
        setMessage({ type: 'error', text: 'Invalid settings structure received from server' });
        return;
      }
      
      setSettings(data);
      setLocalSettings(data.pipeline);
      setLocalDiscovery(data.discovery);
      setLocalModels(data.models);
      setLocalRanking(data.ranking);
      setMessage({ type: 'success', text: 'Settings loaded successfully' });
    } catch (error: any) {
      console.error('❌ Exception loading settings:', error);
      setMessage({ type: 'error', text: `Failed to load settings: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!localSettings || !localDiscovery || !localModels || !localRanking) return;

    try {
      setSaving(true);
      setMessage(null);
      console.log('💾 Saving settings...');
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline: localSettings,
          models: localModels,
          discovery: localDiscovery,
          ranking: localRanking,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Failed to save:', errorData);
        setMessage({ type: 'error', text: errorData.error || 'Failed to save settings' });
        return;
      }
      
      const updated = await response.json();
      console.log('✅ Settings saved:', updated);
      setSettings(updated);
      setLocalSettings(updated.pipeline);
      setLocalDiscovery(updated.discovery);
      setLocalModels(updated.models);
      setLocalRanking(updated.ranking);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error: any) {
      console.error('❌ Exception saving settings:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setLocalSettings(settings.pipeline);
      setLocalDiscovery(settings.discovery);
      setLocalModels(settings.models);
      setLocalRanking(settings.ranking);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!localSettings || !localDiscovery || !localModels || !localRanking) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto">
          <div className="text-center text-red-600 bg-red-50 p-6 rounded-lg max-w-2xl mx-auto">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold">Failed to load settings</p>
          </div>
        </div>
      </div>
    );
  }

  const hasChanges = 
    JSON.stringify(localSettings) !== JSON.stringify(settings?.pipeline) ||
    JSON.stringify(localDiscovery) !== JSON.stringify(settings?.discovery) ||
    JSON.stringify(localModels) !== JSON.stringify(settings?.models) ||
    JSON.stringify(localRanking) !== JSON.stringify(settings?.ranking);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="container mx-auto py-4 sm:py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Settings</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            Configure global pipeline parameters for podcast generation
          </p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 shadow-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Settings Card */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-gray-900">Pipeline Settings</CardTitle>
                <CardDescription className="text-gray-600">
                  Configure parameters that affect article scraping and content generation
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Words Per Minute */}
                  <div className="space-y-2">
                    <Label htmlFor="wordsPerMinute" className="text-gray-900 font-semibold">
                      Words Per Minute
                    </Label>
                    <Input
                      id="wordsPerMinute"
                      type="number"
                      min="100"
                      max="200"
                      step="10"
                      value={localSettings.wordsPerMinute}
                      onChange={(e) => updateSetting('wordsPerMinute', parseInt(e.target.value))}
                      className="border-gray-300 text-gray-900 bg-white focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <p className="text-sm text-gray-500">
                      Average speaking rate for podcast narration (typical: 130-170 WPM)
                    </p>
                  </div>

                  {/* Words Per Article */}
                  <div className="space-y-2">
                    <Label htmlFor="wordsPerArticle" className="text-gray-900 font-semibold">
                      Average Words Per Article
                    </Label>
                    <Input
                      id="wordsPerArticle"
                      type="number"
                      min="300"
                      max="1000"
                      step="50"
                      value={localSettings.wordsPerArticle}
                      onChange={(e) => updateSetting('wordsPerArticle', parseInt(e.target.value))}
                      className="border-gray-300 text-gray-900 bg-white focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <p className="text-sm text-gray-500">
                      Expected average length of news articles (typical: 400-600 words)
                    </p>
                  </div>

                  {/* Scrape Success Rate */}
                  <div className="space-y-2">
                    <Label htmlFor="scrapeSuccessRate" className="text-gray-900 font-semibold">
                      Scrape Success Rate
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="scrapeSuccessRate"
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={localSettings.scrapeSuccessRate}
                        onChange={(e) => updateSetting('scrapeSuccessRate', parseFloat(e.target.value))}
                        className="border-gray-300 text-gray-900 bg-white focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-indigo-600 whitespace-nowrap">
                        {Math.round(localSettings.scrapeSuccessRate * 100)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Expected percentage of articles successfully scraped (0.0 - 1.0)
                    </p>
                  </div>

                  {/* Relevant Text Rate */}
                  <div className="space-y-2">
                    <Label htmlFor="relevantTextRate" className="text-gray-900 font-semibold">
                      Relevant Text Rate
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="relevantTextRate"
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={localSettings.relevantTextRate}
                        onChange={(e) => updateSetting('relevantTextRate', parseFloat(e.target.value))}
                        className="border-gray-300 text-gray-900 bg-white focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-indigo-600 whitespace-nowrap">
                        {Math.round(localSettings.relevantTextRate * 100)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Expected percentage of article text that is relevant (0.0 - 1.0)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formula Explanation Card */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-indigo-50 border-b border-indigo-100">
              <CardTitle className="text-gray-900">Article Limit Formula</CardTitle>
              <CardDescription className="text-gray-600">
                How the number of articles to scrape is calculated
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200 mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Articles Needed =</div>
                <div className="text-sm font-mono text-indigo-900 leading-relaxed">
                  (Duration × Words/Min) /<br />
                  (Success Rate × Relevant % × Words/Article)
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">With current settings:</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 font-mono text-sm text-gray-800">
                  <div>Duration × {localSettings.wordsPerMinute}</div>
                  <div className="border-t border-gray-300 my-2"></div>
                  <div>{localSettings.scrapeSuccessRate} × {localSettings.relevantTextRate} × {localSettings.wordsPerArticle}</div>
                  <div className="mt-2 pt-2 border-t border-gray-300 text-xs text-gray-600">
                    = {localSettings.wordsPerMinute} / {(localSettings.scrapeSuccessRate * localSettings.relevantTextRate * localSettings.wordsPerArticle).toFixed(1)} per minute
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Table Card */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-green-50 border-b border-green-100">
              <CardTitle className="text-gray-900">Preview: Articles Needed</CardTitle>
              <CardDescription className="text-gray-600">
                Number of articles to scrape for different podcast durations
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {exampleDurations.map((duration) => {
                  const articlesNeeded = calculateArticlesNeeded(duration, localSettings);
                  const totalWords = duration * localSettings.wordsPerMinute;
                  return (
                    <div
                      key={duration}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-gray-900">{duration}</span>
                        <span className="text-sm text-gray-600">min</span>
                        <span className="text-xs text-gray-400 ml-2">
                          ({totalWords.toLocaleString()} words)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-indigo-600">{articlesNeeded}</span>
                        <span className="text-sm text-gray-600">articles</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Models Configuration */}
        <div className="mt-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-purple-50 border-b border-purple-100">
              <CardTitle className="text-gray-900">🤖 AI Models Configuration</CardTitle>
              <CardDescription className="text-gray-600">
                Choose which OpenAI model to use for each pipeline stage
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Extract Stage */}
                <div className="space-y-2">
                  <Label htmlFor="model-extract" className="text-gray-900 font-semibold">
                    Extract Evidence
                  </Label>
                  <select
                    id="model-extract"
                    value={localModels.extract}
                    onChange={(e) => setLocalModels({ ...localModels, extract: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="gpt-4-turbo-preview">GPT-4 Turbo (Best Quality)</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (90% cheaper) ✅</option>
                    <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</option>
                  </select>
                  <p className="text-xs text-gray-500">Extracts facts, stats, and quotes from articles</p>
                </div>

                {/* Summarize Stage */}
                <div className="space-y-2">
                  <Label htmlFor="model-summarize" className="text-gray-900 font-semibold">
                    Summarize Topics
                  </Label>
                  <select
                    id="model-summarize"
                    value={localModels.summarize}
                    onChange={(e) => setLocalModels({ ...localModels, summarize: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="gpt-4-turbo-preview">GPT-4 Turbo (Best Quality)</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (90% cheaper) ✅</option>
                    <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</option>
                  </select>
                  <p className="text-xs text-gray-500">Creates topic summaries from evidence</p>
                </div>

                {/* Contrast Stage */}
                <div className="space-y-2">
                  <Label htmlFor="model-contrast" className="text-gray-900 font-semibold">
                    Contrast Competitors
                  </Label>
                  <select
                    id="model-contrast"
                    value={localModels.contrast}
                    onChange={(e) => setLocalModels({ ...localModels, contrast: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="gpt-4-turbo-preview">GPT-4 Turbo (Best Quality)</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (90% cheaper) ✅</option>
                    <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</option>
                  </select>
                  <p className="text-xs text-gray-500">Generates competitor comparisons</p>
                </div>

                {/* Outline Stage */}
                <div className="space-y-2">
                  <Label htmlFor="model-outline" className="text-gray-900 font-semibold">
                    Generate Outline
                  </Label>
                  <select
                    id="model-outline"
                    value={localModels.outline}
                    onChange={(e) => setLocalModels({ ...localModels, outline: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="gpt-4-turbo-preview">GPT-4 Turbo (Best Quality) ⭐</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</option>
                  </select>
                  <p className="text-xs text-gray-500">Creates thematic outline (needs GPT-4)</p>
                </div>

                {/* Script Stage */}
                <div className="space-y-2">
                  <Label htmlFor="model-script" className="text-gray-900 font-semibold">
                    Write Script
                  </Label>
                  <select
                    id="model-script"
                    value={localModels.script}
                    onChange={(e) => setLocalModels({ ...localModels, script: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="gpt-4-turbo-preview">GPT-4 Turbo (Best Quality) ⭐</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</option>
                  </select>
                  <p className="text-xs text-gray-500">Writes final podcast script (needs GPT-4)</p>
                </div>

                {/* QA Stage */}
                <div className="space-y-2">
                  <Label htmlFor="model-qa" className="text-gray-900 font-semibold">
                    Quality Assurance
                  </Label>
                  <select
                    id="model-qa"
                    value={localModels.qa}
                    onChange={(e) => setLocalModels({ ...localModels, qa: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="gpt-4-turbo-preview">GPT-4 Turbo (Best Quality)</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (90% cheaper) ✅</option>
                    <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</option>
                  </select>
                  <p className="text-xs text-gray-500">Verifies [CHECK] markers in script</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ranking Weights Configuration */}
        <div className="mt-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-amber-50 border-b border-amber-100">
              <CardTitle className="text-gray-900">⚖️ Ranking Weights</CardTitle>
              <CardDescription className="text-gray-600">
                Configure how articles are scored and ranked (must sum to 100%)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Recency */}
                <div className="space-y-2">
                  <Label htmlFor="weight-recency" className="text-gray-900 font-semibold">
                    📅 Recency
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="weight-recency"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={localRanking.recency}
                      onChange={(e) => setLocalRanking({ ...localRanking, recency: parseFloat(e.target.value) })}
                      className="border-gray-300 text-gray-900 bg-white"
                    />
                    <span className="text-sm font-medium text-amber-600 whitespace-nowrap w-12">
                      {Math.round(localRanking.recency * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">How recent is the article?</p>
                </div>

                {/* Freshness */}
                <div className="space-y-2">
                  <Label htmlFor="weight-freshness" className="text-gray-900 font-semibold">
                    ✨ Freshness
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="weight-freshness"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={localRanking.freshness}
                      onChange={(e) => setLocalRanking({ ...localRanking, freshness: parseFloat(e.target.value) })}
                      className="border-gray-300 text-gray-900 bg-white"
                    />
                    <span className="text-sm font-medium text-amber-600 whitespace-nowrap w-12">
                      {Math.round(localRanking.freshness * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Discovery relevance score</p>
                </div>

                {/* Authority */}
                <div className="space-y-2">
                  <Label htmlFor="weight-authority" className="text-gray-900 font-semibold">
                    🏆 Authority
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="weight-authority"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={localRanking.authority}
                      onChange={(e) => setLocalRanking({ ...localRanking, authority: parseFloat(e.target.value) })}
                      className="border-gray-300 text-gray-900 bg-white"
                    />
                    <span className="text-sm font-medium text-amber-600 whitespace-nowrap w-12">
                      {Math.round(localRanking.authority * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Publisher reputation</p>
                </div>

                {/* Diversity */}
                <div className="space-y-2">
                  <Label htmlFor="weight-diversity" className="text-gray-900 font-semibold">
                    🌈 Diversity
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="weight-diversity"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={localRanking.diversity}
                      onChange={(e) => setLocalRanking({ ...localRanking, diversity: parseFloat(e.target.value) })}
                      className="border-gray-300 text-gray-900 bg-white"
                    />
                    <span className="text-sm font-medium text-amber-600 whitespace-nowrap w-12">
                      {Math.round(localRanking.diversity * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Source diversity penalty</p>
                </div>

                {/* Specificity */}
                <div className="space-y-2">
                  <Label htmlFor="weight-specificity" className="text-gray-900 font-semibold">
                    🎯 Specificity
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="weight-specificity"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={localRanking.specificity}
                      onChange={(e) => setLocalRanking({ ...localRanking, specificity: parseFloat(e.target.value) })}
                      className="border-gray-300 text-gray-900 bg-white"
                    />
                    <span className="text-sm font-medium text-amber-600 whitespace-nowrap w-12">
                      {Math.round(localRanking.specificity * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Topic relevance</p>
                </div>

                {/* Total Display */}
                <div className="space-y-2">
                  <Label className="text-gray-900 font-semibold">
                    📊 Total
                  </Label>
                  <div className={`px-4 py-2 rounded-md text-center font-bold text-lg ${
                    Math.abs((localRanking.recency + localRanking.freshness + localRanking.authority + localRanking.diversity + localRanking.specificity) - 1.0) < 0.01
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {Math.round((localRanking.recency + localRanking.freshness + localRanking.authority + localRanking.diversity + localRanking.specificity) * 100)}%
                  </div>
                  <p className="text-xs text-gray-500">Must equal 100%</p>
                </div>
              </div>

              {/* Warning if not 100% */}
              {Math.abs((localRanking.recency + localRanking.freshness + localRanking.authority + localRanking.diversity + localRanking.specificity) - 1.0) >= 0.01 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">
                    Weights must sum to exactly 100% (currently{' '}
                    {Math.round((localRanking.recency + localRanking.freshness + localRanking.authority + localRanking.diversity + localRanking.specificity) * 100)}%)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RSS Feed Discovery */}
        <RssFeedManager 
          feeds={localDiscovery.rssFeeds}
          onChange={(updatedFeeds) => {
            setLocalDiscovery({ ...localDiscovery, rssFeeds: updatedFeeds });
          }}
        />

        {/* Run Management Section */}
        <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Run Management</h3>
          <p className="text-sm text-gray-600 mb-4">
            Manage active and failed pipeline runs across all podcasts
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleStopAllRuns}
              disabled={stopping}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              {stopping ? 'Stopping...' : 'Stop All Active Runs'}
            </Button>
            <Button
              onClick={handleDeleteFailedRuns}
              disabled={deleting}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete All Failed Runs'}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed px-6 w-full sm:w-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          {settings && (
            <span className="text-xs sm:text-sm text-gray-500 sm:ml-auto text-center sm:text-left">
              Last updated: {new Date(settings.updatedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
