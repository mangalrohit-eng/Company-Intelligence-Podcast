import { NextResponse } from 'next/server';

/**
 * Health check endpoint for container health checks
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'podcast-platform',
    version: '1.0.0',
  });
}

