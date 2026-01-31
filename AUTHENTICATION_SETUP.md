# Authentication Setup Guide

This guide will help you set up authentication for the Personal Diary application with both email/password and Google OAuth support.

## Backend Setup

### 1. Install Dependencies

The required packages are already installed:
- `passport` - Authentication middleware
- `passport-local` - Email/password strategy
- `passport-google-oauth20` - Google OAuth strategy
- `express-session` - Session management
- `bcryptjs` - Password hashing
- `cookie-parser` - Cookie parsing

### 2. Database Migration

Update your database schema to include the User model:

```bash
cd apps/backend
pnpm db:push
# or
pnpm db:migrate
```

### 3. Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Backend Environment Variables
PORT=4000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/personal_diary"

# Session Secret (Generate a secure random string)
SESSION_SECRET=your-secret-key-change-this-in-production

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
```

### 4. Google OAuth Setup

To enable Google login:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:4000/api/auth/google/callback` (development)
   - Your production callback URL
6. Copy the Client ID and Client Secret to your `.env` file

### 5. Start the Backend

```bash
cd apps/backend
pnpm dev
```

## Frontend Setup

### 1. Environment Variables

Copy the example environment file:

```bash
cd apps/web
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:4000
```

### 2. Start the Frontend

```bash
cd apps/web
pnpm dev
```

## Using the Application

### Email/Password Authentication

1. Navigate to `http://localhost:3000/signup`
2. Enter your email, password, and optional name
3. Click "Sign up"
4. You'll be automatically logged in and redirected to the dashboard

### Google OAuth Authentication

1. Navigate to `http://localhost:3000/login` or `/signup`
2. Click "Sign in with Google" or "Sign up with Google"
3. You'll be redirected to Google's authentication page
4. After successful authentication, you'll be redirected back to the application

### Logout

Click the "Logout" button in the navigation menu to sign out.

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/signup` - Sign up with email and password
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google` - Initiate Google OAuth flow
- `GET /api/auth/google/callback` - Google OAuth callback

### Protected Endpoints

All other API endpoints (`/api/posts`, `/api/monthly-summaries`, etc.) now require authentication. The session cookie is automatically sent with each request.

## Security Notes

1. **Session Secret**: Use a strong, random string for `SESSION_SECRET` in production
2. **HTTPS**: In production, set `secure: true` for cookies (requires HTTPS)
3. **CORS**: Configure `FRONTEND_URL` to match your production domain
4. **Password Requirements**: Passwords must be at least 6 characters long
5. **Google OAuth**: Keep your Client Secret confidential

## Troubleshooting

### Session/Cookie Issues

If you're having trouble with authentication:

1. Make sure `withCredentials: true` is set in the frontend axios configuration
2. Verify that `FRONTEND_URL` matches your frontend origin exactly
3. Check that cookies are enabled in your browser
4. Clear cookies and try again

### Google OAuth Issues

If Google OAuth isn't working:

1. Verify your redirect URI matches exactly (including trailing slashes)
2. Make sure the Google+ API is enabled
3. Check that your OAuth consent screen is configured
4. Verify Client ID and Secret are correct

### Database Issues

If you get Prisma errors:

1. Make sure your database is running
2. Run `pnpm db:push` to update the schema
3. Check your `DATABASE_URL` is correct

## Database Schema Changes

The User model has been added to the Prisma schema with the following relationships:

- Users have many Posts (one-to-many)
- Users have many Monthly Summaries (one-to-many)
- Posts and Monthly Summaries are cascade deleted when a user is deleted

All existing posts will need to be migrated or will be orphaned. Consider running a migration script to assign existing posts to users.
