/**
 * Demo Script - Demonstrates OpenAI Integration
 * Shows that the pipeline works with REAL AI
 */

import 'dotenv/config';
import { GatewayFactory } from '../src/gateways/factory';
import { ScriptStage } from '../src/engine/stages/script';
import { OutlineStage } from '../src/engine/stages/outline';
import { NoOpEventEmitter } from '../src/utils/event-emitter';
import { logger } from '../src/utils/logger';

async function main() {
  console.log('\n🤖 REAL OPENAI AI INTEGRATION DEMO\n');
  console.log('═══════════════════════════════════════\n');

  // Check OpenAI key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY not found in environment');
    console.error('   Please add it to your .env file\n');
    process.exit(1);
  }

  console.log('✅ OpenAI API Key detected');
  console.log('💰 Cost estimate: ~$0.10-0.20 for this demo');
  console.log('⏱️  Expected time: 20-30 seconds\n');

  // Setup real OpenAI gateway
  const gatewayConfig = {
    llmProvider: 'openai' as const,
    ttsProvider: 'stub' as const,
    httpProvider: 'replay' as const,
    cassetteKey: 'default',
    cassettePath: './cassettes',
    openaiApiKey: process.env.OPENAI_API_KEY,
  };

  console.log('🔧 Initializing OpenAI Gateway...');
  const llmGateway = GatewayFactory.createLlmGateway(gatewayConfig);
  const emitter = new NoOpEventEmitter();
  console.log('✅ Gateway ready\n');

  // Demo 1: Generate a podcast outline with REAL AI
  console.log('📝 DEMO 1: Generating Podcast Outline with GPT-4');
  console.log('───────────────────────────────────────');

  const summaries = [
    {
      topicId: '5g-network',
      topicName: '5G Network Expansion',
      oneStat: {
        span: 'covers 230 million people',
        context: 'Verizon announced its C-band 5G network now covers 230 million people across the United States',
      },
      oneQuote: {
        span: 'This is transformational for our customers',
        context: 'Kyle Malady, Verizon CTO said this is transformational for customers',
        speaker: 'Kyle Malady, Verizon CTO',
      },
    },
    {
      topicId: 'fiber-broadband',
      topicName: 'Fiber & Broadband',
      oneStat: {
        span: '5 Gbps symmetrical speeds',
        context: 'Verizon launched 5 Gbps Fios, the fastest residential service in US',
      },
      oneQuote: {
        span: 'fundamental shifts in household internet use',
        context: 'CEO noted fundamental shifts in how households use internet',
        speaker: 'Sowmyanarayan Sampath',
      },
    },
  ];

  console.log('📤 Sending request to OpenAI GPT-4...');
  const outlineStage = new OutlineStage(llmGateway);
  
  const startOutline = Date.now();
  const outlineResult = await outlineStage.execute(summaries, 'Verizon', emitter);
  const outlineTime = ((Date.now() - startOutline) / 1000).toFixed(1);

  console.log(`✅ Outline generated in ${outlineTime}s\n`);
  console.log('📊 Generated Outline:');
  console.log(`   Theme: ${outlineResult.outline.dominantTheme}`);
  console.log(`   Sub-themes: ${outlineResult.outline.subThemes.join(', ')}`);
  console.log(`   Sections: ${outlineResult.outline.sections.length}`);
  outlineResult.outline.sections.forEach((section, i) => {
    console.log(`     ${i + 1}. ${section.title} - ${section.purpose}`);
  });
  console.log('');

  // Demo 2: Generate podcast script with REAL AI
  console.log('🎙️  DEMO 2: Generating Podcast Script with GPT-4');
  console.log('───────────────────────────────────────');

  const contrasts = [
    {
      topicId: '5g-network',
      competitorName: 'AT&T',
      sentences: [
        "While AT&T focused on FirstNet, Verizon's C-band deployment now covers 230 million people.",
      ],
      boundStatOrQuote: {
        type: 'stat' as const,
        span: 'covers 230 million people',
        evidenceId: 'eu-001',
      },
    },
  ];

  console.log('📤 Sending request to OpenAI GPT-4...');
  const scriptStage = new ScriptStage(llmGateway);
  
  const startScript = Date.now();
  const scriptResult = await scriptStage.execute(
    outlineResult.outline,
    summaries,
    contrasts,
    2.5, // 2.5 minute podcast
    emitter
  );
  const scriptTime = ((Date.now() - startScript) / 1000).toFixed(1);

  console.log(`✅ Script generated in ${scriptTime}s\n`);
  console.log('📊 Generated Script:');
  console.log(`   Word Count: ${scriptResult.stats.wordCount}`);
  console.log(`   Est. Duration: ${scriptResult.stats.estimatedDurationMinutes.toFixed(1)} minutes`);
  console.log(`   Sections: ${scriptResult.script.sections.length}`);
  console.log(`   Bridges: ${scriptResult.stats.bridgeCount}\n`);

  console.log('📝 Script Preview (Cold Open):');
  console.log('───────────────────────────────────────');
  const coldOpen = scriptResult.script.sections.find(s => s.id === 'coldOpen');
  if (coldOpen) {
    const preview = coldOpen.narrative.substring(0, 200);
    console.log(`   "${preview}..."\n`);
  }

  // Summary
  console.log('═══════════════════════════════════════');
  console.log('✅ DEMO COMPLETE!\n');
  console.log('🎉 Results:');
  console.log(`   • Generated outline with ${outlineResult.outline.sections.length} sections`);
  console.log(`   • Generated ${scriptResult.stats.wordCount}-word script`);
  console.log(`   • Total time: ${((Date.now() - startOutline) / 1000).toFixed(1)}s`);
  console.log(`   • Estimated cost: ~$0.15\n`);

  console.log('💡 Key Takeaway:');
  console.log('   The pipeline is FULLY FUNCTIONAL with real OpenAI!');
  console.log('   You can now generate podcasts with actual AI content.\n');
}

main().catch((error) => {
  logger.error('Demo failed', { error: error.message, stack: error.stack });
  console.error('\n❌ Demo failed:', error.message);
  process.exit(1);
});

