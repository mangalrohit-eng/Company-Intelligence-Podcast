/**
 * Stage 11: QA & Bind
 * Resolve [CHECK], bind every stat/quote to evidence; date sanity within window
 * Per requirements section 2.3.3 #11
 */

import { EvidenceUnit } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { ILlmGateway } from '@/gateways/types';
import { logger } from '@/utils/logger';

export interface QAOutput {
  script: string; // Script with [CHECK] resolved
  finalScript: string; // Cleaned script without any [CHECK] markers
  checkMarkers: Array<{
    text: string;
    claim: string;
    verified: boolean;
  }>;
  evidenceBindings: Array<{
    span: string;
    evidenceId: string;
    sourceUrl: string;
    verified: boolean;
  }>;
  dateChecks: {
    inWindow: number;
    outsideWindow: number;
  };
  stats: {
    totalChecks: number;
    resolved: number;
    failed: number;
    checksVerified: number;
    checksFailed: number;
    statsBound: number;
    quotesBound: number;
    totalBindings: number;
    dateViolations: number;
  };
}

export class QAStage {
  constructor(private llmGateway: ILlmGateway) {}

  async execute(
    script: string,
    evidenceUnits: EvidenceUnit[],
    timeWindowStart: Date,
    timeWindowEnd: Date,
    emitter: IEventEmitter
  ): Promise<QAOutput> {
    await emitter.emit('qa', 0, 'Starting QA: resolving [CHECK] and binding evidence');

    // Step 1: Find all [CHECK] markers
    const checkMatches = [...script.matchAll(/\[CHECK:?([^\]]*)\]/g)];
    const totalChecks = checkMatches.length;
    const checkMarkers: Array<{text: string; claim: string; verified: boolean}> = [];

    await emitter.emit('qa', 20, `Found ${totalChecks} [CHECK] markers`);

    let resolved = 0;
    let failed = 0;
    let updatedScript = script;

    // Step 2: Resolve each [CHECK] with LLM verification
    for (let i = 0; i < checkMatches.length; i++) {
      const match = checkMatches[i];
      const checkText = match[0];
      const claim = match[1] || 'inference';

      await emitter.emit('qa', 20 + Math.round((i / checkMatches.length) * 30), `Resolving [CHECK] ${i + 1}/${totalChecks}`);

      try {
        const verification = await this.verifyCheck(claim, evidenceUnits);
        
        checkMarkers.push({
          text: checkText,
          claim,
          verified: verification.verified,
        });
        
        if (verification.verified) {
          // Replace [CHECK] with verified text or remove marker
          updatedScript = updatedScript.replace(checkText, verification.resolvedText || '');
          resolved++;
        } else {
          // Mark as failed (keep [CHECK] or add warning)
          updatedScript = updatedScript.replace(checkText, `[UNVERIFIED: ${claim}]`);
          failed++;
        }
      } catch (error) {
        logger.warn('Failed to resolve CHECK', { claim, error });
        checkMarkers.push({
          text: checkText,
          claim,
          verified: false,
        });
        failed++;
      }
    }

    await emitter.emit('qa', 50, `Resolved ${resolved}/${totalChecks} checks`);

    // Step 3: Bind every stat/quote to evidence
    const evidenceBindings = await this.bindEvidence(updatedScript, evidenceUnits);

    await emitter.emit('qa', 70, `Bound ${evidenceBindings.length} evidence items`);

    // Step 4: Date sanity check
    const dateChecks = this.checkDateSanity(evidenceUnits, timeWindowStart, timeWindowEnd);

    await emitter.emit('qa', 90, `Date check: ${dateChecks.outsideWindow} violations`);

    // Calculate final statistics
    const statsBound = evidenceBindings.filter(b => b.span.match(/\d+%|\d+|\$\d+/)).length;
    const quotesBound = evidenceBindings.filter(b => b.span.match(/["']|said/i)).length;
    
    // Remove all remaining [CHECK] markers for final script
    const finalScript = updatedScript.replace(/\[CHECK:?([^\]]*)\]/g, '').replace(/\[UNVERIFIED:([^\]]*)\]/g, '');

    const stats = {
      totalChecks,
      resolved,
      failed,
      checksVerified: resolved,
      checksFailed: failed,
      statsBound,
      quotesBound,
      totalBindings: evidenceBindings.length,
      dateViolations: dateChecks.outsideWindow,
    };

    logger.info('QA stage complete', stats);

    await emitter.emit('qa', 100, 'QA complete', 'info', stats);

    return {
      script: updatedScript,
      finalScript,
      checkMarkers,
      evidenceBindings,
      dateChecks,
      stats,
    };
  }

  /**
   * Verify a [CHECK] claim against evidence
   */
  private async verifyCheck(
    claim: string,
    evidenceUnits: EvidenceUnit[]
  ): Promise<{ verified: boolean; resolvedText?: string }> {
    // Use LLM to verify if claim is supported by evidence
    const evidenceText = evidenceUnits
      .slice(0, 20) // Limit for context
      .map((e) => `${e.type}: "${e.span}" [${e.publisher}, ${e.publishedDate}]`)
      .join('\n');

    const response = await this.llmGateway.complete({
      messages: [
        {
          role: 'system',
          content: `You are a fact-checker. Verify if the claim is supported by the evidence.

Return JSON: {"verified": true/false, "resolvedText": "corrected text or null"}

Rules:
- verified=true if claim is directly supported
- verified=false if speculative or unsupported
- resolvedText should be the corrected/verified version (or null to remove)`,
        },
        {
          role: 'user',
          content: `Claim: ${claim}\n\nEvidence:\n${evidenceText}\n\nVerify this claim.`,
        },
      ],
      temperature: 0.2,
      maxTokens: 150,
      responseFormat: 'json_object',
    });

    try {
      const result = JSON.parse(response.content);
      return {
        verified: result.verified || false,
        resolvedText: result.resolvedText,
      };
    } catch (error) {
      return { verified: false };
    }
  }

  /**
   * Bind every stat/quote in script to evidence
   */
  private async bindEvidence(
    script: string,
    evidenceUnits: EvidenceUnit[]
  ): Promise<Array<{
    span: string;
    evidenceId: string;
    sourceUrl: string;
    verified: boolean;
  }>> {
    const bindings: Array<{
      span: string;
      evidenceId: string;
      sourceUrl: string;
      verified: boolean;
    }> = [];

    // Simple approach: find evidence spans in script and bind
    for (const evidence of evidenceUnits) {
      if (script.includes(evidence.span)) {
        bindings.push({
          span: evidence.span,
          evidenceId: evidence.id,
          sourceUrl: evidence.sourceUrl,
          verified: true,
        });
      }
    }

    return bindings;
  }

  /**
   * Check date sanity: all evidence should be within time window
   */
  private checkDateSanity(
    evidenceUnits: EvidenceUnit[],
    windowStart: Date,
    windowEnd: Date
  ): { inWindow: number; outsideWindow: number } {
    let inWindow = 0;
    let outsideWindow = 0;

    for (const evidence of evidenceUnits) {
      const publishDate = new Date(evidence.publishedDate);
      
      if (publishDate < windowStart || publishDate > windowEnd) {
        logger.warn('Date sanity violation', {
          evidenceId: evidence.id,
          publishDate: evidence.publishedDate,
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString(),
        });
        outsideWindow++;
      } else {
        inWindow++;
      }
    }

    return { inWindow, outsideWindow };
  }
}

