# Background Service

Node.js background service for processing monthly digest jobs.

## Features

- Processes monthly digest jobs from a Redis queue
- Fetches all posts for a specific month and user
- Generates AI-powered monthly summaries using Google Gemini
- Sends summaries to the backend API

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your:
- `BACKEND_API_URL` - Your backend API URL (default: http://localhost:4000)
- `GEMINI_API_KEY` - Your Google Gemini API key
- `REDIS_HOST` and `REDIS_PORT` - Redis connection details

3. Make sure Redis is running:
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally on macOS
brew install redis
brew services start redis
```

## Running

Development mode with hot reload:
```bash
pnpm dev
```

Production mode:
```bash
pnpm build
pnpm start
```

## Usage

The background service listens for jobs on the `monthly-digest` queue. Jobs should include:
- `userId` - The user ID
- `month` - Month number (1-12)
- `year` - Year (e.g., 2026)

To add a job (from your backend):
```typescript
import { addMonthlyDigestJob } from './queue/jobQueue';

await addMonthlyDigestJob({
  userId: 'user123',
  month: 1,
  year: 2026
});
```

## How It Works

1. **Job Reception**: Receives a monthly digest job from the queue
2. **Data Fetching**: Fetches all posts for the specified month and user from the backend API
3. **AI Processing**: Uses Google Gemini to generate a comprehensive monthly summary
4. **Result Delivery**: Sends the generated summary back to the backend API endpoint

## Error Handling

- Jobs are retried up to 3 times on failure
- Exponential backoff between retries (starting at 2 seconds)
- All errors are logged for debugging
