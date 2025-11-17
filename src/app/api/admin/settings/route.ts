/**
 * API Route: Admin Settings
 * GET /api/admin/settings - Get current settings
 * PUT /api/admin/settings - Update settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { AdminSettings, DEFAULT_ADMIN_SETTINGS } from '@/types/admin-settings';

const SETTINGS_FILE = join(process.cwd(), 'data', 'admin-settings.json');

async function ensureDataDir() {
  const dataDir = join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function loadSettings(): Promise<AdminSettings> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return defaults
    return DEFAULT_ADMIN_SETTINGS;
  }
}

async function saveSettings(settings: AdminSettings): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export async function GET(request: NextRequest) {
  try {
    const settings = await loadSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Failed to load settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings', details: error.message },
      { status: 500 }
    );
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
    const { pipeline } = body;
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

    const settings: AdminSettings = {
      id: 'global',
      pipeline,
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

