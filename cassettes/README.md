# Cassettes

This directory contains recorded API responses for replay mode testing.

## Structure

```
cassettes/
├── default/
│   ├── llm.json      # OpenAI LLM responses
│   ├── tts.json      # OpenAI TTS responses
│   └── http.json     # HTTP fetch responses
├── test-scenario-1/
│   └── ...
└── README.md
```

## Recording New Cassettes

1. Set provider to `openai` and run your pipeline:
   ```bash
   LLM_PROVIDER=openai ts-node scripts/runStage.ts --stage summarize --in fixtures/summarize/in.json --out fixtures/summarize/out.json --cassette my-cassette
   ```

2. Responses will be automatically recorded to `cassettes/my-cassette/`

3. Switch to replay mode:
   ```bash
   LLM_PROVIDER=replay ts-node scripts/runStage.ts --stage summarize --in fixtures/summarize/in.json --out fixtures/summarize/out.json --cassette my-cassette
   ```

## Benefits

- **Cost Savings**: Replay responses without calling OpenAI
- **Deterministic Tests**: Same responses every time
- **Offline Development**: Work without internet/API access
- **Fast Iteration**: Instant responses for testing

