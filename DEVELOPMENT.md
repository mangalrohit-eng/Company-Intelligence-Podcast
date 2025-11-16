# Development Guide

## Getting Started

### Local Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**:
   ```bash
   pnpm dev
   ```

## Working with the Pipeline

### Running Individual Stages

Use the `runStage.ts` script to test stages in isolation:

```bash
# With replay mode (free)
pnpm ts-node scripts/runStage.ts \
  --stage summarize \
  --in fixtures/summarize/in.json \
  --out fixtures/summarize/out.json \
  --llm replay

# With OpenAI (costs money)
pnpm ts-node scripts/runStage.ts \
  --stage summarize \
  --in fixtures/summarize/in.json \
  --out fixtures/summarize/out.json \
  --llm openai
```

### Creating New Stages

1. Create stage file in `src/engine/stages/<stage>.ts`
2. Implement the stage interface:
   ```typescript
   export class MyStage {
     async execute(input: InputType, emitter: IEventEmitter): Promise<OutputType> {
       await emitter.emit('my-stage', 0, 'Starting');
       // ... implementation
       await emitter.emit('my-stage', 100, 'Complete');
       return output;
     }
   }
   ```

3. Add to orchestrator in `src/engine/orchestrator.ts`
4. Add to Step Functions definition
5. Create fixtures in `fixtures/my-stage/`
6. Add tests

### Recording Cassettes

To record real API responses for replay:

```bash
# 1. Run with openai provider
LLM_PROVIDER=openai \
CASSETTE_KEY=my-scenario \
pnpm ts-node scripts/recordCassette.ts \
  --stage summarize \
  --in fixtures/summarize/in.json

# 2. Responses saved to cassettes/my-scenario/

# 3. Replay for free
LLM_PROVIDER=replay \
CASSETTE_KEY=my-scenario \
pnpm ts-node scripts/runStage.ts \
  --stage summarize \
  --in fixtures/summarize/in.json \
  --out output.json
```

## Frontend Development

### Component Structure

```
src/app/
├── layout.tsx           # Root layout
├── page.tsx             # Landing page
├── globals.css          # Global styles
└── podcasts/
    ├── page.tsx         # Dashboard
    ├── new/
    │   └── page.tsx     # Creation wizard
    └── [id]/
        ├── page.tsx     # Podcast detail
        └── runs/
            └── [runId]/
                └── page.tsx  # Run detail
```

### Adding a New Page

1. Create file in `src/app/<route>/page.tsx`
2. Export default component
3. Add navigation link
4. Style with Tailwind CSS

### Design System

The app uses a Spotify-inspired dark theme:

- **Colors**: `--primary` (green), `--background` (black), `--secondary` (dark gray)
- **Typography**: Inter font
- **Components**: Cards, buttons, forms with consistent styling

## Infrastructure

### CDK Stack

The infrastructure is defined in `infra/cdk/lib/podcast-platform-stack.ts`:

- DynamoDB tables
- S3 buckets
- Lambda functions
- Step Functions
- Cognito user pool
- CloudFront distribution

### Deploying Changes

```bash
cd infra/cdk

# Synthesize CloudFormation
pnpm cdk synth

# Deploy
pnpm cdk deploy

# Destroy (cleanup)
pnpm cdk destroy
```

## Testing

### Unit Tests

```bash
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test --coverage
```

### Integration Tests

Test full pipeline with stub providers:

```bash
pnpm test:integration
```

### E2E Tests

Test deployed system:

```bash
pnpm test:e2e
```

## Debugging

### Lambda Functions

Use AWS SAM CLI for local testing:

```bash
sam local invoke CreatePodcastFunction -e events/create-podcast.json
```

### Step Functions

Test locally with Step Functions Local:

```bash
docker run -p 8083:8083 amazon/aws-stepfunctions-local
```

### Frontend

Use Next.js dev tools:

```bash
pnpm dev
# Visit http://localhost:3000
```

## Best Practices

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Run Prettier before commit
- Write descriptive commit messages

### Error Handling

- Use try/catch in async functions
- Emit error events in pipeline stages
- Log errors with context
- Return meaningful error messages

### Performance

- Use pagination for large datasets
- Cache expensive computations
- Optimize database queries
- Monitor Lambda cold starts

### Security

- Never commit secrets
- Use IAM least privilege
- Validate all inputs
- Sanitize user content

## Troubleshooting

### Common Issues

1. **Module not found**:
   ```bash
   pnpm install
   ```

2. **TypeScript errors**:
   ```bash
   pnpm type-check
   ```

3. **CDK deployment fails**:
   - Check AWS credentials
   - Verify region
   - Review CloudFormation logs

4. **Cassette replay fails**:
   - Verify cassette exists
   - Check cassette format
   - Re-record if needed

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [AWS CDK Guide](https://docs.aws.amazon.com/cdk/)
- [Step Functions ASL](https://states-language.net/)
- [OpenAI API Docs](https://platform.openai.com/docs)

