# Personal Diary Backend

Node.js/Express backend API for the Personal Diary application.

## Tech Stack

- Node.js
- Express
- TypeScript
- CORS

## Development

```bash
# Install dependencies (from root)
pnpm install

# Run in development mode with hot reload
pnpm dev

# Or run from root with filter
pnpm --filter @personal-diary/backend dev
```

## Building

```bash
# Build TypeScript to JavaScript
pnpm build

# Run the built version
pnpm start
```

## API Endpoints

### Health Check

```
GET /api/health
```

Returns the API health status.

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
PORT=4000
NODE_ENV=development
```

## Project Structure

```
src/
├── index.ts          # Main application entry point
└── ...               # Add your routes, controllers, models here
```
