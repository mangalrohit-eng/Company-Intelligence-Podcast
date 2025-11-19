/**
 * API Route: Admin Settings
 * GET /api/admin/settings - Get current settings
 * PUT /api/admin/settings - Update settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdminSettings, DEFAULT_ADMIN_SETTINGS } from '@/types/admin-settings';
import { isS3Available, readFromS3, writeToS3, getAdminSettingsKey } from '@/lib/s3-storage';

async function loadSettings(): Promise<AdminSettings> {
  if (!isS3Available()) {
    console.warn('S3 not available, returning default admin settings');
    return DEFAULT_ADMIN_SETTINGS;
  }
  
  try {
    const data = await readFromS3(getAdminSettingsKey());
    return JSON.parse(data.toString('utf-8'));
  } catch (error: any) {
    // If file doesn't exist in S3, return defaults
    if (error.message?.includes('not found') || error.message?.includes('NoSuchKey')) {
      console.log('Admin settings not found in S3, using defaults');
      return DEFAULT_ADMIN_SETTINGS;
    }
    console.error('Error loading admin settings from S3:', error);
    return DEFAULT_ADMIN_SETTINGS;
  }
}

async function saveSettings(settings: AdminSettings): Promise<void> {
  if (!isS3Available()) {
    throw new Error('AWS credentials required. S3 storage must be configured for admin settings.');
  }
  
  await writeToS3(
    getAdminSettingsKey(),
    JSON.stringify(settings, null, 2),
    'application/json'
  );
}

export async function GET(request: NextRequest) {
  try {
    console.log('📥 GET /api/admin/settings - Loading settings...');
    const settings = await loadSettings();
    
    // Ensure all required fields are present
    const completeSettings = {
      ...DEFAULT_ADMIN_SETTINGS,
      ...settings,
      pipeline: { ...DEFAULT_ADMIN_SETTINGS.pipeline, ...settings.pipeline },
      models: { ...DEFAULT_ADMIN_SETTINGS.models, ...settings.models },
      discovery: { ...DEFAULT_ADMIN_SETTINGS.discovery, ...settings.discovery },
      ranking: { ...DEFAULT_ADMIN_SETTINGS.ranking, ...settings.ranking },
    };
    
    console.log('✅ Settings loaded successfully');
    return NextResponse.json(completeSettings);
  } catch (error: any) {
    console.error('❌ Failed to load settings:', error);
    
    // In case of any error, return defaults with 200 status
    // This ensures the admin page can always load
    console.log('⚠️ Returning default settings due to error');
    return NextResponse.json(DEFAULT_ADMIN_SETTINGS);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the settings
    if (!body.pipeline) {
      return NextResponse.json(
        { error: 'Missing pipeline settings' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    const { pipeline, models, discovery, ranking } = body;
    if (
      typeof pipeline.wordsPerMinute !== 'number' ||
      typeof pipeline.wordsPerArticle !== 'number' ||
      typeof pipeline.scrapeSuccessRate !== 'number' ||
      typeof pipeline.relevantTextRate !== 'number'
    ) {
      return NextResponse.json(
        { error: 'All pipeline settings must be numbers' },
        { status: 400 }
      );
    }

    // Validate ranges
    if (pipeline.scrapeSuccessRate < 0 || pipeline.scrapeSuccessRate > 1) {
      return NextResponse.json(
        { error: 'scrapeSuccessRate must be between 0 and 1' },
        { status: 400 }
      );
    }

    if (pipeline.relevantTextRate < 0 || pipeline.relevantTextRate > 1) {
      return NextResponse.json(
        { error: 'relevantTextRate must be between 0 and 1' },
        { status: 400 }
      );
    }

    // Validate ranking weights if provided
    if (ranking) {
      const weights = ['recency', 'freshness', 'authority', 'diversity', 'specificity'];
      for (const weight of weights) {
        const value = ranking[weight];
        if (typeof value !== 'number' || value < 0 || value > 1) {
          return NextResponse.json(
            { error: `Ranking weight '${weight}' must be a number between 0 and 1` },
            { status: 400 }
          );
        }
      }
      
      // Validate that weights sum to approximately 1.0 (allow small floating point errors)
      const sum = ranking.recency + ranking.freshness + ranking.authority + ranking.diversity + ranking.specificity;
      if (Math.abs(sum - 1.0) > 0.01) {
        return NextResponse.json(
          { error: `Ranking weights must sum to 1.0 (currently ${sum.toFixed(2)})` },
          { status: 400 }
        );
      }
    }

    const settings: AdminSettings = {
      id: 'global',
      pipeline,
      models: models || DEFAULT_ADMIN_SETTINGS.models,
      discovery: discovery || DEFAULT_ADMIN_SETTINGS.discovery,
      ranking: ranking || DEFAULT_ADMIN_SETTINGS.ranking,
      updatedAt: new Date().toISOString(),
      updatedBy: body.updatedBy || 'admin',
    };

    await saveSettings(settings);

    console.log('✅ Admin settings updated:', settings);

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings', details: error.message },
      { status: 500 }
    );
  }
}

