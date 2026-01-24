# Monthly Digest Background Service Setup

## Overview

The background service processes monthly digest jobs asynchronously. It:
1. Fetches all posts for a given month and user
2. Uses AI to generate a comprehensive monthly summary
3. Stores the summary in the backend database

## Prerequisites

### 1. Install Redis

Redis is required for the job queue system.

**macOS:**
```bash
brew install redis
brew services start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

### 2. Update Database Schema

Run the Prisma migration to add the MonthlySummary model:

```bash
cd apps/backend
pnpm db:push
# or
pnpm db:migrate
```

### 3. Configure Environment Variables

**Backend (.env):**
```env
# Add to apps/backend/.env
REDIS_HOST=localhost
REDIS_PORT=6379
GEMINI_API_KEY=your_gemini_api_key_here
```

**Background Service (.env):**
```bash
cd apps/background-service
cp .env.example .env
```

Edit `apps/background-service/.env`:
```env
BACKEND_API_URL=http://localhost:4000
GEMINI_API_KEY=your_gemini_api_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Running the Services

### Start All Services

From the project root:

```bash
# Terminal 1: Backend
cd apps/backend
pnpm dev

# Terminal 2: Background Service
cd apps/background-service
pnpm dev

# Terminal 3: Frontend
cd apps/web
pnpm dev
```

## Using the Monthly Digest Feature

### Option 1: Via API

Trigger a monthly digest job:

```bash
curl -X POST http://localhost:4000/api/monthly-summaries/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "month": 1,
    "year": 2026
  }'
```

### Option 2: Programmatically

```typescript
import axios from 'axios';

// Trigger digest generation
await axios.post('http://localhost:4000/api/monthly-summaries/trigger', {
  userId: 'user123',
  month: 1,
  year: 2026
});

// Later, retrieve the summary
const response = await axios.get(
  'http://localhost:4000/api/monthly-summaries/user123/2026/1'
);
console.log(response.data.summary);
```

## How It Works

```
┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│   Backend   │──1──▶│Redis Queue  │──2──▶│ Background       │
│   API       │      │             │      │ Service Worker   │
└─────────────┘      └─────────────┘      └──────────────────┘
                                                   │
                                                   │ 3. Fetch Posts
                                                   ▼
                                           ┌──────────────────┐
                                           │   Backend API    │
                                           │   GET /posts     │
                                           └──────────────────┘
                                                   │
                                                   │ 4. Generate Summary
                                                   ▼
                                           ┌──────────────────┐
                                           │  Google Gemini   │
                                           │      AI          │
                                           └──────────────────┘
                                                   │
                                                   │ 5. Save Summary
                                                   ▼
                                           ┌──────────────────┐
                                           │   Backend API    │
                                           │POST /summaries   │
                                           └──────────────────┘
```

## Monitoring

Check background service logs:
```bash
cd apps/background-service
pnpm dev
```

You'll see logs like:
```
🚀 Background Service starting...
✅ Background Service is running
   Waiting for jobs...

📋 Processing job 1
   User ID: user123
   Period: 1/2026
Fetched 15 posts
Generating monthly summary with AI...
Summary generated successfully
Successfully sent monthly summary for 1/2026 to backend
✅ Job 1 completed successfully
```

## Troubleshooting

**Redis connection errors:**
- Verify Redis is running: `redis-cli ping`
- Check REDIS_HOST and REDIS_PORT in .env files

**Job not processing:**
- Ensure both backend and background service are running
- Check Redis queue: `redis-cli KEYS "*monthly-digest*"`

**AI generation fails:**
- Verify GEMINI_API_KEY is set correctly
- Check API quota at https://aistudio.google.com/

## Production Deployment

For production:
1. Use a managed Redis service (AWS ElastiCache, Redis Cloud, etc.)
2. Run background service as a separate process/container
3. Set up monitoring and alerting
4. Consider using PM2 or systemd for process management
5. Implement proper error handling and logging

```bash
# Build for production
cd apps/background-service
pnpm build
pnpm start
```
