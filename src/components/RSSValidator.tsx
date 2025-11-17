/**
 * RSS Feed Validator Component
 */

'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface RSSValidatorProps {
  podcastId: string;
  rssUrl: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: {
    episodeCount?: number;
    lastUpdated?: string;
    iTunesCompliant?: boolean;
    spotifyCompliant?: boolean;
    size?: number;
  };
}

export function RSSValidator({ podcastId, rssUrl }: RSSValidatorProps) {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const validateFeed = async () => {
    try {
      setValidating(true);
      const { api } = await import('@/lib/api');
      const response = await api.get(`/podcasts/${podcastId}/rss/validate`);
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        setResult({
          valid: false,
          errors: ['Failed to validate RSS feed'],
          warnings: [],
          info: {},
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      setResult({
        valid: false,
        errors: ['Network error during validation'],
        warnings: [],
        info: {},
      });
    } finally {
      setValidating(false);
    }
  };

  const copyRSSUrl = () => {
    navigator.clipboard.writeText(rssUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getHealthScore = () => {
    if (!result) return null;
    
    const score = 100 - (result.errors.length * 20) - (result.warnings.length * 5);
    return Math.max(0, score);
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold mb-1">RSS Feed Health</h3>
          <p className="text-sm text-muted">
            Validate your podcast RSS feed for distribution
          </p>
        </div>
        
        <Button
          onClick={validateFeed}
          disabled={validating}
          variant="outline"
          className="gap-2"
        >
          {validating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Validate
            </>
          )}
        </Button>
      </div>

      {/* RSS URL */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2">RSS Feed URL</label>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-2 bg-secondary border border-border rounded-lg text-sm font-mono truncate">
            {rssUrl}
          </div>
          <Button
            onClick={copyRSSUrl}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </>
            )}
          </Button>
          <a
            href={rssUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open
            </Button>
          </a>
        </div>
      </div>

      {/* Validation Results */}
      {result && (
        <div className="space-y-4">
          {/* Health Score */}
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div className="flex items-center gap-3">
              {result.valid ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-red-500" />
              )}
              <div>
                <div className="font-semibold">
                  {result.valid ? 'Feed Valid' : 'Feed Has Issues'}
                </div>
                <div className="text-sm text-muted">
                  {result.errors.length} errors, {result.warnings.length} warnings
                </div>
              </div>
            </div>
            
            {getHealthScore() !== null && (
              <div className="text-right">
                <div className={`text-3xl font-bold ${getHealthColor(getHealthScore()!)}`}>
                  {getHealthScore()}
                </div>
                <div className="text-xs text-muted">Health Score</div>
              </div>
            )}
          </div>

          {/* Feed Info */}
          {result.info && Object.keys(result.info).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {result.info.episodeCount !== undefined && (
                <div className="p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold">{result.info.episodeCount}</div>
                  <div className="text-xs text-muted">Episodes</div>
                </div>
              )}
              
              {result.info.lastUpdated && (
                <div className="p-3 bg-secondary rounded-lg">
                  <div className="text-sm font-semibold truncate">
                    {new Date(result.info.lastUpdated).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted">Last Updated</div>
                </div>
              )}
              
              {result.info.iTunesCompliant !== undefined && (
                <div className="p-3 bg-secondary rounded-lg">
                  <Badge variant={result.info.iTunesCompliant ? 'success' : 'danger'}>
                    {result.info.iTunesCompliant ? '✓' : '✗'} iTunes
                  </Badge>
                  <div className="text-xs text-muted mt-1">Compliance</div>
                </div>
              )}
              
              {result.info.spotifyCompliant !== undefined && (
                <div className="p-3 bg-secondary rounded-lg">
                  <Badge variant={result.info.spotifyCompliant ? 'success' : 'danger'}>
                    {result.info.spotifyCompliant ? '✓' : '✗'} Spotify
                  </Badge>
                  <div className="text-xs text-muted mt-1">Compliance</div>
                </div>
              )}
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div>
              <h4 className="font-semibold text-red-500 mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Errors ({result.errors.length})
              </h4>
              <div className="space-y-2">
                {result.errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm"
                  >
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div>
              <h4 className="font-semibold text-yellow-500 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Warnings ({result.warnings.length})
              </h4>
              <div className="space-y-2">
                {result.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm"
                  >
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success State */}
          {result.valid && result.errors.length === 0 && result.warnings.length === 0 && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-green-500 mb-1">
                    RSS Feed is Healthy!
                  </div>
                  <p className="text-sm text-muted">
                    Your feed is valid and ready for distribution to Apple Podcasts, Spotify, 
                    and other podcast platforms.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Distribution Links */}
          <div className="pt-4 border-t border-border">
            <h4 className="font-semibold mb-3">Submit to Platforms</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <a
                href="https://podcastsconnect.apple.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border border-border rounded-lg hover:border-primary transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white">
                    🎵
                  </div>
                  <div>
                    <div className="font-semibold">Apple Podcasts</div>
                    <div className="text-xs text-muted">Submit your feed</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted group-hover:text-primary" />
              </a>

              <a
                href="https://podcasters.spotify.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border border-border rounded-lg hover:border-primary transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white">
                    ♫
                  </div>
                  <div>
                    <div className="font-semibold">Spotify</div>
                    <div className="text-xs text-muted">Submit your feed</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted group-hover:text-primary" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Initial State */}
      {!result && !validating && (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted mb-4">
            Click "Validate" to check your RSS feed health
          </p>
          <div className="text-xs text-muted max-w-md mx-auto">
            We'll check for common issues, validate XML structure, and verify 
            iTunes/Spotify compliance
          </div>
        </div>
      )}
    </Card>
  );
}


