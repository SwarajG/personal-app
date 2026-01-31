# Quick Start Guide - Authentication

## Prerequisites
- PostgreSQL database running
- Node.js and pnpm installed
- (Optional) Google OAuth credentials

## Quick Setup (5 minutes)

### 1. Update Database Schema
```bash
cd apps/backend
pnpm db:push
```

### 2. Configure Environment Variables

**Backend** (`apps/backend/.env`):
```env
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/personal_diary"
SESSION_SECRET="change-this-to-a-random-secret-key"

# Optional: For Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/api/auth/google/callback"
```

**Frontend** (`apps/web/.env`):
```env
VITE_API_URL=http://localhost:4000
```

### 3. Start the Application

Open two terminals:

**Terminal 1 - Backend:**
```bash
cd apps/backend
pnpm dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
pnpm dev
```

### 4. Test It Out

1. Open `http://localhost:3000`
2. Click "create a new account"
3. Sign up with email and password
4. You'll be logged in automatically!

## Without Google OAuth

You can use the app immediately with just email/password authentication. Skip the Google OAuth setup if you don't need it.

## With Google OAuth (Optional)

### Get Google Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Add authorized redirect URI: `http://localhost:4000/api/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

## Common Issues

**"Not all code paths return a value" errors:**
- These are TypeScript linting warnings and won't prevent the app from running
- They occur because Express route handlers use early returns

**"Property 'user' does not exist" errors:**
- Restart your IDE's TypeScript server: Cmd+Shift+P → "TypeScript: Restart TS Server"
- The Prisma client types need to be refreshed

**Can't login after creating account:**
- Check that your backend is running on port 4000
- Check that CORS is configured correctly (FRONTEND_URL matches)
- Look at browser console and network tab for errors

**Existing posts don't show up:**
- Old posts don't have a userId
- Either clear old data or assign them to your new user ID:
  ```sql
  UPDATE "Post" SET "userId" = 'your-user-id' WHERE "userId" IS NULL;
  ```

## Security Notes

🔒 **Change the SESSION_SECRET** before deploying to production!

Generate a secure random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Next Steps

- Read [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) for detailed setup
- Read [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for technical details
- Set up Google OAuth for social login
- Configure HTTPS for production
- Set up password reset functionality (future enhancement)

## Support

If you encounter issues:
1. Check the terminal logs for backend errors
2. Check browser console for frontend errors
3. Verify environment variables are set correctly
4. Make sure the database is accessible
