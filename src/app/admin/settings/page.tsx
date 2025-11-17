'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminSettings, PipelineSettings, DiscoverySettings, calculateArticlesNeeded } from '@/types/admin-settings';
import { AlertCircle, CheckCircle2, Settings, Save, RotateCcw } from 'lucide-react';
import { RssFeedManager } from './RssFeedManager';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [localSettings, setLocalSettings] = useState<PipelineSettings | null>(null);
  const [localDiscovery, setLocalDiscovery] = useState<DiscoverySettings | null>(null);
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
      const data = await response.json();
      setSettings(data);
      setLocalSettings(data.pipeline);
      setLocalDiscovery(data.discovery);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!localSettings || !localDiscovery) return;

    try {
      setSaving(true);
      setMessage(null);
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline: localSettings,
          discovery: localDiscovery,
        }),
      });
      const updated = await response.json();
      setSettings(updated);
      setLocalSettings(updated.pipeline);
      setLocalDiscovery(updated.discovery);
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
      setLocalDiscovery(settings.discovery);
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

  if (!localSettings || !localDiscovery) {
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
    JSON.stringify(localDiscovery) !== JSON.stringify(settings?.discovery);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Settings className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
          </div>
          <p className="text-gray-600">
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

        {/* RSS Feed Discovery */}
        <RssFeedManager 
          feeds={localDiscovery.rssFeeds}
          onChange={(updatedFeeds) => {
            setLocalDiscovery({ ...localDiscovery, rssFeeds: updatedFeeds });
          }}
        />

        {/* Action Buttons */}
        <div className="mt-8 flex items-center gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          {settings && (
            <span className="text-sm text-gray-500 ml-auto">
              Last updated: {new Date(settings.updatedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
