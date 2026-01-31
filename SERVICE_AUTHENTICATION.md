# Service-to-Service Authentication

This document explains the internal API authentication system between the backend and background services.

## Overview

The background service needs to access backend APIs to fetch posts and save monthly summaries. Since the background worker runs independently without user sessions, we use API key authentication for service-to-service communication.

## How It Works

### Authentication Flow

1. **User-Initiated Requests**: Frontend → Backend (uses session-based authentication)
2. **Service-Initiated Requests**: Background Service → Backend (uses API key authentication)

### Endpoints Supporting Dual Authentication

The following endpoints support both authentication methods:

- `GET /api/posts` - Fetch posts (with optional month/year filtering)
- `POST /api/monthly-summaries` - Save monthly summaries

### Request Headers

**For Background Service:**
```
x-api-key: your-secret-key
```

**For User Requests:**
```
Cookie: connect.sid=session-id
```

## Configuration

### 1. Generate a Strong API Key

Use a cryptographically secure random string:

```bash
# Generate a secure key (on macOS/Linux)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Add to Backend Environment

```env
# apps/backend/.env
INTERNAL_API_KEY=your-strong-random-secret-key-here
```

### 3. Add to Background Service Environment

```env
# apps/background-service/.env
INTERNAL_API_KEY=your-strong-random-secret-key-here
```

**Important**: Both services must use the **exact same key**.

## Security Considerations

1. **Keep Keys Secret**: Never commit `.env` files to version control
2. **Use Strong Keys**: Minimum 32 characters, cryptographically random
3. **Rotate Keys**: Change keys periodically in production
4. **HTTPS Only**: In production, always use HTTPS to prevent key interception
5. **Rate Limiting**: Consider adding rate limiting to internal API endpoints

## API Usage Examples

### Background Service Fetching Posts

```typescript
const response = await axios.get(`${backendUrl}/api/posts`, {
  params: {
    userId: 'user-123',
    month: 1,
    year: 2026,
  },
  headers: {
    'x-api-key': process.env.INTERNAL_API_KEY,
  },
});
```

### Background Service Saving Summary

```typescript
await axios.post(`${backendUrl}/api/monthly-summaries`, {
  userId: 'user-123',
  month: 1,
  year: 2026,
  summary: 'Generated summary...',
  generatedAt: new Date().toISOString(),
}, {
  headers: {
    'x-api-key': process.env.INTERNAL_API_KEY,
  },
});
```

## Troubleshooting

### Error: "Unauthorized - Invalid API key"

- Check that `INTERNAL_API_KEY` is set in both `.env` files
- Verify the keys match exactly (no extra spaces or characters)
- Ensure the background service is loading the `.env` file correctly

### Error: "INTERNAL_API_KEY is not configured"

- The background service can't find the environment variable
- Make sure you're using `dotenv` or similar to load environment variables
- Check that the `.env` file exists in the correct location

## Future Enhancements

Consider implementing:

- JWT-based service tokens with expiration
- Mutual TLS authentication
- Request signing with HMAC
- Service mesh for more complex architectures
