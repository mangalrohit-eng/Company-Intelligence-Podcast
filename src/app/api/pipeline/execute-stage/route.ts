/**
 * API Route: Execute Pipeline Stage
 * POST /api/pipeline/execute-stage
 * 
 * Executes a single pipeline stage with specified providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stage, llmProvider, ttsProvider, httpProvider, inputFile, outputFile } = body;

    if (!stage) {
      return NextResponse.json({ error: 'Stage is required' }, { status: 400 });
    }

    // Build the command to execute
    const stageName = stage.toLowerCase().replace(/^stage \d+: /, '');
    let command = `npm run run-stage -- --stage ${stageName}`;

    // Add provider flags
    if (llmProvider && llmProvider !== 'auto') {
      command += ` --llm ${llmProvider}`;
    }
    if (ttsProvider && ttsProvider !== 'auto') {
      command += ` --tts ${ttsProvider}`;
    }
    if (httpProvider && httpProvider !== 'auto') {
      command += ` --http ${httpProvider}`;
    }

    // Add input/output file paths
    if (inputFile) {
      command += ` --in ${inputFile}`;
    }
    if (outputFile) {
      command += ` --out ${outputFile}`;
    }

    console.log(`Executing command: ${command}`);

    // Execute the command
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 300000, // 5 minute timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return NextResponse.json({
      success: true,
      output: stdout || stderr,
      command,
    });

  } catch (error: any) {
    console.error('Pipeline execution error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to execute pipeline stage',
        stderr: error.stderr,
        stdout: error.stdout,
      },
      { status: 500 }
    );
  }
}

