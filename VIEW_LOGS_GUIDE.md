# How to View Server Logs

## Quick Access

### Option 1: AWS Console (Recommended)

1. **Go to CloudWatch Logs:**
   https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups

2. **Click on:** `/ecs/podcast-platform-app`

3. **Click on the latest log stream** (format: `app/app/{task-id}`)

4. **View logs in real-time** - logs update automatically

---

### Option 2: AWS CLI - Real-time (Follow Mode)

**View logs as they come in:**
```powershell
aws logs tail /ecs/podcast-platform-app --region us-east-1 --follow
```

**View specific log stream:**
```powershell
# Get latest stream
$stream = aws logs describe-log-streams `
  --log-group-name /ecs/podcast-platform-app `
  --region us-east-1 `
  --order-by LastEventTime `
  --descending `
  --max-items 1 `
  --query 'logStreams[0].logStreamName' `
  --output text

# Tail that stream
aws logs tail /ecs/podcast-platform-app `
  --log-stream-names $stream `
  --region us-east-1 `
  --follow
```

---

### Option 3: AWS CLI - Recent Logs

**Get last 50 log entries:**
```powershell
aws logs get-log-events `
  --log-group-name /ecs/podcast-platform-app `
  --log-stream-name app/app/{task-id} `
  --region us-east-1 `
  --limit 50 `
  --query 'events[*].message' `
  --output text
```

**Get logs from last 30 minutes:**
```powershell
aws logs tail /ecs/podcast-platform-app `
  --region us-east-1 `
  --since 30m
```

---

### Option 4: Filter Logs

**Search for errors:**
```powershell
aws logs filter-log-events `
  --log-group-name /ecs/podcast-platform-app `
  --region us-east-1 `
  --filter-pattern "error" `
  --start-time $((Get-Date).AddHours(-1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
```

**Search for specific text:**
```powershell
aws logs filter-log-events `
  --log-group-name /ecs/podcast-platform-app `
  --region us-east-1 `
  --filter-pattern "competitor" `
  --start-time $((Get-Date).AddHours(-1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
```

---

## Log Stream Naming

Log streams follow this pattern:
- `app/app/{task-id}`

Where `{task-id}` is the ECS task ID (e.g., `841234c31978445593c525777e45b5c3`)

---

## What You'll See

The logs include:
- ✅ Next.js server startup messages
- ✅ API route requests (`POST /api/competitors/suggest`, etc.)
- ✅ Pipeline execution logs
- ✅ OpenAI API calls
- ✅ DynamoDB operations
- ✅ Errors and warnings

---

## Quick Commands

**Current log stream:**
```powershell
aws logs describe-log-streams `
  --log-group-name /ecs/podcast-platform-app `
  --region us-east-1 `
  --order-by LastEventTime `
  --descending `
  --max-items 1 `
  --query 'logStreams[0].logStreamName' `
  --output text
```

**Tail logs (follow mode):**
```powershell
aws logs tail /ecs/podcast-platform-app --region us-east-1 --follow
```

**Last 20 lines:**
```powershell
aws logs tail /ecs/podcast-platform-app --region us-east-1 --since 10m | Select-Object -Last 20
```

