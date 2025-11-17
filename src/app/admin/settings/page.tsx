'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminSettings, PipelineSettings, calculateArticlesNeeded } from '@/types/admin-settings';
import { AlertCircle, CheckCircle2, Settings, Save, RotateCcw } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [localSettings, setLocalSettings] = useState<PipelineSettings | null>(null);
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
    } catch (error: any) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!localSettings) return;

    try {
      setSaving(true);
      setMessage(null);
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline: localSettings }),
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
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!localSettings) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-600">Failed to load settings</div>
      </div>
    );
  }

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings?.pipeline);

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

