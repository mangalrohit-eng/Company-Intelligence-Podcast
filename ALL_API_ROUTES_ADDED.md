# All API Routes and Lambda Functions Added

## Summary
Added all missing Lambda functions and API Gateway routes to complete the backend API.

## New Lambda Functions Added

### 1. **Get Run** (`run-get`)
- **File**: `src/api/runs/get.ts`
- **Route**: `GET /runs/{id}`
- **Purpose**: Get details of a specific pipeline run
- **Permissions**: Read access to `runs` and `podcasts` tables

### 2. **List Runs** (`run-list`)
- **File**: `src/api/runs/list.ts`
- **Route**: `GET /podcasts/{id}/runs`
- **Purpose**: List all runs for a specific podcast
- **Permissions**: Read access to `runs` and `podcasts` tables
- **Query Parameters**: `limit`, `nextToken`

### 3. **Get Run Events** (`run-events`)
- **File**: `src/api/runs/events.ts` (already existed)
- **Route**: `GET /runs/{id}/events`
- **Purpose**: Get events for a run (for live progress tracking)
- **Permissions**: Read access to `run_events` table
- **Query Parameters**: `limit`, `nextToken`

### 4. **Get Podcast** (`podcast-get`)
- **File**: `src/api/podcasts/get.ts`
- **Route**: `GET /podcasts/{id}`
- **Purpose**: Get details of a specific podcast
- **Permissions**: Read access to `podcasts` table

### 5. **Get Episode** (`episode-get`)
- **File**: `src/api/episodes/get.ts` (already existed)
- **Route**: `GET /episodes/{id}`
- **Purpose**: Get details of a specific episode with presigned S3 URLs
- **Permissions**: Read access to `episodes` table and read access to media bucket
- **Returns**: Episode data with presigned URLs for audio, transcript, and show notes

### 6. **List Episodes** (`episode-list`)
- **File**: `src/api/episodes/list.ts`
- **Route**: `GET /podcasts/{id}/episodes`
- **Purpose**: List all episodes for a specific podcast
- **Permissions**: Read access to `episodes` and `podcasts` tables
- **Query Parameters**: `limit`, `nextToken`

## Complete API Routes List

### Podcasts
- ✅ `POST /podcasts` - Create podcast
- ✅ `GET /podcasts` - List podcasts
- ✅ `GET /podcasts/{id}` - Get podcast details (NEW)

### Runs
- ✅ `POST /podcasts/{id}/runs` - Create run
- ✅ `GET /podcasts/{id}/runs` - List runs for podcast (NEW)
- ✅ `GET /runs/{id}` - Get run details (NEW)
- ✅ `GET /runs/{id}/events` - Get run events (NEW)

### Episodes
- ✅ `GET /episodes/{id}` - Get episode details
- ✅ `GET /podcasts/{id}/episodes` - List episodes for podcast (NEW)

### Other
- ✅ `POST /competitors/suggest` - Suggest competitors
- ✅ `POST /voice/preview` - Preview voice

## Environment Variables Fixed

Updated `lambdaEnv` in CDK stack to include aliases for compatibility:
- `RUN_EVENTS_TABLE` → points to `eventsTable.tableName` (for `runs/events.ts`)
- `S3_BUCKET_MEDIA` → points to `mediaBucket.bucketName` (for `episodes/get.ts`)

## Authentication

All routes (except `/competitors/suggest` and `/voice/preview`) require Cognito JWT authentication via the `CognitoAuthorizer`.

## Access Control

All routes verify that the authenticated user has access to the requested resource via `hasOrgAccess()` check, ensuring users can only access podcasts/runs/episodes from their organization.

## Deployment Status

All Lambda functions and API routes have been deployed to AWS. The API Gateway URL is:
```
https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com
```

## Next Steps

The frontend should now be able to:
1. ✅ Create and list podcasts
2. ✅ Create and list runs
3. ✅ View run details and events
4. ✅ View episode details
5. ✅ List episodes for a podcast

All API endpoints are now available and properly secured.

